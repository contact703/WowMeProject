'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, audioBlob: Blob) => void
  language: string
}

export default function AudioRecorder({ onTranscriptionComplete, language }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      console.log('🎤 Requesting microphone access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('✅ Microphone access granted')
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log('📦 Audio chunk received:', e.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped')
        
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        
        stream.getTracks().forEach(track => {
          track.stop()
          console.log('🔇 Microphone track stopped')
        })
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        console.log('📦 Audio blob created:', audioBlob.size, 'bytes')
        
        // Transcribe audio using Groq Whisper
        setIsProcessing(true)
        try {
          console.log('🚀 Sending audio to transcription API...')
          
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          
          // Convert language code for Whisper API (pt-BR -> pt, etc)
          const whisperLanguage = language.split('-')[0]
          console.log('🌍 Language:', language, '→', whisperLanguage)
          formData.append('language', whisperLanguage)

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          console.log('📡 API response status:', response.status)

          if (!response.ok) {
            const errorData = await response.json()
            console.error('❌ Transcription failed:', errorData)
            throw new Error(errorData.error || 'Transcription failed')
          }

          const data = await response.json()
          console.log('✅ Transcription successful:', data.text.substring(0, 100))
          
          onTranscriptionComplete(data.text, audioBlob)
          setError(null)
        } catch (error: any) {
          console.error('❌ Transcription error:', error)
          setError(error.message || 'Failed to transcribe audio')
          alert(`Transcription failed: ${error.message}\n\nPlease try again or use text input.`)
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log('🎙️ Recording started')
    } catch (error: any) {
      console.error('❌ Error starting recording:', error)
      setError(error.message || 'Could not access microphone')
      alert(`Could not access microphone: ${error.message}\n\nPlease check permissions and try again.`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏹️ Stopping recording...')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {!isRecording && !isProcessing && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-500 text-white rounded-lg hover:from-red-600 hover:to-red-600 transition-all shadow-lg"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          🎤 Record Audio
        </button>
      )}

      {isRecording && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 bg-red-500/20 px-6 py-3 rounded-lg border border-red-500 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-300 font-mono text-lg">{formatTime(recordingTime)}</span>
          </div>
          
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            ⏹️ Stop Recording
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Processing audio...</span>
          </div>
          <p className="text-sm text-gray-400">This may take a few seconds</p>
        </div>
      )}
    </div>
  )
}

