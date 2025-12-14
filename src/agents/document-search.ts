import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables'
import type { VectorStore } from '@langchain/core/vectorstores'
import type { Document } from '@langchain/core/documents'
import type { Embeddings } from '@langchain/core/embeddings'
import { getFullDocumentsByIds } from '@/storage/quadrant.js'

interface AgentInput {
  question: string
}

interface AgentContext {
  question: string
  context: string
}

/**
 * Creates a RAG agent that:
 * 1. Searches Qdrant chunks for relevant matches
 * 2. Retrieves full documents based on chunk matches
 * 3. Uses them as context for the LLM
 * 4. Generates an answer based only on the context
 */
export function createDocumentSearchAgent(
  vectorStore: VectorStore,
  embeddingModel: Embeddings,
  options: {
    topK?: number
    modelName?: string
    temperature?: number
    useFullDocs?: boolean // If false, uses just chunks (old behavior)
  } = {}
) {
  const {
    topK = 3,
    modelName = 'gpt-4o-mini',
    temperature = 0,
    useFullDocs = true // Default: retrieve full documents
  } = options

  const model = new ChatOpenAI({ model: modelName, temperature })
  const prompt = PromptTemplate.fromTemplate(`
Answer the question using ONLY the context below.
If the answer is not in the context, say "I don't know".

Context:
{context}

Question: {question}
`)

  // RAG Chain: Retrieve → Format → LLM → Parse
  const chain = RunnableSequence.from([
    {
      // Retrieve relevant documents
      context: async (input: AgentInput) => {
        // 1. Search chunks for relevant matches
        const chunks = await vectorStore.similaritySearch(input.question, topK)

        if (!useFullDocs || chunks.length === 0) {
          // Return chunks directly (old behavior)
          return formatDocuments(chunks)
        }

        // 2. Extract unique source paths from chunks
        const sources = chunks
          .map(chunk => chunk.metadata.source as string)
          .filter(Boolean)

        if (sources.length === 0) {
          // No sources found, fall back to chunks
          return formatDocuments(chunks)
        }

        const uniqueSources = [...new Set(sources)]
        console.log(`   📖 Found ${chunks.length} chunks from ${uniqueSources.length} source(s)`)

        // 3. Fetch full documents by source
        const fullDocs = await getFullDocumentsByIds(uniqueSources, embeddingModel)

        console.log(`   📝 Context size: ${fullDocs.map(d => d.pageContent.length).reduce((a, b) => a + b, 0)} chars`)

        // 4. Return full documents or fall back to chunks
        return fullDocs.length > 0
          ? formatDocuments(fullDocs)
          : formatDocuments(chunks)
      },
      // Pass question through
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ])

  return chain
}

/**
 * Format documents into a readable context string
 */
function formatDocuments(docs: Document[]): string {
  return docs
    .map((doc, i) => {
      const source = doc.metadata.source || 'unknown'
      const docId = doc.metadata.id || doc.metadata.documentId || 'no-id'
      return `[Document ${i + 1}] (Source: ${source}, ID: ${docId})\n${doc.pageContent}`
    })
    .join('\n\n---\n\n')
}

/**
 * Standalone function for quick searches
 */
export async function searchAndAnswer(
  vectorStore: VectorStore,
  embeddingModel: Embeddings,
  question: string,
  options?: { topK?: number; modelName?: string; useFullDocs?: boolean }
): Promise<string> {
  const agent = createDocumentSearchAgent(vectorStore, embeddingModel, options)
  return await agent.invoke({ question })
}
