import { QdrantVectorStore } from '@langchain/qdrant'
import { QdrantClient } from '@qdrant/js-client-rest'
import type { Document } from '@langchain/core/documents'
import type { Embeddings } from '@langchain/core/embeddings'

// Collection names
export const CHUNKS_COLLECTION = 'langchain1_chunks'           // For semantic search
export const FULL_DOCS_COLLECTION = 'langchain1_full_docs'     // For full document retrieval
export const DOCS_COLLECTION = 'langchain1_docs'               // Old collection (deprecated)

// Singleton client - reused across all operations
let qdrantClient: QdrantClient | null = null

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    })
  }
  return qdrantClient
}

/**
 * ONE-TIME SETUP: Creates the Qdrant collections
 * Creates both chunks collection (for search) and full docs collection (for retrieval)
 * @param embeddingModel - The model used to convert text to vectors
 */
export async function setupQdrantCollection(embeddingModel: Embeddings) {
  const client = getQdrantClient()

  // Setup chunks collection (for search)
  try {
    await client.getCollection(CHUNKS_COLLECTION)
    console.log(`Collection '${CHUNKS_COLLECTION}' already exists`)
  } catch {
    console.log(`Creating collection '${CHUNKS_COLLECTION}'...`)
    await QdrantVectorStore.fromDocuments(
      [], // Empty initially
      embeddingModel,
      {
        client,
        collectionName: CHUNKS_COLLECTION,
      }
    )
    console.log(`✓ Collection '${CHUNKS_COLLECTION}' created`)
  }

  // Setup full docs collection (for retrieval)
  try {
    await client.getCollection(FULL_DOCS_COLLECTION)
    console.log(`Collection '${FULL_DOCS_COLLECTION}' already exists`)
  } catch {
    console.log(`Creating collection '${FULL_DOCS_COLLECTION}'...`)
    await QdrantVectorStore.fromDocuments(
      [], // Empty initially
      embeddingModel,
      {
        client,
        collectionName: FULL_DOCS_COLLECTION,
      }
    )
    console.log(`✓ Collection '${FULL_DOCS_COLLECTION}' created`)
  }

  // Check for old collection and provide migration notice
  try {
    await client.getCollection(DOCS_COLLECTION)
    console.log(`\n⚠️  Old collection '${DOCS_COLLECTION}' detected`)
    console.log(`   Consider running 'pnpm clear' to remove it`)
  } catch {
    // Old collection doesn't exist, all good
  }
}

/**
 * Get vector store for chunks collection (for searching)
 * Use this for similarity search operations
 * @param embeddingModel - Must be the SAME model used during setup
 */
export async function getChunksStore(embeddingModel: Embeddings) {
  const client = getQdrantClient()

  return await QdrantVectorStore.fromExistingCollection(embeddingModel, {
    client,
    collectionName: CHUNKS_COLLECTION,
  })
}

/**
 * Get vector store for full documents collection (for retrieval)
 * Use this to fetch complete documents by ID
 * @param embeddingModel - Must be the SAME model used during setup
 */
export async function getFullDocsStore(embeddingModel: Embeddings) {
  const client = getQdrantClient()

  return await QdrantVectorStore.fromExistingCollection(embeddingModel, {
    client,
    collectionName: FULL_DOCS_COLLECTION,
  })
}

/**
 * Get vector store for an existing collection (backward compatibility)
 * @deprecated Use getChunksStore() or getFullDocsStore() instead
 * @param embeddingModel - Must be the SAME model used during setup
 */
export async function getQdrantStore(embeddingModel: Embeddings) {
  const client = getQdrantClient()

  return await QdrantVectorStore.fromExistingCollection(embeddingModel, {
    client,
    collectionName: CHUNKS_COLLECTION,
  })
}

/**
 * Add document chunks to the chunks collection (for searching)
 * Stores full chunk text + metadata + vector
 * @param chunks - Document chunks to add (will be converted to vectors)
 * @param embeddingModel - Model to convert text to vectors
 */
export async function addChunks(
  chunks: Document[],
  embeddingModel: Embeddings
) {
  const vectorStore = await getChunksStore(embeddingModel)
  await vectorStore.addDocuments(chunks)
  console.log(`✓ Added ${chunks.length} chunks to Qdrant`)
  return vectorStore
}

/**
 * Add full documents to the full docs collection (for retrieval)
 * @param documents - Full documents to add
 * @param embeddingModel - Model to convert text to vectors
 */
export async function addFullDocuments(
  documents: Document[],
  embeddingModel: Embeddings
) {
  const vectorStore = await getFullDocsStore(embeddingModel)
  await vectorStore.addDocuments(documents)
  console.log(`✓ Added ${documents.length} full documents to Qdrant`)
  return vectorStore
}

/**
 * Add documents to the existing collection (backward compatibility)
 * @deprecated Use addChunks() or addFullDocuments() instead
 * @param documents - Documents to add (will be converted to vectors)
 * @param embeddingModel - Model to convert text to vectors
 */
export async function addDocuments(
  documents: Document[],
  embeddingModel: Embeddings
) {
  const vectorStore = await getQdrantStore(embeddingModel)
  await vectorStore.addDocuments(documents)
  console.log(`✓ Added ${documents.length} documents to Qdrant`)
  return vectorStore
}

/**
 * Clear all documents from both collections
 * Use before re-ingesting to avoid duplicates
 */
export async function clearCollection() {
  const client = getQdrantClient()

  // Clear chunks collection
  try {
    await client.deleteCollection(CHUNKS_COLLECTION)
    console.log(`✓ Cleared collection '${CHUNKS_COLLECTION}'`)
  } catch (error) {
    console.log(`   Collection '${CHUNKS_COLLECTION}' doesn't exist yet`)
  }

  // Clear full docs collection
  try {
    await client.deleteCollection(FULL_DOCS_COLLECTION)
    console.log(`✓ Cleared collection '${FULL_DOCS_COLLECTION}'`)
  } catch (error) {
    console.log(`   Collection '${FULL_DOCS_COLLECTION}' doesn't exist yet`)
  }

  // Clear old collection if it exists
  try {
    await client.deleteCollection(DOCS_COLLECTION)
    console.log(`✓ Cleared old collection '${DOCS_COLLECTION}'`)
  } catch {
    // Old collection doesn't exist, ignore
  }
}

/**
 * Replace all documents in both collections
 * Clears old data and adds new chunks + full documents
 * @param documents - Original full documents
 * @param chunks - Chunked documents for search
 * @param embeddingModel - Model to convert text to vectors
 */
export async function replaceDocuments(
  documents: Document[],
  chunks: Document[],
  embeddingModel: Embeddings
) {
  const client = getQdrantClient()

  // Delete old chunks collection
  try {
    await client.deleteCollection(CHUNKS_COLLECTION)
    console.log(`   Cleared old chunks`)
  } catch {
    // Collection doesn't exist, that's fine
  }

  // Delete old full docs collection
  try {
    await client.deleteCollection(FULL_DOCS_COLLECTION)
    console.log(`   Cleared old full documents`)
  } catch {
    // Collection doesn't exist, that's fine
  }

  // Create new chunks collection with chunks
  const chunksStore = await QdrantVectorStore.fromDocuments(
    chunks,
    embeddingModel,
    {
      client,
      collectionName: CHUNKS_COLLECTION,
    }
  )
  console.log(`✓ Added ${chunks.length} new chunks`)

  // Create new full docs collection with full documents
  const docsStore = await QdrantVectorStore.fromDocuments(
    documents,
    embeddingModel,
    {
      client,
      collectionName: FULL_DOCS_COLLECTION,
    }
  )
  console.log(`✓ Added ${documents.length} new full documents`)

  return { chunksStore, docsStore }
}

/**
 * Fetch full documents by their source paths
 * @param sources - Array of source paths from chunk metadata
 * @param embeddingModel - Model to convert text to vectors
 * @returns Full documents matching the sources
 */
export async function getFullDocumentsByIds(
  sources: string[],
  embeddingModel: Embeddings
): Promise<Document[]> {
  if (sources.length === 0) return []

  const client = getQdrantClient()
  const uniqueSources = [...new Set(sources)]

  console.log(`   🔎 Looking for ${uniqueSources.length} document(s) by source...`)

  // Use Qdrant scroll API to filter by source
  const results: Document[] = []

  for (const source of uniqueSources) {
    try {
      const scrollResult = await client.scroll(FULL_DOCS_COLLECTION, {
        filter: {
          must: [
            {
              key: 'metadata.source',
              match: { value: source }
            }
          ]
        },
        limit: 1,
        with_payload: true,
        with_vector: false, // Don't need vectors for retrieval
      })

      if (scrollResult.points.length > 0) {
        const point = scrollResult.points[0]
        if (point) {
          const payload = point.payload as any
          const docSource = payload?.metadata?.source || 'unknown'
          console.log(`   ✓ Found document: ${docSource.split('/').pop()}`)
          const pageContent = payload.content
          console.log(`      → Content length: ${pageContent.length} chars`)

          results.push({
            pageContent: pageContent,
            metadata: payload.metadata || {},
          })
        }
      } else {
        console.log(`   ⚠️  No document found with source: ${source.split('/').pop()}`)
      }
    } catch (error) {
      console.warn(`   ❌ Failed to fetch document with source ${source}:`, error)
    }
  }

  console.log(`   📦 Retrieved ${results.length} full document(s)`)
  return results
}
