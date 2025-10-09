import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  console.log('🎤 Transcription request received')
  
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string

    if (!audioFile) {
      console.error('❌ No audio file provided')
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    console.log('📝 Audio file details:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      language: language || 'en'
    })

    // Check if GROQ_API_KEY is available
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not configured')
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503 }
      )
    }

    console.log('🔧 Initializing Groq client...')
    
    // Initialize Groq client
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })

    // Convert File to Buffer
    console.log('📦 Converting audio file to buffer...')
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('✅ Buffer created, size:', buffer.length, 'bytes')
    
    // Create a File-like object
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    console.log('🚀 Sending to Groq Whisper API...')
    
    // Transcribe with Groq Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: language || 'en',
      response_format: 'json',
    })

    console.log('✅ Transcription successful!')
    console.log('📄 Transcribed text:', transcription.text.substring(0, 100) + '...')

    return NextResponse.json({
      text: transcription.text,
      success: true,
    })
  } catch (error: any) {
    console.error('❌ Transcription error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    if (error.response) {
      console.error('API response status:', error.response.status)
      console.error('API response data:', error.response.data)
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Transcription failed',
        details: error.response?.data || 'No additional details'
      },
      { status: 500 }
    )
  }
}

