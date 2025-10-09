'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AudioRecorder from '@/components/AudioRecorder'
import theme from '@/lib/theme'
import { ThoughtIcon, PenIcon, MicIcon, ArrowLeftIcon } from '@/components/Icons'

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
        body: JSON.stringify({ text, language, consent, userId: user.id }),
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
      <div className={theme.classes.page + ' flex items-center justify-center'}>
        <div className="text-center">
          <div className={theme.classes.spinner + ' h-12 w-12 mb-4'}></div>
          <p className="text-gray-400">Loading...</p>
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
              <ThoughtIcon className="text-white" size={20} />
            </div>
            <h1 className={theme.classes.logoText}>WowMe</h1>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white transition text-sm md:text-base flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            <span>Back to Feed</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className={theme.classes.container + ' py-8 md:py-12 max-w-2xl'}>
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Share Your Story</h2>
          <p className="text-gray-400 text-lg">
            Your story will be anonymized, rewritten by AI, and shared with the world in multiple languages.
            Your voice will be transformed to protect your identity.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Selector */}
          <div>
            <label className={theme.classes.label}>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 hover:border-red-600 transition"
              style={{ backgroundColor: '#1a1a1a', borderColor: '#3a3a3a' }}
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

          {/* Consent */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-900 border-gray-700 rounded focus:ring-red-600 mt-1"
                style={{ backgroundColor: '#1a1a1a', borderColor: '#3a3a3a' }}
              />
              <div className="text-sm text-gray-300">
                I consent to my story being anonymized, rewritten by AI, translated to multiple languages, and shared publicly on WowMe. 
                I understand that my original text will never be exposed, and my voice (if recorded) will be transformed to protect my identity. 
                I confirm this is my personal experience and I have the right to share it.
              </div>
            </label>
          </div>

          {/* Input Mode Selector */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                inputMode === 'text'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-red-600'
              }`}
            >
              <PenIcon size={20} />
              <span>Write Text</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('audio')}
              className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                inputMode === 'audio'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-red-600'
              }`}
            >
              <MicIcon size={20} />
              <span>Record Audio</span>
            </button>
          </div>

          {/* Text Input */}
          {inputMode === 'text' ? (
            <div>
              <label className={theme.classes.label}>Your Story</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your feelings, secrets, dreams, or experiences... Be honest and authentic. Your identity is protected."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition resize-none"
                style={{ backgroundColor: '#1a1a1a', borderColor: '#3a3a3a' }}
                rows={10}
                required
              />
              <div className="text-sm text-gray-500 mt-2">{text.length} characters</div>
            </div>
          ) : (
            <div>
              <label className={theme.classes.label}>Record Your Story</label>
              <AudioRecorder
                language={language}
                onTranscriptionComplete={(transcription) => {
                  setText(transcription)
                  setInputMode('text')
                }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !consent || text.trim().length < 10}
            className={`w-full py-4 rounded-lg font-medium text-lg transition ${
              loading || !consent || text.trim().length < 10
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Story'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            <strong>Note:</strong> Your story will be reviewed by moderators before being processed and published. 
            This helps ensure a safe and respectful community.
          </p>
        </form>
      </div>
    </div>
  )
}

