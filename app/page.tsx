'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getTranslation } from '@/lib/translations'
import CommentSection from '@/components/CommentSection'

interface Suggestion {
  id: string
  rewritten_text: string
  audio_url: string | null
  created_at: string
  reaction_count: number
  comment_count: number
  user_reaction: string | null
  target_language: string
}

export default function Home() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [language, setLanguage] = useState('en')
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [selectedStoryCommentCount, setSelectedStoryCommentCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    
    // Check auth status
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    // Load feed
    loadFeed()
  }, [language])

  const loadFeed = async () => {
    try {
      const response = await fetch(`/api/feed?lang=${language}`)
      const data = await response.json()
      
      if (data.success) {
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReaction = async (suggestedId: string, type: string) => {
    if (!user) {
      alert('Please sign in to react')
      return
    }

    try {
      const response = await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedId, type }),
      })

      if (response.ok) {
        loadFeed() // Reload to update counts
      }
    } catch (error) {
      console.error('Error reacting:', error)
    }
  }

  const handleOpenComments = (suggestedId: string, commentCount: number) => {
    if (!user) {
      alert('Please sign in to comment')
      return
    }
    setSelectedStoryId(suggestedId)
    setSelectedStoryCommentCount(commentCount)
    setCommentModalOpen(true)
  }

  const handleCloseComments = () => {
    setCommentModalOpen(false)
    setSelectedStoryId(null)
    loadFeed() // Reload to update comment counts
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Logo - Compacto em mobile */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl md:text-2xl">🌀</span>
            </div>
            <h1 className="text-lg md:text-2xl font-bold hidden sm:block">WowMe</h1>
          </Link>

          {/* Actions - Responsivo */}
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
            {/* Language Selector - Menor em mobile */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm"
            >
              <option value="en">English</option>
              <option value="pt-BR">Português</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
            </select>

            {user ? (
              <>
                {/* Profile - Ícone em mobile, texto em desktop */}
                <Link
                  href="/profile"
                  className="bg-white/10 px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium hover:bg-white/20 transition"
                >
                  <span className="md:hidden">👤</span>
                  <span className="hidden md:inline">👤 Profile</span>
                </Link>
                
                {/* Share Story - Ícone em mobile, texto em desktop */}
                <Link
                  href="/submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium hover:opacity-90 transition"
                >
                  <span className="md:hidden">✨</span>
                  <span className="hidden md:inline">✨ Share Your Story</span>
                </Link>
              </>
            ) : (
              <Link
                href="/auth"
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium hover:opacity-90 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {getTranslation(language, 'hero.title')}
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
          {getTranslation(language, 'hero.subtitle')}
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/submit"
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-lg font-medium text-lg hover:opacity-90 transition"
          >
            {getTranslation(language, 'hero.shareButton')}
          </Link>
          <Link
            href="#feed"
            className="bg-white/10 px-8 py-3 rounded-lg font-medium text-lg hover:bg-white/20 transition"
          >
            {getTranslation(language, 'hero.exploreButton')}
          </Link>
        </div>
      </section>

      {/* Feed Section */}
      <section id="feed" className="container mx-auto px-4 py-12">
        <h3 className="text-3xl font-bold mb-8 text-center">{getTranslation(language, 'feed.title')}</h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">{getTranslation(language, 'feed.loading')}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <p className="text-gray-400 text-lg">{getTranslation(language, 'feed.empty')}</p>
          </div>
        ) : (
          <div className="grid gap-6 max-w-3xl mx-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:border-purple-500/50 transition"
              >
                <p className="text-lg leading-relaxed mb-4">{suggestion.rewritten_text}</p>

                <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                  <button
                    onClick={() => handleReaction(suggestion.id, 'heart')}
                    className={`flex items-center gap-2 hover:text-pink-400 transition ${
                      suggestion.user_reaction === 'heart' ? 'text-pink-400' : ''
                    }`}
                  >
                    <span className="text-xl">❤️</span>
                    <span>{suggestion.reaction_count}</span>
                  </button>

                  <button 
                    onClick={() => handleOpenComments(suggestion.id, suggestion.comment_count)}
                    className="flex items-center gap-2 hover:text-blue-400 transition"
                  >
                    <span className="text-xl">💬</span>
                    <span>{suggestion.comment_count}</span>
                  </button>

                  <button
                    onClick={() => {
                      const utterance = new SpeechSynthesisUtterance(suggestion.rewritten_text)
                      const langMap: Record<string, string> = {
                        'en': 'en-US',
                        'pt-BR': 'pt-BR',
                        'es': 'es-ES',
                        'zh': 'zh-CN'
                      }
                      utterance.lang = langMap[language] || 'en-US'
                      utterance.rate = 0.9
                      window.speechSynthesis.speak(utterance)
                    }}
                    className="flex items-center gap-2 hover:text-purple-400 transition"
                    title="Listen to story"
                  >
                    <span className="text-xl">🔊</span>
                  </button>

                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-base">
                      {suggestion.target_language === 'en' && '🇺🇸'}
                      {suggestion.target_language === 'pt-BR' && '🇧🇷'}
                      {suggestion.target_language === 'pt' && '🇧🇷'}
                      {suggestion.target_language === 'es' && '🇪🇸'}
                      {suggestion.target_language === 'zh' && '🇨🇳'}
                    </span>
                    <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comment Modal */}
      {selectedStoryId && (
        <CommentSection
          suggestedId={selectedStoryId}
          isOpen={commentModalOpen}
          onClose={handleCloseComments}
          initialCount={selectedStoryCommentCount}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="mb-4">
            <strong>Disclaimer:</strong> All stories are anonymized and rewritten by AI. 
            Original content is never exposed. This platform is for emotional support and connection, 
            not professional therapy.
          </p>
          <p className="text-sm">
            © 2025 WowMe. A safe space for human connection.
          </p>
        </div>
      </footer>
    </div>
  )
}
