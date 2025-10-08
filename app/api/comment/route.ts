import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { suggestedId, text } = body

    if (!suggestedId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        suggested_id: suggestedId,
        user_id: user.id,
        text,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error('Error in comment API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const suggestedId = searchParams.get('suggestedId')

    if (!suggestedId) {
      return NextResponse.json(
        { error: 'Missing suggestedId parameter' },
        { status: 400 }
      )
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id(display_name, avatar_url)
      `)
      .eq('suggested_id', suggestedId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comments,
    })
  } catch (error) {
    console.error('Error in comment GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
