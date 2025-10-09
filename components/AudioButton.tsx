'use client'

import { useState } from 'react'

interface AudioButtonProps {
  text: string
  language: string
}

export default function AudioButton({ text, language }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const languageMap: Record<string, string> = {
    'en': 'en-US',
    'pt-BR': 'pt-BR',
    'pt': 'pt-PT',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'ru': 'ru-RU',
    'id': 'id-ID',
  }

  const handlePlay = () => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = languageMap[language] || 'en-US'
      utterance.rate = 0.9
      utterance.pitch = 1.0

      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)

      window.speechSynthesis.speak(utterance)
    } else {
      alert('Text-to-speech not supported in your browser')
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }

  return (
    <button
      onClick={isPlaying ? handleStop : handlePlay}
      className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors"
      title={isPlaying ? 'Stop audio' : 'Play audio'}
    >
      {isPlaying ? '⏸️' : '🔊'}
    </button>
  )
}
