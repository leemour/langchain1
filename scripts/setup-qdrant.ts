#!/usr/bin/env tsx
/**
 * ONE-TIME SETUP SCRIPT
 * Run this once to initialize the Qdrant collection
 *
 * Usage: pnpm setup:qdrant
 */

import { buildEmbeddingModel } from '../src/utils/embeddings.js'
import { setupQdrantCollection } from '../src/storage/quadrant.js'

async function main() {
  console.log('🚀 Setting up Qdrant collection...')

  const embeddingModel = buildEmbeddingModel()
  await setupQdrantCollection(embeddingModel)

  console.log('✅ Setup complete!')
}

main().catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
