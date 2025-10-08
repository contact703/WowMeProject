// Translation Service using Groq (100% free)
const SUPPORTED_LANGUAGES = [
  'en', 'pt', 'pt-BR', 'es', 'zh', 'hi', 'ar', 'bn', 'fr', 'ru', 'ja', 'de', 'ur', 'id'
]

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  // Normalize language code
  const normalizedTarget = targetLanguage.toLowerCase()
  
  if (!SUPPORTED_LANGUAGES.includes(normalizedTarget)) {
    console.warn(`Language ${targetLanguage} not supported, returning original text`)
    return text
  }

  // Use Groq for all translations (free and unlimited)
  try {
    return await translateWithGroq(text, targetLanguage, sourceLanguage)
  } catch (error) {
    console.error('Translation failed:', error)
    return text
  }
}

async function translateWithGroq(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'pt': 'Portuguese',
    'pt-BR': 'Brazilian Portuguese',
    'es': 'Spanish',
    'zh': 'Chinese',
    'hi': 'Hindi',
    'ar': 'Arabic',
    'bn': 'Bengali',
    'fr': 'French',
    'ru': 'Russian',
    'ja': 'Japanese',
    'de': 'German',
    'ur': 'Urdu',
    'id': 'Indonesian',
  }

  const targetLangName = languageNames[targetLanguage] || targetLanguage

  const prompt = `Translate the following text to ${targetLangName}. Only return the translation, nothing else.

Text: ${text}

Translation:`

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
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq translation error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}
