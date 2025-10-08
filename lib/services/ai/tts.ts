// Text-to-Speech removed (requires paid API)
// Audio generation is optional and not needed for MVP
export async function generateAudio(
  text: string,
  language: string = 'en'
): Promise<string | null> {
  // Audio generation disabled for free tier
  // Can be enabled later with paid API
  return null
}
