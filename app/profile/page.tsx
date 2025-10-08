'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLanguageFlag, getLanguageName } from '@/lib/flags'

interface Story {
  id: string
  text: string
  language: string
  created_at: string
  status: string
}

interface ReceivedStory {
  id: string
  suggested_story_id: string
  is_read: boolean
  created_at: string
  suggested_story: {
    rewritten_text: string
    target_language: string
    created_at: string
  }
}

interface UserStats {
  total_stories_sent: number
  total_stories_received: number
  total_unread: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<UserStats>({ total_stories_sent: 0, total_stories_received: 0, total_unread: 0 })
  const [myStories, setMyStories] = useState<Story[]>([])
  const [receivedStories, setReceivedStories] = useState<ReceivedStory[]>([])
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    setUser(user)

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setProfile(profileData)

    // Get my stories
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    setMyStories(storiesData || [])

    // Get received stories  
    const { data: receivedData } = await supabase
      .from('user_received_stories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    // Count stats manually
    const approvedCount = (storiesData || []).filter((s: any) => s.status === 'approved').length
    const receivedCount = (receivedData || []).length
    const unreadCount = (receivedData || []).filter((r: any) => !r.is_read).length
    
    setStats({
      total_stories_sent: approvedCount,
      total_stories_received: receivedCount,
      total_unread: unreadCount
    })
    
    // Get suggested stories details
    if (receivedData && receivedData.length > 0) {
      const receivedWithDetails = await Promise.all(
        receivedData.map(async (received: any) => {
          const { data: suggestedStory } = await supabase
            .from('suggested_stories')
            .select('rewritten_text, target_language, created_at')
            .eq('id', received.suggested_story_id)
            .single()
          
          return {
            ...received,
            suggested_story: suggestedStory || { rewritten_text: '', target_language: 'en', created_at: '' }
          }
        })
      )
      setReceivedStories(receivedWithDetails)
    }
    setLoading(false)
  }

  const markAsRead = async (receivedStoryId: string) => {
    const supabase = createClient()
    await supabase
      .from('user_received_stories')
      .update({ is_read: true })
      .eq('id', receivedStoryId)
    
    // Reload
    loadProfile()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-2xl">🌀</span>
            </div>
            <h1 className="text-2xl font-bold">WowMe</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back to Feed
            </Link>
            <Link
              href="/submit"
              className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition"
            >
              ✨ Share Your Story
            </Link>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{profile?.display_name || 'Anonymous User'}</h2>
              <p className="text-gray-400 mb-4">{profile?.bio || 'No bio yet'}</p>
              <div className="flex gap-6">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{stats.total_stories_sent}</div>
                  <div className="text-sm text-gray-400">Stories Sent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-pink-400">{stats.total_stories_received}</div>
                  <div className="text-sm text-gray-400">Stories Received</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.total_unread}</div>
                  <div className="text-sm text-gray-400">Unread</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 px-6 rounded-lg transition ${
              activeTab === 'sent'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            📤 My Stories ({myStories.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 px-6 rounded-lg transition relative ${
              activeTab === 'received'
                ? 'bg-pink-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            📥 Received Stories ({receivedStories.length})
            {stats.total_unread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {stats.total_unread}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'sent' && (
            <>
              {myStories.length === 0 ? (
                <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
                  <p className="text-gray-400 mb-4">You haven't shared any stories yet.</p>
                  <Link
                    href="/submit"
                    className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-lg hover:opacity-90 transition"
                  >
                    Share Your First Story
                  </Link>
                </div>
              ) : (
                myStories.map((story) => (
                  <div key={story.id} className="bg-white/5 border border-white/20 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        story.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : story.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(story.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 line-clamp-3">{story.text}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-lg">{getLanguageFlag(story.language)}</span>
                        <span>{getLanguageName(story.language)}</span>
                      </div>
                      <button
                        onClick={() => {
                          const utterance = new SpeechSynthesisUtterance(story.text)
                          const langMap: Record<string, string> = {
                            'en': 'en-US',
                            'pt-BR': 'pt-BR',
                            'pt': 'pt-BR',
                            'es': 'es-ES',
                            'zh': 'zh-CN',
                            'fr': 'fr-FR',
                            'de': 'de-DE',
                            'ja': 'ja-JP',
                            'ar': 'ar-SA'
                          }
                          utterance.lang = langMap[story.language] || 'en-US'
                          utterance.rate = 0.9
                          window.speechSynthesis.speak(utterance)
                        }}
                        className="text-xl hover:text-purple-400 transition"
                        title="Listen to story"
                      >
                        🔊
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'received' && (
            <>
              {receivedStories.length === 0 ? (
                <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
                  <p className="text-gray-400 mb-4">No stories received yet.</p>
                  <p className="text-sm text-gray-500">
                    When you share your story, you'll receive similar stories from others who had similar experiences.
                  </p>
                </div>
              ) : (
                <>
                  {stats.total_unread > 0 && (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={async () => {
                          const supabase = createClient()
                          await supabase
                            .from('user_received_stories')
                            .update({ is_read: true })
                            .eq('user_id', user.id)
                            .eq('is_read', false)
                          loadProfile()
                        }}
                        className="text-sm text-purple-400 hover:text-purple-300 transition"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                  {receivedStories.map((received) => (
                  <div
                    key={received.id}
                    className={`bg-white/5 border rounded-lg p-6 transition ${
                      received.is_read
                        ? 'border-white/20'
                        : 'border-purple-500/50 bg-purple-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      {!received.is_read && (
                        <span className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-400">
                          New
                        </span>
                      )}
                      <span className="text-sm text-gray-400 ml-auto">
                        {new Date(received.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-4">{received.suggested_story.rewritten_text}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-lg">{getLanguageFlag(received.suggested_story.target_language)}</span>
                        <span>{getLanguageName(received.suggested_story.target_language)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const utterance = new SpeechSynthesisUtterance(received.suggested_story.rewritten_text)
                            const langMap: Record<string, string> = {
                              'en': 'en-US',
                              'pt-BR': 'pt-BR',
                              'pt': 'pt-BR',
                              'es': 'es-ES',
                              'zh': 'zh-CN',
                              'fr': 'fr-FR',
                              'de': 'de-DE',
                              'ja': 'ja-JP',
                              'ar': 'ar-SA'
                            }
                            utterance.lang = langMap[received.suggested_story.target_language] || 'en-US'
                            utterance.rate = 0.9
                            window.speechSynthesis.speak(utterance)
                          }}
                          className="text-xl hover:text-purple-400 transition"
                          title="Listen to story"
                        >
                          🔊
                        </button>
                        {!received.is_read && (
                          <button
                            onClick={() => markAsRead(received.id)}
                            className="text-sm text-purple-400 hover:text-purple-300 transition"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
