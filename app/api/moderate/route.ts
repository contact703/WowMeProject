import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const body = await request.json()
    const { storyId, action } = body

    // Validate input
    if (!storyId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: storyId, action' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Update story status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { data: story, error: updateError } = await supabase
      .from('stories')
      .update({ status: newStatus })
      .eq('id', storyId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating story:', updateError)
      return NextResponse.json(
        { error: 'Failed to moderate story' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      story,
      message: `Story ${action}d successfully`,
    })
  } catch (error) {
    console.error('Error in moderate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching stories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stories,
      count: stories.length,
    })
  } catch (error) {
    console.error('Error in moderate GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
