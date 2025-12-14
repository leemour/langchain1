# LangGraph RAG Architecture

## Overview

This project now has **three agent implementations**:

1. **Simple Chain** (`document-search.ts`) - Linear RAG pipeline
2. **Basic Graph** (`document-search-graph.ts`) - Graph-based with routing
3. **Advanced Graph** (`document-search-graph-advanced.ts`) - Full-featured with memory

## 🕸️ Graph Architecture

### Basic Graph Flow

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌─────────────┐
│   Analyze   │  ← Decide if retrieval needed
│   Query     │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│   Retrieve   │  ← Search chunks → Fetch full docs
│  Documents   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Generate   │  ← LLM creates answer
│    Answer    │
└──────┬───────┘
       │
       ▼
   ┌───────┐
   │  END  │
   └───────┘
```

### Advanced Graph Flow

```
                ┌─────────┐
                │  START  │
                └────┬────┘
                     │
                     ▼
              ┌──────────────┐
              │   Analyze    │
              │    Query     │
              └──────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Is vague?                Clear?
         │                       │
         ▼                       ▼
  ┌─────────────┐         ┌──────────────┐
  │   Refine    │────────▶│   Retrieve   │
  │    Query    │         │  Documents   │
  └─────────────┘         └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │   Generate   │
                          │    Answer    │
                          └──────┬───────┘
                                 │
                     ┌───────────┴────────────┐
                     │                        │
              Needs more info?              Done?
                     │                        │
                     ▼                        ▼
              ┌──────────────┐          ┌────────┐
              │   Retrieve   │          │  END   │
              │    (again)   │          └────────┘
              └──────────────┘
                     │
                     └─────▶ (loop back to Generate)
```

## Features Comparison

| Feature | Simple Chain | Basic Graph | Advanced Graph |
|---------|-------------|-------------|----------------|
| RAG Retrieval | ✅ | ✅ | ✅ |
| Full Doc Fetching | ✅ | ✅ | ✅ |
| State Management | ❌ | ✅ | ✅ |
| Conditional Routing | ❌ | ✅ | ✅ |
| Query Refinement | ❌ | ❌ | ✅ |
| Iterative Retrieval | ❌ | ❌ | ✅ |
| Conversation Memory | ❌ | ❌ | ✅ |
| Checkpointing | ❌ | ❌ | ✅ |

## Node Descriptions

### 1. Analyze Query
**Purpose:** Determine if the query needs refinement or can proceed directly to retrieval.

**Logic:**
- Check query length and complexity
- Detect vague terms ("what", "how" with < 30 chars)
- Route to refinement or retrieval

**Output:** `needsRefinement`, `needsRetrieval` flags

### 2. Refine Query (Advanced Only)
**Purpose:** Use LLM to improve vague queries for better retrieval.

**Example:**
```
Input:  "What tours?"
Output: "What guided tours and excursions are available in Valencia, Spain?"
```

**Benefits:**
- Better vector search results
- More specific document matching
- Improved answer quality

### 3. Retrieve Documents
**Purpose:** Search chunks and fetch full documents.

**Process:**
1. Search chunks collection (vector similarity)
2. Extract unique source paths
3. Fetch full documents from docs collection
4. Format as context strings

**Output:** `documents[]` with full content

### 4. Generate Answer
**Purpose:** Use LLM to create answer from context.

**Features:**
- Builds system prompt with context
- Includes conversation history (advanced)
- Detects insufficient information
- Can trigger re-retrieval

**Output:** `answer`, updated conversation history

## State Management

### Basic Graph State
```typescript
{
  question: string          // User's question
  documents: string[]       // Retrieved full docs
  messages: BaseMessage[]   // Chat messages
  answer: string           // Final answer
  iterations: number       // Iteration count
}
```

### Advanced Graph State (Additional)
```typescript
{
  conversationHistory: BaseMessage[]  // Full conversation
  needsRetrieval: boolean             // Control flag
  needsRefinement: boolean            // Control flag
  refinedQuery: string                // Improved query
  retrievalCount: number              // Track retrieval attempts
}
```

## Usage Examples

### Basic Graph

```typescript
import { createDocumentSearchGraph } from '@/agents/document-search-graph'

const graph = createDocumentSearchGraph({
  vectorStore: chunksStore,
  embeddingModel,
  topK: 3
})

const result = await graph.invoke({
  question: "What tours are available?",
  documents: [],
  messages: [],
  answer: '',
  iterations: 0
})

console.log(result.answer)
```

### Advanced Graph with Options

```typescript
import { createAdvancedDocumentSearchGraph } from '@/agents/document-search-graph-advanced'

const graph = createAdvancedDocumentSearchGraph({
  vectorStore: chunksStore,
  embeddingModel,
  topK: 5,
  maxIterations: 3,
  enableQueryRefinement: true
})

const result = await graph.invoke({
  question: "Tours?",  // Vague query will be refined
  conversationHistory: previousMessages,
  documents: [],
  needsRetrieval: true,
  needsRefinement: false,
  refinedQuery: '',
  answer: '',
  iterations: 0,
  retrievalCount: 0
})
```

### With Memory (Stateful Conversations)

```typescript
const graph = createAdvancedDocumentSearchGraph({...})
const threadId = { configurable: { thread_id: "conversation-123" } }

// First question
await graph.invoke({...}, threadId)

// Follow-up (uses memory)
await graph.invoke({
  question: "Tell me more about that",  // References previous context
  ...
}, threadId)
```

## Routing Logic

### Conditional Edges

**After Analysis:**
```typescript
if (needsRefinement && enableQueryRefinement) {
  return 'refine'  // Go to query refinement
}
return 'retrieve'  // Skip to retrieval
```

**After Retrieval:**
```typescript
return 'generate'  // Always generate after retrieval
```

**After Generate:**
```typescript
if (answerInsufficient && retrievalCount < maxIterations) {
  return 'retrieve'  // Try again with different/broader search
}
return 'end'  // Done
```

## Benefits of Graph Architecture

### 1. **Explainability**
- Clear visualization of agent flow
- Each step is logged and traceable
- Easy to debug where issues occur

### 2. **Flexibility**
- Add/remove nodes without breaking system
- Modify routing logic independently
- A/B test different paths

### 3. **State Management**
- Persistent state across nodes
- Can pause and resume
- Checkpoint intermediate results

### 4. **Iterative Improvement**
- Re-retrieve if first attempt fails
- Refine queries automatically
- Learn from conversation history

### 5. **Human-in-the-Loop**
- Can add approval nodes
- Allow manual intervention
- Review before final answer

## Performance Considerations

### Query Refinement
- **Pro:** Better search results
- **Con:** Extra LLM call (+ $0.001, +500ms)
- **Recommendation:** Enable for user-facing chatbots, disable for batch processing

### Iterative Retrieval
- **Pro:** Better answers for complex questions
- **Con:** Multiple searches (2-3x latency)
- **Recommendation:** Set `maxIterations: 2` for good balance

### Memory/Checkpointing
- **Pro:** Stateful conversations, can resume
- **Con:** Extra storage, slight overhead
- **Recommendation:** Use for multi-turn conversations, skip for one-off queries

## Testing

Run the test script:
```bash
pnpm test:graph
```

This will test all three agent types with sample questions and show:
- Retrieval steps
- Documents fetched
- Context size
- Final answers
- Performance stats

## Next Steps

### Potential Enhancements

1. **Re-ranking:** Score documents by relevance after retrieval
2. **Hybrid Search:** Combine vector + keyword search
3. **Source Citations:** Link specific sentences to documents
4. **Confidence Scoring:** Rate answer quality
5. **Fallback Strategies:** Web search if local docs insufficient
6. **Parallel Retrieval:** Search multiple collections simultaneously
7. **Streaming:** Return partial answers as they generate
8. **Feedback Loop:** Learn from user ratings

### Adding New Nodes

Example: Add a "Validate Answer" node

```typescript
async function validateAnswer(state: State): Promise<Partial<State>> {
  // Check if answer makes sense
  const isValid = await checkAnswerQuality(state.answer)
  
  if (!isValid && state.iterations < maxIterations) {
    return { needsRetrieval: true }  // Try again
  }
  
  return { needsRetrieval: false }
}

// Add to graph
workflow
  .addNode('validate', validateAnswer)
  .addEdge('generate', 'validate')
  .addConditionalEdges('validate', routeAfterValidation, {
    retrieve: 'retrieve',
    end: END
  })
```

## Summary

You now have a **production-ready graph-based RAG system** with:
- ✅ Modular, testable architecture
- ✅ State management and memory
- ✅ Conditional routing and iteration
- ✅ Query refinement (optional)
- ✅ Full observability and logging
- ✅ Easy to extend and customize

Choose the right agent for your use case:
- **Simple Chain:** Quick answers, minimal overhead
- **Basic Graph:** Clear flow, easy debugging
- **Advanced Graph:** Full-featured, production-ready
