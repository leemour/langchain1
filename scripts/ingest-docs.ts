#!/usr/bin/env tsx
/**
 * DOCUMENT INGESTION SCRIPT
 * Load documents, split them, and store in Qdrant
 *
 * Run when you add new documents to data/docs/
 * Usage: pnpm ingest [--append]
 */

import { loadDocuments } from '../src/utils/loaders.js'
import { splitDocuments } from '../src/utils/splitters.js'
import { buildEmbeddingModel } from '../src/utils/embeddings.js'
import { addChunks, addFullDocuments, replaceDocuments } from '../src/storage/quadrant.js'
import { randomUUID } from 'crypto'

async function main() {
  const appendMode = process.argv.includes('--append')

  console.log('📚 Loading documents from data/docs/...')
  const docs = await loadDocuments()
  console.log(`   Found ${docs.length} documents`)

  if (docs.length === 0) {
    console.log('\n⚠️  No documents found in data/docs/')
    console.log('   Add some .md or .txt files and try again\n')
    process.exit(1)
  }

  // Show loaded files
  console.log('\n   Files loaded:')
  docs.forEach((doc, i) => {
    const source = (doc.metadata as any).source || 'unknown'
    const preview = doc.pageContent.slice(0, 50).replace(/\n/g, ' ')
    console.log(`   ${i + 1}. ${source}`)
    console.log(`      Preview: ${preview}...`)
  })

  console.log('\n✂️  Splitting into chunks...')
  const chunks = await splitDocuments(docs)
  console.log(`   Created ${chunks.length} chunks`)

  // Show chunk distribution
  const chunksBySource = new Map<string, number>()
  chunks.forEach(chunk => {
    const source = (chunk.metadata as any).source || 'unknown'
    chunksBySource.set(source, (chunksBySource.get(source) || 0) + 1)
  })
  console.log('\n   Chunks per file:')
  chunksBySource.forEach((count, source) => {
    console.log(`   - ${source}: ${count} chunks`)
  })

  console.log('\n🔢 Creating embeddings and storing in Qdrant...')
  const embeddingModel = buildEmbeddingModel()

  if (appendMode) {
    console.log('   Mode: APPEND (adding to existing documents)')
    console.log('   - Adding chunks to search collection...')
    await addChunks(chunks, embeddingModel)
    console.log('   - Adding full documents to retrieval collection...')
    await addFullDocuments(docs, embeddingModel)
  } else {
    console.log('   Mode: REPLACE (clearing old documents)')
    await replaceDocuments(docs, chunks, embeddingModel)
  }

  console.log('\n✅ Ingestion complete!')
  console.log(`   - Stored ${chunks.length} chunks for search`)
  console.log(`   - Stored ${docs.length} full documents for retrieval`)
  console.log('   Verify with: pnpm inspect')
  console.log('   Query with: pnpm dev')
}

main().catch((error) => {
  console.error('❌ Ingestion failed:', error)
  console.error('\nStack trace:', error.stack)
  process.exit(1)
})
