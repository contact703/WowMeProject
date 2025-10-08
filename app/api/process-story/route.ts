import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding, classifyStory } from '@/lib/services/ai/embeddings'
import { rewriteStory } from '@/lib/services/ai/rewrite'
import { translateText } from '@/lib/services/ai/translation'
import { generateAudio } from '@/lib/services/ai/tts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const body = await request.json()
    const { storyId, targetLanguages } = body

    if (!storyId) {
      return NextResponse.json(
        { error: 'Missing required field: storyId' },
        { status: 400 }
      )
    }

    // Fetch the story
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single()

    if (fetchError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      )
    }

    if (story.status !== 'approved') {
      return NextResponse.json(
        { error: 'Story must be approved before processing' },
        { status: 400 }
      )
    }

    // Step 1: Generate embedding and classify
    console.log('Generating embedding and classification...')
    const [embedding, classification] = await Promise.all([
      generateEmbedding(story.text),
      classifyStory(story.text),
    ])

    // Step 2: Save embedding
    const { error: embeddingError } = await supabase
      .from('stories_embeddings')
      .upsert({
        story_id: story.id,
        embedding: embedding,
        archetype: classification.archetype,
        emotion_tone: classification.emotion_tone,
      })

    if (embeddingError) {
      console.error('Error saving embedding:', embeddingError)
    }

    // Step 3: Find similar stories
    console.log('Finding similar stories...')
    const { data: similarStories, error: similarError } = await supabase
      .rpc('match_stories', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      })

    const similarStoryIds = similarStories?.map((s: any) => s.story_id) || []

    // Step 4: Generate suggestions for target languages
    const languages = targetLanguages || ['en', 'pt-BR', 'es']
    const suggestions = []

    for (const targetLang of languages) {
      console.log(`Processing for language: ${targetLang}`)
      
      // Rewrite and translate
      const rewritten = await rewriteStory(story.text, targetLang)
      const translated = await translateText(rewritten, targetLang, story.language)
      
      // Generate audio (optional)
      let audioUrl = null
      try {
        audioUrl = await generateAudio(translated, targetLang)
      } catch (error) {
        console.error('Audio generation failed:', error)
      }

      // Save suggestion for each similar story (or just the main one)
      const similarId = similarStoryIds[0] || story.id
      
      const { data: suggestion, error: suggestionError } = await supabase
        .from('suggested_stories')
        .insert({
          source_story_id: story.id,
          similar_story_id: similarId,
          target_language: targetLang,
          rewritten_text: translated,
          audio_url: audioUrl,
          model_versions: {
            llm: 'llama-3.3-70b-versatile',
            embedding: 'jina-embeddings-v3',
            tts: audioUrl ? 'elevenlabs-multilingual-v2' : null,
          },
        })
        .select()
        .single()

      if (!suggestionError && suggestion) {
        suggestions.push(suggestion)
      }
    }

    return NextResponse.json({
      success: true,
      story,
      classification,
      similarStoriesCount: similarStoryIds.length,
      suggestions,
      message: 'Story processed successfully',
    })
  } catch (error) {
    console.error('Error in process-story API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
