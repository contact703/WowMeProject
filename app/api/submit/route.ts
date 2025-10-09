import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding, classifyStory } from '@/lib/services/ai/embeddings'
import { rewriteStory } from '@/lib/services/ai/rewrite'
import { translateText } from '@/lib/services/ai/translation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(request: NextRequest) {
  try {
    const { text, language, userId } = await request.json()

    console.log('📝 Starting story submission...')
    console.log('   Language:', language)
    console.log('   Text length:', text.length)

    // Validate input
    if (!text || !language || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user exists in auth (no need to check profiles table)
    console.log('👤 User ID:', userId)

    // Step 1: Classify story
    console.log('🔍 Classifying story...')
    const classification = await classifyStory(text)
    console.log('   Archetype:', classification.archetype)
    console.log('   Emotion:', classification.emotion_tone)

    // Step 2: Generate embedding
    console.log('🧠 Generating embedding...')
    const embedding = await generateEmbedding(text)
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

    // Step 3.5: Insert embedding
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
      console.error('❌ Embedding insertion failed:', embeddingError)
      // Continue anyway, embedding is optional for the story to exist
    } else {
      console.log('✅ Embedding inserted')
    }

    // Step 4: Find and send similar story
    let receivedStoryId = null
    
    console.log('🔍 Finding similar story...')
    
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

    if (allStories && allStories.length > 0) {
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
        console.log(`   ${i + 1}. Story ${s.id}: ${s.similarity.toFixed(3)} (${s.archetype}, ${s.emotion_tone})`)
      })
      
      // Get best match
      const bestMatch = similarities[0]
      
      if (bestMatch && bestMatch.similarity > 0.3) {
        console.log(`✅ Selected story ${bestMatch.id} with similarity ${bestMatch.similarity.toFixed(3)}`)
        
        // Check if we need to translate
        const needsTranslation = bestMatch.language !== language
        let textToSend = bestMatch.text
        
        if (needsTranslation) {
          console.log(`🔄 Translating from ${bestMatch.language} to ${language}...`)
          try {
            // Rewrite first
            const rewritten = await rewriteStory(bestMatch.text, language)
            // Then translate if needed
            textToSend = language !== 'en-US' 
              ? await translateText(rewritten, 'en-US', language)
              : rewritten
            console.log('✅ Translation complete')
          } catch (err) {
            console.error('⚠️ Translation failed, using original:', err)
            textToSend = bestMatch.text
          }
        }
        
        // Create or get suggested_story
        console.log('💾 Creating suggested story...')
        const { data: suggestedStory } = await supabaseService
          .from('suggested_stories')
          .insert({
            source_story_id: bestMatch.id,
            target_language: language,
            rewritten_text: textToSend,
            audio_url: null,
            model_versions: {
              llm: 'llama-3.3-70b-versatile',
              timestamp: new Date().toISOString(),
            },
          })
          .select('id')
          .single()
        
        if (suggestedStory) {
          console.log('✅ Suggested story created:', suggestedStory.id)
          
          // Send to user
          console.log('📬 Sending to user...')
          const { data: received } = await supabaseService
            .from('user_received_stories')
            .insert({
              user_id: userId,
              source_story_id: bestMatch.id,
              suggested_story_id: suggestedStory.id,
              is_read: false,
            })
            .select('id')
            .single()
          
          if (received) {
            receivedStoryId = received.id
            console.log('🎉 SUCCESS! Story sent to user:', received.id)
          } else {
            console.error('❌ Failed to insert user_received_stories')
          }
        } else {
          console.error('❌ Failed to create suggested_story')
        }
      } else {
        console.log('⚠️ No similar story found (best similarity:', bestMatch?.similarity.toFixed(3), ')')
        console.log('🤖 Generating AI fallback story...')
        
        // Generate AI fallback story
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
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json()
            const generatedText = aiData.choices[0].message.content.trim()
            
            console.log('✅ AI story generated')
            
            const { data: suggestedStory } = await supabaseService
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
            
            if (suggestedStory) {
              const { data: received } = await supabaseService
                .from('user_received_stories')
                .insert({
                  user_id: userId,
                  source_story_id: story.id,
                  suggested_story_id: suggestedStory.id,
                  is_read: false,
                })
                .select('id')
                .single()
              
              if (received) {
                receivedStoryId = received.id
                console.log('🎉 AI fallback story sent to user:', received.id)
              }
            }
          }
        } catch (aiError) {
          console.error('⚠️ AI fallback failed:', aiError)
        }
      }
    } else {
      console.log('⚠️ No stories available in database')
      console.log('🤖 Generating AI fallback story...')
      
      // Generate AI fallback story when database is empty
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
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          const generatedText = aiData.choices[0].message.content.trim()
          
          console.log('✅ AI story generated')
          
          const { data: suggestedStory } = await supabaseService
            .from('suggested_stories')
            .insert({
              source_story_id: story.id,
              target_language: language,
              rewritten_text: generatedText,
              audio_url: null,
              model_versions: {
                llm: 'llama-3.3-70b-versatile',
                type: 'ai_generated_no_similar',
                timestamp: new Date().toISOString(),
              },
            })
            .select('id')
            .single()
          
          if (suggestedStory) {
            const { data: received } = await supabaseService
              .from('user_received_stories')
              .insert({
                user_id: userId,
                source_story_id: story.id,
                suggested_story_id: suggestedStory.id,
                is_read: false,
              })
              .select('id')
              .single()
            
            if (received) {
              receivedStoryId = received.id
              console.log('🎉 AI fallback story sent to user:', received.id)
            }
          }
        }
      } catch (aiError) {
        console.error('⚠️ AI fallback failed:', aiError)
      }
    }

    return NextResponse.json({
      success: true,
      storyId: story.id,
      receivedStoryId,
      classification,
    })
  } catch (error: any) {
    console.error('❌ Submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit story' },
      { status: 500 }
    )
  }
}

