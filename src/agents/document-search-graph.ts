import { StateGraph, START, END, Annotation, MemorySaver } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import type { VectorStore } from '@langchain/core/vectorstores'
import type { Embeddings } from '@langchain/core/embeddings'
import { getFullDocumentsByIds } from '@/storage/quadrant.js'
import type { BaseMessage } from '@langchain/core/messages'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

/**
 * Enhanced state with memory and iteration control
 */
const EnhancedGraphState = Annotation.Root({
  // Input
  question: Annotation<string>,
  conversationHistory: Annotation<BaseMessage[]>({
    reducer: (current, update) => update ?? current,
    default: () => []
  }),

  // Retrieved context
  documents: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => []
  }),

  // Intermediate decisions
  needsRetrieval: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => true
  }),

  needsRefinement: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => false
  }),

  refinedQuery: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => ''
  }),

  // Output
  answer: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => ''
  }),

  // Metadata
  iterations: Annotation<number>({
    reducer: (current, update) => (update ?? 0) + (current ?? 0),
    default: () => 0
  }),

  retrievalCount: Annotation<number>({
    reducer: (current, update) => (update ?? 0) + (current ?? 0),
    default: () => 0
  })
})

type EnhancedGraphStateType = typeof EnhancedGraphState.State

interface EnhancedGraphOptions {
  vectorStore: VectorStore
  embeddingModel: Embeddings
  modelName?: string
  temperature?: number
  topK?: number
  maxIterations?: number
  enableQueryRefinement?: boolean
}

/**
 * Create a LangGraph-based RAG agent with:
 * - Query refinement
 * - Iterative retrieval
 * - Conversation memory
 * - Adaptive routing
 */
export function createDocumentSearchGraph(options: EnhancedGraphOptions) {
  const {
    vectorStore,
    embeddingModel,
    modelName = 'gpt-4o-mini',
    temperature = 0,
    topK = 3,
    maxIterations = 2,
    enableQueryRefinement = false
  } = options

  const llm = new ChatOpenAI({ model: modelName, temperature })

  // Node 1: Analyze query and decide if refinement is needed
  async function analyzeQuery(state: EnhancedGraphStateType): Promise<Partial<EnhancedGraphStateType>> {
    console.log('\n🤔 Analyzing query...')
    let needsRefinement = false
    let needsRetrieval = true

    const query = state.question

    // Simple heuristics for query quality
    const isVague = query.split(' ').length < 3
    const isTooGeneric = /what|how|why|summarize|explain/i.test(query) && query.length < 30

    // Use LLM to check if refinement is needed, else use heuristics. Also decide if retrieval is required.
    if (enableQueryRefinement && state.iterations < 1) {
      // Assess the query with LLM
      const analysisPrompt = `
Given the following user question, answer ONLY with "yes" or "no": Does this question need to be clarified, specified, or improved to help a search system retrieve relevant documents? If the question is clear, answer "no". If vague or too broad, answer "yes".

User question: "${state.question}"
`;
      const analysisResponse = await llm.invoke([new HumanMessage(analysisPrompt)]);
      const needsRefineLLM = typeof analysisResponse.content === "string" && /yes/i.test(analysisResponse.content);

      if (needsRefineLLM) {
        console.log("   → LLM identified query as vague, will refine");
        needsRefinement = true;
        needsRetrieval = false; // Only refine, don't retrieve this round
      } else if (isVague || isTooGeneric) {
        console.log("   → Heuristic: Query seems vague, will refine");
        needsRefinement = true;
        needsRetrieval = false;
      }
    }

    return {
      needsRefinement,
      needsRetrieval
    }
  }

  // Node 2: Refine query using LLM
  async function refineQuery(state: EnhancedGraphStateType): Promise<Partial<EnhancedGraphStateType>> {
    console.log('\n✨ Refining query...')

    const prompt = `Given this user question, generate a more specific search query that would help find relevant documents.

User question: "${state.question}"

Generate a refined search query (just the query, no explanation):`

    const response = await llm.invoke([new HumanMessage(prompt)])
    const refined = (response.content as string).trim()

    console.log(`   → Original: "${state.question}"`)
    console.log(`   → Refined: "${refined}"`)

    return {
      refinedQuery: refined
    }
  }

  // Node 3: Retrieve documents
  async function retrieveDocuments(state: EnhancedGraphStateType): Promise<Partial<EnhancedGraphStateType>> {
    console.log('\n📚 Retrieving documents...')

    const searchQuery = state.refinedQuery || state.question
    console.log(`   → Searching for: "${searchQuery}"`)

    // Search chunks
    const chunks = await vectorStore.similaritySearch(searchQuery, topK)
    console.log(`   → Found ${chunks.length} relevant chunks`)

    if (chunks.length === 0) {
      console.log('   ⚠️  No relevant documents found')
      return {
        documents: [],
        retrievalCount: 1,
        needsRetrieval: false
      }
    }

    // Extract sources
    const sources = chunks
      .map(chunk => chunk.metadata.source as string)
      .filter(Boolean)
    const uniqueSources = [...new Set(sources)]

    console.log(`   → Fetching ${uniqueSources.length} full document(s)...`)

    // Fetch full documents
    const fullDocs = await getFullDocumentsByIds(uniqueSources, embeddingModel)

    const docContents = fullDocs.map((doc, i) => {
      const source = doc.metadata.source || 'unknown'
      return `[Document ${i + 1}] (Source: ${source})\n${doc.pageContent}`
    })

    console.log(`   ✓ Retrieved ${docContents.length} full document(s)`)

    return {
      documents: docContents,
      retrievalCount: 1,
      needsRetrieval: false
    }
  }

  // Node 4: Generate answer
  async function generateAnswer(state: EnhancedGraphStateType): Promise<Partial<EnhancedGraphStateType>> {
    console.log('\n💭 Generating answer...')

    // Build context from documents
    const context = state.documents.length > 0
      ? state.documents.join('\n\n---\n\n')
      : 'No documents found.'

    console.log(`   → Context size: ${context.length} chars`)
    console.log(`   → Using ${state.documents.length} document(s)`)

    // Build messages with conversation history
    const systemPrompt = new SystemMessage(
      `You are a helpful assistant that answers questions based on the provided context.

Rules:
- Answer ONLY using information from the context below
- If the answer is not in the context, say "I don't have enough information to answer that question."
- Be concise but complete
- Use bullet points for lists
- Cite document sources when possible

Context:
${context}`
    )

    const messages: BaseMessage[] = [
      systemPrompt,
      ...state.conversationHistory,
      new HumanMessage(state.question)
    ]

    // Generate response
    const response = await llm.invoke(messages)
    const answer = response.content as string

    console.log(`   ✓ Answer generated (${answer.length} chars)`)

    // Check if answer indicates missing information
    const needsMoreInfo = /don't have|not enough information|cannot find/i.test(answer)

    return {
      answer,
      conversationHistory: [
        ...state.conversationHistory,
        new HumanMessage(state.question),
        new AIMessage(answer)
      ],
      iterations: 1,
      needsRetrieval: needsMoreInfo && state.retrievalCount < maxIterations
    }
  }

  // Routing functions
  function routeAfterAnalysis(state: EnhancedGraphStateType): string {
    if (state.needsRefinement) {
      return 'refine'
    }
    return 'retrieve'
  }

  function routeAfterRetrieval(state: EnhancedGraphStateType): string {
    return 'generate'
  }

  function routeAfterGenerate(state: EnhancedGraphStateType): string {
    // Could re-retrieve if answer is insufficient and under iteration limit
    if (state.needsRetrieval && state.retrievalCount < maxIterations) {
      console.log('   → Answer insufficient, will re-retrieve')
      return 'retrieve'
    }
    return 'end'
  }

  // Build the graph
  const workflow = new StateGraph(EnhancedGraphState)
    .addNode('analyze', analyzeQuery)
    .addNode('refine', refineQuery)
    .addNode('retrieve', retrieveDocuments)
    .addNode('generate', generateAnswer)
    .addEdge(START, 'analyze')
    .addConditionalEdges('analyze', routeAfterAnalysis, {
      refine: 'refine',
      retrieve: 'retrieve'
    })
    .addEdge('refine', 'retrieve')
    .addConditionalEdges('retrieve', routeAfterRetrieval, {
      generate: 'generate'
    })
    .addConditionalEdges('generate', routeAfterGenerate, {
      retrieve: 'retrieve',
      end: END
    })

  const checkpointer = new MemorySaver()
  return workflow.compile({ checkpointer })
}

/**
 * Simple wrapper for single question answering
 */
export async function searchAndAnswerWithAdvancedGraph(
  vectorStore: VectorStore,
  embeddingModel: Embeddings,
  question: string,
  options?: {
    modelName?: string
    temperature?: number
    topK?: number
    enableQueryRefinement?: boolean
    conversationHistory?: BaseMessage[]
  }
): Promise<{ answer: string; documents: string[] }> {
  const graph = createDocumentSearchGraph({
    vectorStore,
    embeddingModel,
    ...options
  })

  const result = await graph.invoke({
    question,
    conversationHistory: options?.conversationHistory || [],
    documents: [],
    needsRetrieval: true,
    needsRefinement: false,
    refinedQuery: '',
    answer: '',
    iterations: 0,
    retrievalCount: 0
  })

  return {
    answer: result.answer,
    documents: result.documents
  }
}
