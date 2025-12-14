#!/usr/bin/env tsx
/**
 * Force clear Qdrant collection
 * Deletes the collection completely
 *
 * Usage: pnpm clear
 */

import { QdrantClient } from '@qdrant/js-client-rest'

const COLLECTION_NAME = 'langchain1_docs'
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'

async function main() {
  const client = new QdrantClient({ url: QDRANT_URL })

  console.log('🗑️  Clearing Qdrant Collection\n')
  console.log(`Server: ${QDRANT_URL}`)
  console.log(`Collection: ${COLLECTION_NAME}\n`)

  try {
    await client.deleteCollection(COLLECTION_NAME)
    console.log('✅ Collection deleted successfully!')
    console.log('\nNext steps:')
    console.log('1. pnpm setup:qdrant   # Recreate collection')
    console.log('2. pnpm ingest         # Load documents')
  } catch (error: any) {
    if (error.message?.includes('Not found')) {
      console.log('ℹ️  Collection does not exist (already cleared)')
    } else {
      throw error
    }
  }
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
