import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Use OpenAI directly (API key is already configured in environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    // Convert File to Buffer for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File-like object that OpenAI expects
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
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
