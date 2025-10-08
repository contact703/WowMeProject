import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
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

    // Convert File to Buffer for Groq
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File-like object that Groq expects
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    // Transcribe with Groq Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: language || 'en',
      response_format: 'json',
    })

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
