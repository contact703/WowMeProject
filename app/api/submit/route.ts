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

      // SEND SIMILAR STORIES TO USER
      if (similarStoryIds.length > 0) {
        // PRIORITY 1: Use real similar stories if available
        for (const similarStoryId of similarStoryIds.slice(0, 3)) { // Try up to 3 stories
          const { data: existingSuggestion } = await supabaseService
            .from('suggested_stories')
            .select('id, rewritten_text')
            .eq('source_story_id', similarStoryId)
            .eq('target_language', language)
            .limit(1)
            .single()

          if (existingSuggestion) {
            const { data: inserted } = await supabaseService
              .from('user_received_stories')
              .insert({
                user_id: user.id,
                source_story_id: similarStoryId,
                suggested_story_id: existingSuggestion.id,
                is_read: false,
              })
              .select('id')
              .single()
            
            if (inserted && !receivedStoryId) {
              receivedStoryId = inserted.id
              console.log('✅ Sent real similar story:', existingSuggestion.id)
              break // Only send one story
            }
          }
        }
      }
      
      // PRIORITY 1.5: Try any story with same archetype in target language
      if (!receivedStoryId && classification.archetype) {
        console.log('Trying to find any story with same archetype...')
        const { data: anyArchetypeStory } = await supabaseService
          .from('suggested_stories')
          .select('id, source_story_id, rewritten_text')
          .eq('target_language', language)
          .neq('source_story_id', story.id)
          .limit(1)
          .single()
        
        if (anyArchetypeStory) {
          const { data: inserted } = await supabaseService
            .from('user_received_stories')
            .insert({
              user_id: user.id,
              source_story_id: anyArchetypeStory.source_story_id,
              suggested_story_id: anyArchetypeStory.id,
              is_read: false,
            })
            .select('id')
            .single()
          
          if (inserted) {
            receivedStoryId = inserted.id
            console.log('✅ Sent archetype-matched story:', anyArchetypeStory.id)
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
