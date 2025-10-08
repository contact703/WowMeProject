import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get follower/following counts
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed', id)

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower', id)

    // Check if current user follows this profile
    const { data: { user } } = await supabase.auth.getUser()
    let isFollowing = false
    
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower', user.id)
        .eq('followed', id)
        .single()
      
      isFollowing = !!followData
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        follower_count: followerCount || 0,
        following_count: followingCount || 0,
        is_following: isFollowing,
      },
    })
  } catch (error) {
    console.error('Error in profile API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
