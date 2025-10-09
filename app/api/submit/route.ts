import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { moderateContent } from '@/lib/services/ai/moderation'
import { generateEmbedding, classifyStory } from '@/lib/services/ai/embeddings'
import { rewriteStory } from '@/lib/services/ai/rewrite'
import { translateText } from '@/lib/services/ai/translation'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    let receivedStoryId: string | null = null
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { text, language, consent } = body

    // Validate input
    if (!text || !language || !consent) {
      return NextResponse.json(
        { error: 'Missing required fields: text, language, consent' },
        { status: 400 }
      )
    }

    if (!consent) {
      return NextResponse.json(
        { error: 'Consent is required to submit a story' },
        { status: 400 }
      )
    }

    // AI MODERATION - Automatic approval/rejection
    console.log('Running AI moderation...')
    const moderation = await moderateContent(text)
    
    if (!moderation.approved) {
      return NextResponse.json({
        success: false,
        error: 'Content rejected by AI moderation',
        reason: moderation.reason,
        message: 'Your story was automatically reviewed and cannot be published. Please ensure it follows our community guidelines.',
      }, { status: 400 })
    }

    // Insert story as APPROVED (AI already moderated)
    const supabaseService = createServiceClient()
    const { data: story, error: insertError } = await supabaseService
      .from('stories')
      .insert({
        user_id: user.id,
        text,
        language,
        consent,
        status: 'approved', // Auto-approved by AI
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting story:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit story' },
        { status: 500 }
      )
    }

    // AUTOMATIC PROCESSING - No human intervention needed
    console.log('Processing story with AI pipeline...')
    
    try {
      // Generate embedding and classification
      const [embedding, classification] = await Promise.all([
        generateEmbedding(text),
        classifyStory(text),
      ])

      // Save embedding
      await supabaseService
        .from('stories_embeddings')
        .upsert({
          story_id: story.id,
          embedding: embedding,
          archetype: classification.archetype,
          emotion_tone: classification.emotion_tone,
        })

      // Find similar stories - Simple search by archetype and emotion
      const { data: similarEmbeddings } = await supabaseService
        .from('stories_embeddings')
        .select('story_id')
        .eq('archetype', classification.archetype)
        .neq('story_id', story.id)
        .limit(5)

      const similarStoryIds: string[] = similarEmbeddings?.map((e: any) => e.story_id) || []
      console.log(`Found ${similarStoryIds.length} similar stories by archetype`)

      // Generate suggestions for multiple languages
      const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'zh', 'ja', 'ar']
      
      const createdSuggestions = []
      
      for (const targetLang of languages) {
        // Rewrite and translate
        const rewritten = await rewriteStory(text, targetLang)
        const translated = await translateText(rewritten, targetLang, language)
        
        // Save suggestion
        const similarId = similarStoryIds[0] || story.id
        
        const { data: suggestion } = await supabaseService
          .from('suggested_stories')
          .insert({
            source_story_id: story.id,
            similar_story_id: similarId,
            target_language: targetLang,
            rewritten_text: translated,
            audio_url: null, // No audio for now (free tier)
            model_versions: {
              llm: 'llama-3.3-70b-versatile',
              moderation: 'auto-ai',
              timestamp: new Date().toISOString(),
            },
          })
          .select()
          .single()
        
        if (suggestion) {
          createdSuggestions.push(suggestion)
        }
      }

      // SEND SIMILAR STORIES TO USER - IMPROVED ALGORITHM
      console.log('🔍 Finding similar stories using embeddings...')
      
      // Calculate similarity scores for all potential stories
      const { data: allStories } = await supabaseService
        .from('stories')
        .select('id, text, archetype, emotion_tone, embedding')
        .neq('id', story.id)
        .eq('status', 'approved')
        .not('embedding', 'is', null)
        .limit(50) // Get more candidates for better matching
      
      if (allStories && allStories.length > 0 && embedding && embedding.length > 0) {
        // Calculate cosine similarity for each story
        const storiesWithSimilarity = allStories.map(s => {
          const storyEmbedding = s.embedding as number[]
          if (!storyEmbedding || storyEmbedding.length === 0) {
            return { ...s, similarity: 0 }
          }
          
          // Cosine similarity
          let dotProduct = 0
          let normA = 0
          let normB = 0
          for (let i = 0; i < Math.min(embedding.length, storyEmbedding.length); i++) {
            dotProduct += embedding[i] * storyEmbedding[i]
            normA += embedding[i] * embedding[i]
            normB += storyEmbedding[i] * storyEmbedding[i]
          }
          const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
          
          // Boost similarity if same archetype or emotion
          let boostedSimilarity = similarity
          if (s.archetype === classification.archetype) {
            boostedSimilarity += 0.1
          }
          if (s.emotion_tone === classification.emotion_tone) {
            boostedSimilarity += 0.05
          }
          
          return { ...s, similarity: boostedSimilarity }
        })
        
        // Sort by similarity (highest first)
        storiesWithSimilarity.sort((a, b) => b.similarity - a.similarity)
        
        console.log('📊 Top 3 similar stories:', storiesWithSimilarity.slice(0, 3).map(s => ({
          id: s.id,
          similarity: s.similarity.toFixed(3),
          archetype: s.archetype,
          emotion: s.emotion_tone
        })))
        
        // Try to send the most similar story
        for (const similarStory of storiesWithSimilarity.slice(0, 3)) {
          if (similarStory.similarity < 0.5) {
            console.log('⚠️ Similarity too low (<0.5), skipping')
            continue
          }
          
          // Check if translation already exists
          let suggestionToSend = null
          const { data: existingSuggestion } = await supabaseService
            .from('suggested_stories')
            .select('id, rewritten_text')
            .eq('source_story_id', similarStory.id)
            .eq('target_language', language)
            .limit(1)
            .single()

          if (existingSuggestion) {
            suggestionToSend = existingSuggestion
            console.log('📝 Using existing translation')
          } else {
            // Create translation on the fly
            console.log('🔄 Creating new translation for similar story...')
            try {
              const rewritten = await rewriteStory(similarStory.text, language)
              const translated = language !== 'en-US' ? await translateText(rewritten, 'en-US', language) : rewritten
              
              const { data: newSuggestion } = await supabaseService
                .from('suggested_stories')
                .insert({
                  source_story_id: similarStory.id,
                  target_language: language,
                  rewritten_text: translated,
                  audio_url: null,
                  model_versions: {
                    llm: 'llama-3.3-70b-versatile',
                    timestamp: new Date().toISOString(),
                  },
                })
                .select('id, rewritten_text')
                .single()
              
              if (newSuggestion) {
                suggestionToSend = newSuggestion
                console.log('✅ Translation created successfully')
              }
            } catch (translationError) {
              console.error('❌ Translation failed:', translationError)
            }
          }

          if (suggestionToSend) {
            const { data: inserted } = await supabaseService
              .from('user_received_stories')
              .insert({
                user_id: user.id,
                source_story_id: similarStory.id,
                suggested_story_id: suggestionToSend.id,
                is_read: false,
              })
              .select('id')
              .single()
            
            if (inserted) {
              receivedStoryId = inserted.id
              console.log('✅ Sent highly similar story (similarity:', similarStory.similarity.toFixed(3), ')')
              break
            }
          }
        }
      }
      
      // FALLBACK: Try any story with same archetype and emotion
      if (!receivedStoryId && classification.archetype) {
        console.log('🔄 Fallback: Finding story with same archetype and emotion...')
        const { data: matchedStory } = await supabaseService
          .from('stories')
          .select('id')
          .eq('archetype', classification.archetype)
          .eq('emotion_tone', classification.emotion_tone)
          .eq('status', 'approved')
          .neq('id', story.id)
          .limit(1)
          .single()
        
        if (matchedStory) {
          const { data: existingSuggestion } = await supabaseService
            .from('suggested_stories')
            .select('id')
            .eq('source_story_id', matchedStory.id)
            .eq('target_language', language)
            .limit(1)
            .single()
          
          if (existingSuggestion) {
            const { data: inserted } = await supabaseService
              .from('user_received_stories')
              .insert({
                user_id: user.id,
                source_story_id: matchedStory.id,
                suggested_story_id: existingSuggestion.id,
                is_read: false,
              })
              .select('id')
              .single()
            
            if (inserted) {
              receivedStoryId = inserted.id
              console.log('✅ Sent archetype+emotion matched story')
            }
          }
        }
      }
      
      // PRIORITY 2: Generate AI story if no real stories found
      if (!receivedStoryId) {
        console.log('No similar stories found, generating AI story...')
        
        // Generate a similar but different story using AI
        const aiStoryPrompt = `Based on this story theme: "${text.substring(0, 200)}..."

Generate a DIFFERENT but thematically similar anonymous story (200-300 words) that:
1. Shares similar emotions or themes
2. Is completely different in details and situation
3. Could make the reader feel "I'm not alone"
4. Is written in first person
5. Is in ${language} language

Story:`

        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: aiStoryPrompt }],
            temperature: 0.9,
          }),
        })

        const aiData = await aiResponse.json()
        const aiGeneratedStory = aiData.choices[0].message.content

        // Save AI-generated story as a suggested story
        const { data: aiSuggestion } = await supabaseService
          .from('suggested_stories')
          .insert({
            source_story_id: story.id,
            rewritten_text: aiGeneratedStory,
            target_language: language,
            metadata: {
              ai_generated: true,
              generated_at: new Date().toISOString(),
            },
          })
          .select('id')
          .single()

        if (aiSuggestion) {
          const { data: inserted } = await supabaseService
            .from('user_received_stories')
            .insert({
              user_id: user.id,
              source_story_id: story.id,
              suggested_story_id: aiSuggestion.id,
              is_read: false,
            })
            .select('id')
            .single()
          
          if (inserted) {
            receivedStoryId = inserted.id
          }
        }
      }

      console.log('Story processed successfully! ReceivedStoryId:', receivedStoryId)
    } catch (processingError) {
      console.error('Error processing story:', processingError)
      console.error('Error details:', JSON.stringify(processingError, null, 2))
      // Story is still saved, just not processed
      // But we still try to generate AI story as fallback
      try {
        console.log('Attempting fallback AI story generation...')
        const fallbackPrompt = `Generate a short anonymous story (150 words) about guilt and secrets in ${language || 'English'}.`
        
        const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: fallbackPrompt }],
            temperature: 0.9,
            max_tokens: 300,
          }),
        })

        const fallbackData = await fallbackResponse.json()
        const fallbackStory = fallbackData.choices[0].message.content

        const { data: fallbackSuggestion } = await supabaseService
          .from('suggested_stories')
          .insert({
            source_story_id: story.id,
            rewritten_text: fallbackStory,
            target_language: language || 'en',
            metadata: { ai_generated: true, fallback: true },
          })
          .select('id')
          .single()

        if (fallbackSuggestion) {
          const { data: fallbackInserted } = await supabaseService
            .from('user_received_stories')
            .insert({
              user_id: user.id,
              source_story_id: story.id,
              suggested_story_id: fallbackSuggestion.id,
              is_read: false,
            })
            .select('id')
            .single()
          
          if (fallbackInserted) {
            receivedStoryId = fallbackInserted.id
            console.log('Fallback story created successfully!')
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    }

    return NextResponse.json({
      success: true,
      story,
      receivedStoryId,
      message: 'Story approved by AI and published successfully!',
      moderation: {
        approved: true,
        auto_processed: true,
      },
    })
  } catch (error) {
    console.error('Error in submit API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
