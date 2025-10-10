import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifyStory } from '@/lib/services/ai/embeddings'

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

    // Step 2: Insert story
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

    // Step 3: ALWAYS generate AI response story
    console.log('🤖 Generating AI response story...')
    let receivedStoryId = null
    
    try {
      const aiStoryPrompt = `Based on this personal story, write a similar personal story (2-3 sentences) in first person, as if you are someone who experienced something similar. Share your own story, do NOT respond to the person or give advice. Write as "I" and share your personal experience.

Original story: "${text}"

Write your similar story (first person):`

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
      
      console.log('✅ AI story generated:', generatedText.substring(0, 50) + '...')
      
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
            type: 'ai_generated',
            timestamp: new Date().toISOString(),
          },
        })
        .select('id')
        .single()
      
      if (suggestedError || !suggestedStory) {
        console.error('❌ Failed to create suggested_story:', suggestedError)
        throw new Error('Failed to create suggested story')
      }
      
      console.log('✅ Suggested story created:', suggestedStory.id)
      
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
        console.error('❌ Failed to insert user_received_stories:', receivedError)
        throw new Error('Failed to send story to user')
      }
      
      receivedStoryId = received.id
      console.log('🎉 SUCCESS! Story sent to user:', received.id)
      
    } catch (aiError: any) {
      console.error('❌ AI story generation failed:', aiError)
      console.error('   Error details:', aiError.message)
      // Don't throw - story was saved successfully
    }

    return NextResponse.json({
      success: true,
      storyId: story.id,
      receivedStoryId,
      classification,
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

