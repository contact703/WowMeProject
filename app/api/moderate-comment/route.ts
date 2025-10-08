import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text field' },
        { status: 400 }
      )
    }

    // AI moderation using Groq
    const prompt = `You are a content moderator for an anonymous social network where people share personal feelings and experiences.

Analyze this comment and determine if it should be APPROVED or REJECTED.

REJECT if the comment contains:
- Explicit violence, threats, or harassment
- Hate speech, discrimination, or slurs
- Spam, advertising, or promotional content
- Personal attacks or bullying
- Sexual content or explicit language
- Illegal activities or dangerous advice

APPROVE if the comment is:
- Supportive and empathetic
- Sharing personal experiences
- Asking genuine questions
- Offering constructive feedback
- Expressing emotions respectfully

Comment to moderate:
"${text}"

Respond ONLY with a JSON object in this exact format:
{
  "approved": true or false,
  "reason": "brief explanation if rejected",
  "severity": "low" or "medium" or "high"
}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      console.error('Groq moderation API error:', response.statusText)
      // Default to rejecting if AI fails (safer approach)
      return NextResponse.json({
        approved: false,
        reason: 'AI moderation temporarily unavailable. Please try again later.',
        severity: 'medium',
      })
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    // Parse JSON response
    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json({
        approved: false,
        reason: 'Moderation error. Please try again.',
        severity: 'medium',
      })
    }

    return NextResponse.json({
      approved: result.approved,
      reason: result.reason,
      severity: result.severity,
    })
  } catch (error) {
    console.error('Error in comment moderation:', error)
    return NextResponse.json(
      { 
        approved: false,
        reason: 'Moderation error. Please try again.',
        severity: 'medium',
      },
      { status: 500 }
    )
  }
}
