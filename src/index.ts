import { buildEmbeddingModel } from '@/utils/embeddings.js'
import { getChunksStore } from '@/storage/quadrant.js'
import { createDocumentSearchAgent } from '@/agents/document-search.js'

/**
 * RAG Query Application
 *
 * Prerequisites:
 * 1. Run setup: pnpm setup:qdrant (once)
 * 2. Ingest docs: pnpm ingest (when adding documents)
 * 3. Query: pnpm dev (this file)
 */
async function main() {
  console.log('🚀 Starting RAG Agent...\n')

  // 1. Get vector stores
  const embeddingModel = buildEmbeddingModel()
  const chunksStore = await getChunksStore(embeddingModel)

  // Debug: Check if documents exist
  console.log('🔍 Checking vector stores...')
  const testSearch = await chunksStore.similaritySearch('test', 1)
  console.log(`   Found ${testSearch.length} chunks in store`)

  if (testSearch.length === 0) {
    console.log('\n⚠️  No documents found in Qdrant!')
    console.log('   Please run: pnpm ingest\n')
    process.exit(1)
  }

  console.log('   ✓ Vector stores are ready\n')

  // 2. Create RAG agent (now retrieves full documents)
  const agent = createDocumentSearchAgent(chunksStore, embeddingModel, {
    topK: 3,
    useFullDocs: true  // Retrieve full documents, not just chunks
  })

  // 3. Ask questions about your documents
  const questions = [
    'What are the main topics in the documents?',
    'Summarize the key points',
  ]

  for (const question of questions) {
    console.log(`❓ Question: ${question}`)

    // Debug: Show retrieved chunks
    const retrievedChunks = await chunksStore.similaritySearch(question, 3)
    console.log(`   📄 Retrieved ${retrievedChunks.length} relevant chunks:`)
    retrievedChunks.forEach((chunk, i) => {
      const docId = chunk.metadata.documentId || chunk.metadata.id || 'no-id'
      console.log(`      [${i + 1}] Doc ID: ${docId}`)
      console.log(`          ${chunk.pageContent.slice(0, 80)}...`)
    })
    console.log(`   📖 Fetching full documents for context...\n`)

    const answer = await agent.invoke({ question })
    console.log(`💡 Answer: ${answer}\n`)
  }
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
