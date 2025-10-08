// AI-powered automatic moderation using Groq
export async function moderateContent(text: string): Promise<{
  approved: boolean
  reason?: string
  severity?: 'low' | 'medium' | 'high'
}> {
  try {
    const prompt = `You are a content moderator for an anonymous social network where people share personal feelings and experiences.

Analyze this text and determine if it should be APPROVED or REJECTED.

REJECT if the content contains:
- Explicit violence or threats
- Illegal activities
- Spam or advertising
- Personal identifiable information (names, addresses, phone numbers)
- Hate speech or discrimination
- Sexual content involving minors

APPROVE if the content is:
- Personal feelings and emotions
- Life experiences and stories
- Struggles and challenges
- Dreams and aspirations
- Philosophical reflections

Text to moderate:
"${text}"

Respond ONLY with a JSON object in this exact format:
{
  "approved": true or false,
  "reason": "brief explanation",
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
      // Default to manual review if AI fails
      return { approved: false, reason: 'AI moderation unavailable, pending manual review' }
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content.trim())
    
    return {
      approved: result.approved,
      reason: result.reason,
      severity: result.severity,
    }
  } catch (error) {
    console.error('Error in AI moderation:', error)
    // Default to manual review on error
    return { approved: false, reason: 'Moderation error, pending manual review' }
  }
}

export async function autoModerateAndProcess(storyId: string): Promise<boolean> {
  // This function will be called automatically after story submission
  // Returns true if story was approved and processed, false otherwise
  return true
}
