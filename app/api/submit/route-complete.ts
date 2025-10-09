import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifyStory } from '@/lib/services/ai/embeddings'
import { generateEmbeddingHF, cosineSimilarity } from '@/lib/services/ai/embeddings-hf'
import { rewriteStory } from '@/lib/services/ai/rewrite'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { text, language, userId } = await request.json()

    console.log('📝 Starting story submission...')
    console.log('   Language:', language)
    console.log('   Text length:', text.length)
    console.log('   User ID:', userId)

    // Validate input
    if (!text || !language || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Step 1: Classify story
    console.log('🔍 Classifying story...')
    let classification = { archetype: 'reflection', emotion_tone: 'neutral' }
    try {
      classification = await classifyStory(text)
      console.log('   Archetype:', classification.archetype)
      console.log('   Emotion:', classification.emotion_tone)
    } catch (err) {
      console.error('⚠️ Classification failed, using defaults:', err)
    }

    // Step 2: Generate embedding (local, no API needed!)
    console.log('🧠 Generating embedding...')
    const embedding = await generateEmbeddingHF(text)
    console.log('   Embedding size:', embedding.length)

    // Step 3: Insert story
    console.log('💾 Inserting story...')
    const { data: story, error: storyError } = await supabaseService
      .from('stories')
      .insert({
        user_id: userId,
        text,
        language,
        status: 'approved',
        consent: true,
      })
      .select('id')
      .single()

    if (storyError || !story) {
      console.error('❌ Story insertion failed:', storyError)
      throw new Error('Failed to insert story')
    }

    console.log('✅ Story inserted with ID:', story.id)

    // Step 4: Insert embedding
    if (embedding.some(v => v !== 0)) {
      console.log('💾 Inserting embedding...')
      const { error: embeddingError } = await supabaseService
        .from('stories_embeddings')
        .insert({
          story_id: story.id,
          embedding,
          archetype: classification.archetype,
          emotion_tone: classification.emotion_tone,
        })
      
      if (embeddingError) {
        console.error('⚠️ Embedding insertion failed:', embeddingError)
      } else {
        console.log('✅ Embedding inserted')
      }
    }

    // Step 5: Find similar story or generate AI response
    let receivedStoryId = null
    
    console.log('🔍 Searching for similar stories...')
    
    // Get all approved stories with embeddings (except this one)
    const { data: allStories } = await supabaseService
      .from('stories')
      .select(`
        id,
        text,
        language,
        stories_embeddings (
          embedding,
          archetype,
          emotion_tone
        )
      `)
      .eq('status', 'approved')
      .neq('id', story.id)
      .not('stories_embeddings', 'is', null)

    let foundSimilar = false

    if (allStories && allStories.length > 0 && embedding.some(v => v !== 0)) {
      console.log(`   Found ${allStories.length} potential stories`)
      
      // Calculate similarities
      const similarities = allStories
        .filter(s => s.stories_embeddings && Array.isArray(s.stories_embeddings) && s.stories_embeddings.length > 0 && s.stories_embeddings[0].embedding)
        .map(s => {
          const emb = Array.isArray(s.stories_embeddings) ? s.stories_embeddings[0] : s.stories_embeddings
          return {
            id: s.id,
            text: s.text,
            language: s.language,
            archetype: emb.archetype,
            emotion_tone: emb.emotion_tone,
            embedding: emb.embedding,
            similarity: cosineSimilarity(embedding, emb.embedding)
          }
        })
      
      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity)
      
      console.log('   Top 3 similarities:')
      similarities.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. Story ${s.id}: ${s.similarity.toFixed(3)}`)
      })
      
      // Get best match
      const bestMatch = similarities[0]
      
      if (bestMatch && bestMatch.similarity > 0.3) {
        console.log(`✅ Found similar story ${bestMatch.id} (similarity: ${bestMatch.similarity.toFixed(3)})`)
        foundSimilar = true
        
        try {
          // Rewrite the similar story
          console.log('✍️ Rewriting similar story...')
          const rewrittenText = await rewriteStory(bestMatch.text, language)
          console.log('✅ Story rewritten')
          
          // Create suggested_story
          const { data: suggestedStory, error: suggestedError } = await supabaseService
            .from('suggested_stories')
            .insert({
              source_story_id: bestMatch.id,
              target_language: language,
              rewritten_text: rewrittenText,
              audio_url: null,
              model_versions: {
                llm: 'llama-3.3-70b-versatile',
                type: 'similar_rewritten',
                similarity: bestMatch.similarity,
                timestamp: new Date().toISOString(),
              },
            })
            .select('id')
            .single()
          
          if (suggestedError || !suggestedStory) {
            throw new Error('Failed to create suggested story')
          }
          
          console.log('✅ Suggested story created:', suggestedStory.id)
          
          // Send to user
          const { data: received, error: receivedError } = await supabaseService
            .from('user_received_stories')
            .insert({
              user_id: userId,
              source_story_id: bestMatch.id,
              suggested_story_id: suggestedStory.id,
              is_read: false,
            })
            .select('id')
            .single()
          
          if (receivedError || !received) {
            throw new Error('Failed to send story to user')
          }
          
          receivedStoryId = received.id
          console.log('🎉 Similar story sent to user:', received.id)
          
        } catch (err) {
          console.error('⚠️ Failed to process similar story:', err)
          foundSimilar = false
        }
      } else {
        console.log(`⚠️ Best similarity too low: ${bestMatch?.similarity.toFixed(3) || 'N/A'}`)
      }
    } else {
      console.log('⚠️ No stories in database or embedding is zero')
    }

    // Step 6: If no similar story found, generate AI response
    if (!foundSimilar) {
      console.log('🤖 Generating AI fallback story...')
      
      try {
        const aiStoryPrompt = `Based on this personal story, write a short, empathetic response story (2-3 sentences) that shows understanding and offers hope or perspective. Keep it authentic and supportive.

Original story: "${text}"

Write a response story:`

        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: aiStoryPrompt }],
            temperature: 0.7,
            max_tokens: 200,
          }),
        })
        
        if (!aiResponse.ok) {
          const errorData = await aiResponse.json()
          throw new Error(`GROQ API error: ${JSON.stringify(errorData)}`)
        }
        
        const aiData = await aiResponse.json()
        const generatedText = aiData.choices[0].message.content.trim()
        
        console.log('✅ AI story generated')
        
        // Create suggested_story
        const { data: suggestedStory, error: suggestedError } = await supabaseService
          .from('suggested_stories')
          .insert({
            source_story_id: story.id,
            target_language: language,
            rewritten_text: generatedText,
            audio_url: null,
            model_versions: {
              llm: 'llama-3.3-70b-versatile',
              type: 'ai_generated_fallback',
              timestamp: new Date().toISOString(),
            },
          })
          .select('id')
          .single()
        
        if (suggestedError || !suggestedStory) {
          throw new Error('Failed to create AI suggested story')
        }
        
        console.log('✅ AI suggested story created:', suggestedStory.id)
        
        // Send to user
        const { data: received, error: receivedError } = await supabaseService
          .from('user_received_stories')
          .insert({
            user_id: userId,
            source_story_id: story.id,
            suggested_story_id: suggestedStory.id,
            is_read: false,
          })
          .select('id')
          .single()
        
        if (receivedError || !received) {
          throw new Error('Failed to send AI story to user')
        }
        
        receivedStoryId = received.id
        console.log('🎉 AI fallback story sent to user:', received.id)
        
      } catch (aiError: any) {
        console.error('❌ AI fallback failed:', aiError)
        console.error('   Error details:', aiError.message)
      }
    }

    return NextResponse.json({
      success: true,
      storyId: story.id,
      receivedStoryId,
      classification,
      foundSimilar,
    })
  } catch (error: any) {
    console.error('❌ Submission error:', error)
    console.error('   Stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to submit story' },
      { status: 500 }
    )
  }
}

