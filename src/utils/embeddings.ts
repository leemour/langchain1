import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/config/env.js'

/**
 * Creates an OpenAI embedding model that converts text to vectors
 * This model is used for both:
 * 1. Converting documents to embeddings when storing
 * 2. Converting search queries to embeddings when querying
 */
export function buildEmbeddingModel() {
  return new OpenAIEmbeddings({
    apiKey: env.OPENAI_API_KEY,
    model: 'text-embedding-3-small', // 1536 dimensions
  })
}
