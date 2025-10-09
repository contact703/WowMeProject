'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import theme from '@/lib/theme'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create profile
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          display_name: displayName || email.split('@')[0]
        })

        setMessage('✅ Account created! Signing you in...')
        
        // Auto sign in
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1000)
      }
    } catch (error: any) {
      setMessage('❌ ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      
      const { data, error} = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        setMessage('✅ Welcome back!')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 500)
      }
    } catch (error: any) {
      setMessage('❌ ' + error.message)
    } finally {
      setLoading(false)
    }
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
        </div>
      </header>

      {/* Content */}
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-600 flex items-center justify-center text-4xl shadow-lg shadow-red-600/50">
              💭
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'signin' ? 'Welcome Back' : 'Join WowMe'}
            </h2>
            <p className="text-gray-400">
              {mode === 'signin' 
                ? 'Sign in to share your stories anonymously' 
                : 'Create an account to start sharing'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                mode === 'signin'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-red-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                mode === 'signup'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-red-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className={theme.classes.label}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className={theme.classes.input}
                />
              </div>
            )}

            <div>
              <label className={theme.classes.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={theme.classes.input}
                required
              />
            </div>

            <div>
              <label className={theme.classes.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={theme.classes.input}
                required
                minLength={6}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.startsWith('✅') 
                  ? 'bg-green-900/20 border border-green-700 text-green-400'
                  : 'bg-red-900/20 border border-red-700 text-red-400'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium transition ${
                loading
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
              }`}
            >
              {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-red-500 hover:text-red-400">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-red-500 hover:text-red-400">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

