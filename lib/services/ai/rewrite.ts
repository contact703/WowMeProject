// LLM Rewriting Service using Groq
export async function rewriteStory(
  originalText: string,
  targetLanguage: string
): Promise<string> {
  const prompt = `You are a compassionate storyteller. Rewrite the following personal story with these guidelines:

1. Maintain the core emotional essence and meaning
2. Use completely different words and sentence structure
3. Write in a warm, non-clinical, empathetic tone
4. Make it feel like a friend sharing their experience
5. Keep it concise but meaningful (2-4 sentences)
6. NEVER expose or quote the original text directly
7. Write in ${targetLanguage}

Original story essence: "${originalText}"

Rewritten story:`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error rewriting story:', error)
    return 'A meaningful human experience was shared here, touching on themes of growth and connection.'
  }
}
