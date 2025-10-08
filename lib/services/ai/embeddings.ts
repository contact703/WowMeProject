// Jina AI Embeddings Service
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.JINA_API_KEY || ''}`,
      },
      body: JSON.stringify({
        input: [text],
        model: 'jina-embeddings-v3',
      }),
    })

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    // Fallback: return a zero vector if API fails
    return new Array(384).fill(0)
  }
}

export async function classifyStory(text: string): Promise<{
  archetype: string
  emotion_tone: string
}> {
  // Use LLM to classify the story
  const prompt = `Analyze this personal story and identify:
1. The primary Jungian archetype (Hero, Shadow, Anima/Animus, Self, Persona, Great Mother, Wise Old Man, Trickster, Child)
2. The emotional tone (joyful, melancholic, anxious, peaceful, angry, hopeful, fearful, loving)

Story: "${text}"

Respond in JSON format: {"archetype": "...", "emotion_tone": "..."}`

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
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    return result
  } catch (error) {
    console.error('Error classifying story:', error)
    return {
      archetype: 'Self',
      emotion_tone: 'reflective',
    }
  }
}
