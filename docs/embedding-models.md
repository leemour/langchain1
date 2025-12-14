# Understanding Embedding Models

## What is an Embedding Model?

An **embedding model** is an AI that converts text into numerical vectors (arrays of numbers).

```
Text: "cat"        → Embedding Model → Vector: [0.2, 0.5, -0.1, ...]
Text: "dog"        → Embedding Model → Vector: [0.3, 0.4, -0.2, ...]
Text: "car"        → Embedding Model → Vector: [-0.8, 0.1, 0.9, ...]
```

**Key insight:** Similar meanings = similar vectors
- "cat" and "dog" vectors are close together (both animals)
- "car" vector is far away (different concept)

## Why Qdrant Needs It

### When Storing Documents:
```typescript
const embeddingModel = buildEmbeddingModel()

// Your text chunk
const chunk = "LangChain is a framework for AI apps"

// Model converts text → vector
const vector = await embeddingModel.embedQuery(chunk)
// vector = [0.23, -0.45, 0.67, ... 1536 numbers]

// Qdrant stores: { text: chunk, vector: vector }
```

### When Searching:
```typescript
// Your search query
const query = "What is LangChain?"

// SAME model converts query → vector
const queryVector = await embeddingModel.embedQuery(query)

// Qdrant finds vectors close to queryVector
// Returns the text chunks with similar meaning
```

## Critical Rule: Use the SAME Model

```typescript
// ✅ CORRECT - Same model for both
const model = buildEmbeddingModel() // text-embedding-3-small

await addDocuments(chunks, model)      // Store with this model
const results = await search(query, model)  // Search with same model

// ❌ WRONG - Different models = nonsense results
const model1 = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
const model2 = new OpenAIEmbeddings({ model: 'text-embedding-3-large' })

await addDocuments(chunks, model1)     // Store with model1
const results = await search(query, model2)  // Search with model2 ❌
```

## Our Implementation

**File: `src/utils/embeddings.ts`**
```typescript
export function buildEmbeddingModel() {
  return new OpenAIEmbeddings({
    apiKey: env.OPENAI_API_KEY,
    model: 'text-embedding-3-small', // Always use this model
  })
}
```

**Why this name is better:**
- ❌ `createEmbeddings()` - Sounds like it creates the vectors
- ✅ `buildEmbeddingModel()` - Clear it's creating the AI model

The model is reused for:
1. Converting documents → vectors (storing)
2. Converting queries → vectors (searching)
