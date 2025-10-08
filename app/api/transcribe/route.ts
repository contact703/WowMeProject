import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    console.log('Transcribing audio:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      language: language || 'en'
    })

    // Check if GROQ_API_KEY is available
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured')
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 503 }
      )
    }

    // Initialize Groq client
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File-like object
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    // Transcribe with Groq Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: language || 'en',
      response_format: 'json',
    })

    console.log('Transcription successful:', transcription.text.substring(0, 100))

    return NextResponse.json({
      text: transcription.text,
      success: true,
    })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}

