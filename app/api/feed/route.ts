import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'en'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Fetch ALL suggested stories (we'll translate them dynamically)
    // Get unique stories first
    const { data: suggestions, error } = await supabase
      .from('suggested_stories')
      .select(`
        *,
        reactions:reactions(count),
        comments:comments(count)
      `)
      .eq('target_language', 'en') // Get English versions as base
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching feed:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    // Get user's reactions if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    let userReactions: Record<string, string> = {}
    if (user) {
      const suggestionIds = suggestions.map(s => s.id)
      const { data: reactions } = await supabase
        .from('reactions')
        .select('suggested_id, type')
        .eq('user_id', user.id)
        .in('suggested_id', suggestionIds)
      
      if (reactions) {
        userReactions = reactions.reduce((acc, r) => {
          acc[r.suggested_id] = r.type
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Translate stories if needed
    const formattedSuggestions = await Promise.all(suggestions.map(async (s) => {
      let translatedText = s.rewritten_text
      
      // If requested language is different from English, translate
      if (lang !== 'en') {
        try {
          const translateResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{
                role: 'user',
                content: `Translate this text to ${lang === 'pt-BR' ? 'Brazilian Portuguese' : lang === 'es' ? 'Spanish' : lang === 'zh' ? 'Chinese' : lang}. Only return the translation:\n\n${s.rewritten_text}`
              }],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          })
          
          if (translateResponse.ok) {
            const data = await translateResponse.json()
            translatedText = data.choices[0].message.content.trim()
          }
        } catch (error) {
          console.error('Translation error:', error)
        }
      }
      
      return {
        ...s,
        rewritten_text: translatedText,
        reaction_count: s.reactions?.[0]?.count || 0,
        comment_count: s.comments?.[0]?.count || 0,
        user_reaction: userReactions[s.id] || null,
      }
    }))

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      page,
      limit,
      hasMore: suggestions.length === limit,
    })
  } catch (error) {
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
