'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Story {
  id: string
  text: string
  language: string
  status: string
  created_at: string
}

export default function ModeratePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
        loadStories()
      }
    })
  }, [router])

  const loadStories = async () => {
    try {
      const response = await fetch('/api/moderate?status=pending')
      const data = await response.json()
      
      if (data.success) {
        setStories(data.stories)
      }
    } catch (error) {
      console.error('Error loading stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async (storyId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, action }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Story ${action}d successfully!`)
        loadStories()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error moderating story:', error)
      alert('Failed to moderate story')
    }
  }

  const handleProcess = async (storyId: string) => {
    setProcessing(storyId)

    try {
      const response = await fetch('/api/process-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          targetLanguages: ['en', 'pt-BR', 'es', 'fr', 'de'],
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Story processed successfully! Created ${data.suggestions.length} suggestions.`)
        loadStories()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error processing story:', error)
      alert('Failed to process story')
    } finally {
      setProcessing(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p>Loading...</p>
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
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Feed
          </Link>
        </div>
      </header>

      {/* Moderation Panel */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Moderation Panel
        </h2>
        <p className="text-gray-300 mb-8">
          Review pending stories and approve or reject them. Approved stories can then be processed through the AI pipeline.
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <p className="text-gray-400 text-lg">No pending stories to moderate.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-block bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                      {story.language}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      {new Date(story.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                    {story.status}
                  </span>
                </div>

                <p className="text-lg leading-relaxed mb-6 whitespace-pre-wrap">
                  {story.text}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleModerate(story.id, 'approve')}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-6 py-2 rounded-lg font-medium transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleModerate(story.id, 'reject')}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-2 rounded-lg font-medium transition"
                  >
                    ✗ Reject
                  </button>
                  {story.status === 'approved' && (
                    <button
                      onClick={() => handleProcess(story.id)}
                      disabled={processing === story.id}
                      className="ml-auto bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                    >
                      {processing === story.id ? 'Processing...' : '⚡ Process with AI'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
