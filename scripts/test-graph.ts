#!/usr/bin/env tsx
/**
 * Test the LangGraph-based RAG agent
 */

import { buildEmbeddingModel } from '../src/utils/embeddings.ts'
import { getChunksStore } from '../src/storage/quadrant.ts'
import { createDocumentSearchGraph } from '../src/agents/document-search-graph.ts'

async function main() {
  console.log('🕸️  Starting LangGraph RAG Agent...\n')

  // Setup
  const embeddingModel = buildEmbeddingModel()
  const chunksStore = await getChunksStore(embeddingModel)

  // Create the graph
  const graph = createDocumentSearchGraph({
    vectorStore: chunksStore,
    embeddingModel,
    topK: 3
  })

  // Test questions
  const questions = [
    'What tours are available in Valencia?',
    'How do I book a tour?',
    'What are the cancellation policies?',
  ]

  for (const question of questions) {
    console.log('═'.repeat(70))
    console.log(`\n❓ Question: ${question}`)
    debugger

    const result = await graph.invoke({
      question,
      conversationHistory: [],
      documents: [],
      needsRetrieval: true,
      needsRefinement: false,
      refinedQuery: '',
      answer: '',
      iterations: 0,
      retrievalCount: 0
    })

    console.log(`\n✅ Answer:\n${result.answer}`)
    console.log(`\n📊 Stats:`)
    console.log(`   - Documents retrieved: ${result.documents.length}`)
    console.log(`   - Iterations: ${result.iterations}`)
    console.log(`   - Retrieval attempts: ${result.retrievalCount}`)
    console.log()
  }

  console.log('═'.repeat(70))
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
