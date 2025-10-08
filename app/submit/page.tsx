'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AudioRecorder from '@/components/AudioRecorder'

export default function SubmitPage() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('en')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'audio'>('text')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!consent) {
      alert('Please agree to the consent terms')
      return
    }

    if (text.trim().length < 10) {
      alert('Please write at least 10 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, consent }),
      })

      const data = await response.json()

      if (data.success) {
        alert('✨ Story submitted successfully! Check out a similar story from someone else...')
        setText('')
        setConsent(false)
        
        // Redirect to received story page if available
        if (data.receivedStoryId) {
          router.push(`/received/${data.receivedStoryId}`)
        } else {
          router.push('/profile')
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error submitting story:', error)
      alert('Failed to submit story')
    } finally {
      setLoading(false)
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

      {/* Submit Form */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Share Your Story
        </h2>
        <p className="text-gray-300 mb-8">
          Your story will be anonymized, rewritten by AI, and shared with the world in multiple languages. 
          Your voice will be transformed to protect your identity.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="language" className="block text-sm font-medium mb-2">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            >
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          {/* Consent First */}
          <div className="bg-white/5 border border-white/20 rounded-lg p-6 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                required
              />
              <div className="text-sm text-gray-300">
                <p className="font-medium mb-2">I consent to:</p>
                <ul className="space-y-1 text-gray-400">
                  <li>• My story being anonymized and rewritten by AI</li>
                  <li>• My voice being transformed (if using audio)</li>
                  <li>• My story being translated to multiple languages</li>
                  <li>• My story being shared anonymously with the community</li>
                </ul>
              </div>
            </label>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              disabled={!consent}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                inputMode === 'text'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              } ${!consent ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ✍️ Write Text
            </button>
            <button
              type="button"
              onClick={() => setInputMode('audio')}
              disabled={!consent}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                inputMode === 'audio'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              } ${!consent ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              🎤 Record Audio
            </button>
          </div>

          <div>
            <label htmlFor="text" className="block text-sm font-medium mb-2">
              Your Story
            </label>
            
            {inputMode === 'text' ? (
              <>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your feelings, secrets, dreams, or experiences... Be honest and authentic. Your identity is protected."
                  rows={10}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  required
                />
                <p className="text-sm text-gray-400 mt-2">
                  {text.length} characters
                </p>
              </>
            ) : (
              <div className="bg-white/10 border border-white/20 rounded-lg p-8">
                <AudioRecorder
                  language={language}
                  onTranscriptionComplete={(transcribedText, blob) => {
                    setText(transcribedText)
                    setAudioBlob(blob)
                    setInputMode('text')
                  }}
                />
                <p className="text-sm text-gray-400 mt-4 text-center">
                  Click to record your story. It will be transcribed automatically.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/20 rounded-lg p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/20"
                required
              />
              <span className="text-sm text-gray-300">
                I consent to my story being anonymized, rewritten by AI, translated to multiple languages, 
                and shared publicly on WowMe. I understand that my original text will never be exposed, 
                and my voice (if recorded) will be transformed to protect my identity. I confirm this is 
                my personal experience and I have the right to share it.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !consent}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-lg font-medium text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Story'}
          </button>
        </form>

        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-200">
            <strong>Note:</strong> Your story will be reviewed by moderators before being processed and published. 
            This helps ensure a safe and respectful community.
          </p>
        </div>
      </div>
    </div>
  )
}
