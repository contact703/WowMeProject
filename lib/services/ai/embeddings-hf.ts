// Local Embeddings using Transformers.js (No API needed!)
// Uses Xenova/all-MiniLM-L6-v2 (384 dimensions)

import { pipeline } from '@xenova/transformers'

let extractor: any = null

async function getExtractor() {
  if (!extractor) {
    console.log('🔧 Loading embedding model...')
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    console.log('✅ Embedding model loaded')
  }
  return extractor
}

export async function generateEmbeddingHF(text: string): Promise<number[]> {
  try {
    const model = await getExtractor()
    const output = await model(text, { pooling: 'mean', normalize: true })
    
    // Convert tensor to array
    const embedding = Array.from(output.data)
    
    console.log('✅ Local embedding generated, size:', embedding.length)
    return embedding
  } catch (error) {
    console.error('❌ Local embedding failed:', error)
    // Return zero vector as fallback
    return new Array(384).fill(0)
  }
}

// Cosine similarity function
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  if (normA === 0 || normB === 0) return 0
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

