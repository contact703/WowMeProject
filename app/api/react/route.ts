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
    const { suggestedId, type } = body

    if (!suggestedId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('suggested_id', suggestedId)
      .eq('user_id', user.id)
      .eq('type', type)
      .single()

    if (existing) {
      // Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
      })
    } else {
      // Add reaction
      const { data: reaction, error: insertError } = await supabase
        .from('reactions')
        .insert({
          suggested_id: suggestedId,
          user_id: user.id,
          type,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        reaction,
      })
    }
  } catch (error) {
    console.error('Error in react API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
