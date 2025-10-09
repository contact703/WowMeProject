'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLanguageFlag, getLanguageName } from '@/lib/flags'
import theme from '@/lib/theme'

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
    
    // Calculate stats
    const totalSent = storiesData?.length || 0
    const totalReceived = receivedData?.length || 0
    const totalUnread = receivedData?.filter(r => !r.is_read).length || 0
    setStats({ total_stories_sent: totalSent, total_stories_received: totalReceived, total_unread: totalUnread })

    // Get suggested stories details for received stories
    if (receivedData && receivedData.length > 0) {
      const receivedWithDetails = await Promise.all(
        receivedData.map(async (received) => {
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
      <div className={theme.classes.page + ' flex items-center justify-center'}>
        <div className="text-center">
          <div className={theme.classes.spinner + ' h-12 w-12 mb-4'}></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={theme.classes.page}>
      {/* Header */}
      <header className={theme.classes.header}>
        <div className={theme.classes.headerInner}>
          <Link href="/" className={theme.classes.logo}>
            <div className={theme.classes.logoIcon}>
              <span className="text-xl md:text-2xl">💭</span>
            </div>
            <h1 className={theme.classes.logoText}>WowMe</h1>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition text-sm md:text-base">
              ← Back
            </Link>
            <Link
              href="/submit"
              className={theme.classes.buttonPrimary + ' text-sm md:text-base'}
            >
              ✨ Share Story
            </Link>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className={theme.classes.container + ' py-8 md:py-12 max-w-4xl'}>
        {/* Profile Header */}
        <div className={theme.classes.card + ' mb-8'}>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-600 flex items-center justify-center text-3xl md:text-4xl shadow-lg shadow-red-600/50 flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{profile?.display_name || 'Anonymous User'}</h2>
              <p className="text-gray-400 mb-6">{profile?.bio || 'No bio yet'}</p>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-bold text-red-500">{stats.total_stories_sent}</div>
                  <div className="text-xs md:text-sm text-gray-400">Sent</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-bold text-red-500">{stats.total_stories_received}</div>
                  <div className="text-xs md:text-sm text-gray-400">Received</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xl md:text-2xl font-bold text-red-500">{stats.total_unread}</div>
                  <div className="text-xs md:text-sm text-gray-400">Unread</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={theme.classes.tabList}>
          <button
            onClick={() => setActiveTab('sent')}
            className={`${theme.classes.tabButton} ${activeTab === 'sent' ? theme.classes.tabActive : theme.classes.tabInactive}`}
          >
            My Stories ({myStories.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`${theme.classes.tabButton} ${activeTab === 'received' ? theme.classes.tabActive : theme.classes.tabInactive}`}
          >
            Received Stories ({receivedStories.length})
            {stats.total_unread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">{stats.total_unread}</span>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'sent' ? (
          <div className="space-y-4">
            {myStories.length === 0 ? (
              <div className={theme.classes.empty}>
                <p className={theme.classes.emptyText}>No stories sent yet</p>
                <Link href="/submit" className={theme.classes.buttonPrimary + ' inline-block mt-4'}>
                  Share Your First Story
                </Link>
              </div>
            ) : (
              myStories.map((story) => (
                <div key={story.id} className={theme.classes.card}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getLanguageFlag(story.language)}</span>
                    <span className={`${theme.classes.badge} ${
                      story.status === 'approved' ? theme.classes.badgeSuccess :
                      story.status === 'rejected' ? theme.classes.badgeDanger :
                      theme.classes.badgeWarning
                    }`}>
                      {story.status}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-3 line-clamp-3">{story.text}</p>
                  <div className="text-sm text-gray-500">
                    {new Date(story.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {receivedStories.length === 0 ? (
              <div className={theme.classes.empty}>
                <p className={theme.classes.emptyText}>No stories received yet</p>
                <p className="text-sm text-gray-500 mt-2">Share your story to receive similar stories from others!</p>
              </div>
            ) : (
              receivedStories.map((received) => (
                <div key={received.id} className={theme.classes.card}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{getLanguageFlag(received.suggested_story.target_language)}</span>
                    {!received.is_read && (
                      <span className={theme.classes.badge + ' ' + theme.classes.badgePrimary}>New</span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-4">{received.suggested_story.rewritten_text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          const utterance = new SpeechSynthesisUtterance(received.suggested_story.rewritten_text)
                          const langMap: { [key: string]: string } = {
                            'en': 'en-US',
                            'pt-BR': 'pt-BR',
                            'pt': 'pt-BR',
                            'es': 'es-ES',
                            'zh': 'zh-CN'
                          }
                          utterance.lang = langMap[received.suggested_story.target_language] || 'en-US'
                          utterance.rate = 0.9
                          window.speechSynthesis.speak(utterance)
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition"
                        title="Listen to story"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      </button>
                      <div className="text-sm text-gray-500">
                        {new Date(received.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {!received.is_read && (
                      <button
                        onClick={() => markAsRead(received.id)}
                        className="text-sm text-red-500 hover:text-red-400 transition"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

