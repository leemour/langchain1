# Understanding Qdrant: How Vector Databases Work

## What is Qdrant?

Qdrant is a **vector database** - it stores and searches numerical vectors (embeddings) instead of just text.

## Architecture

### Collections (Like Database Tables)

```
Qdrant Server
├── Collection: "langchain1_docs"     ← Your documents
│   ├── Vector 1: [0.2, -0.5, ...]   → "LangChain is a framework..."
│   ├── Vector 2: [0.3, 0.1, ...]    → "Document loaders help..."
│   └── Vector 3: [-0.1, 0.8, ...]   → "Vector stores enable..."
│
├── Collection: "other_project"       ← Different project
│   ├── Vector 1: [0.5, -0.2, ...]
│   └── Vector 2: [0.1, 0.9, ...]
│
└── Collection: "chat_history"        ← Another use case
    └── ...
```

**Key Points:**
- Each collection is isolated (like separate tables)
- Collections have their own vector dimensions (must match embedding model)
- You can have multiple collections in one Qdrant instance
- Our app uses one collection: `langchain1_docs`

## How Data Flows

### 1. Ingestion (Writing)
```
Document Text
    ↓
Embedding Model (OpenAI)
    ↓
Vector [1536 numbers]
    ↓
Qdrant Collection "langchain1_docs"
    ↓
Stored with metadata (source, etc.)
```

### 2. Querying (Reading)
```
Search Query: "What is LangChain?"
    ↓
Embedding Model (SAME model!)
    ↓
Query Vector [1536 numbers]
    ↓
Qdrant: Find similar vectors
    ↓
Return top K matching documents
```

## The Problem: Adding vs Replacing

### What Was Happening

When you run `pnpm ingest`, it was **ADDING** documents to the collection:

```
First run:  [old doc 1]
Second run: [old doc 1, new doc 1, new doc 2, ...]  ← Duplicates!
Third run:  [old doc 1, new doc 1, new doc 2, new doc 1, new doc 2, ...]
```

This is why you saw the old `1.md` content - it was still in there!

### The Fix: Replace Mode

Now by default, `pnpm ingest` **REPLACES** all documents:

```typescript
// Deletes old collection and creates fresh one
await replaceDocuments(chunks, embeddingModel)
```

```
First run:  [doc 1, doc 2]
Second run: [new doc 1, new doc 2, new doc 3]  ← Old ones gone!
```

### Append Mode (Optional)

If you want to ADD new documents without removing old ones:

```bash
pnpm ingest --append
```

## Collection Lifecycle

### 1. Setup (Once)
```bash
pnpm setup:qdrant
```

Creates empty collection with correct vector dimensions:
```
Collection: langchain1_docs
- Vector size: 1536 (matches text-embedding-3-small)
- Distance metric: Cosine similarity
- Status: READY (empty)
```

### 2. Ingest (When Documents Change)
```bash
pnpm ingest              # Replace all documents
pnpm ingest --append     # Add to existing documents
```

Loads vectors into collection:
```
Collection: langchain1_docs
- Vectors: 12
- Documents: 5 source files
- Total points: 12 chunks
```

### 3. Query (Anytime)
```bash
pnpm dev
```

Searches the collection:
```
Query: "What is LangChain?"
↓
Find 3 most similar vectors
↓
Return their documents
```

## Multiple Collections Example

You could have multiple collections for different purposes:

```typescript
// Different collections for different data
const COLLECTIONS = {
  docs: 'langchain1_docs',       // Documentation
  chat: 'langchain1_chat',       // Chat history
  code: 'langchain1_code',       // Code snippets
}

// Each isolated from the others
await getQdrantStore(embeddingModel, COLLECTIONS.docs)
await getQdrantStore(embeddingModel, COLLECTIONS.chat)
```

## Why Same Embedding Model Matters

### Vector Dimensions Must Match

```typescript
// Setup: Creates collection for 1536-dimensional vectors
const model = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
// Collection configured: vectors must be [1536 numbers]

// Query: Must use SAME model
const sameModel = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
// ✅ Works: produces 1536-dimensional vectors

const differentModel = new OpenAIEmbeddings({ model: 'text-embedding-3-large' })
// ❌ Error: produces 3072-dimensional vectors (wrong size!)
```

### Semantic Space Must Match

Even if dimensions match, different models create different "semantic spaces":

```typescript
// Model A's understanding:
"cat" = [0.2, 0.5, ...]
"dog" = [0.3, 0.4, ...]

// Model B's understanding:
"cat" = [0.9, -0.1, ...]
"dog" = [0.1, 0.8, ...]

// Same words, completely different vectors!
// Can't mix them in same collection
```

## Checking Collection Status

You can inspect Qdrant directly:

### Via Qdrant UI
```
Open: http://localhost:6333/dashboard
View: Collections → langchain1_docs
See: Number of vectors, dimensions, etc.
```

### Via API
```bash
curl http://localhost:6333/collections/langchain1_docs
```

### Via Our Code (Debug)
```typescript
const client = new QdrantClient({ url: 'http://localhost:6333' })
const info = await client.getCollection('langchain1_docs')
console.log('Collection info:', info)
```

## Common Issues & Solutions

### "I don't know" responses
**Cause:** Old documents in collection
**Fix:** Run `pnpm ingest` (now uses REPLACE mode)

### "Collection not found"
**Cause:** Haven't run setup
**Fix:** Run `pnpm setup:qdrant`

### "No documents found"
**Cause:** Haven't ingested documents
**Fix:** Run `pnpm ingest`

### Stale documents
**Cause:** Running with `--append` multiple times
**Fix:** Run `pnpm ingest` without --append to clear old data

## Best Practices

1. **Setup once** - `pnpm setup:qdrant` only needed once
2. **Replace by default** - Use default `pnpm ingest` for clean state
3. **Append carefully** - Only use `--append` when truly adding new docs
4. **Same model** - Always use same embedding model for same collection
5. **One collection per project** - Don't mix unrelated documents

## Summary

- ✅ **Qdrant** = Vector database (stores embeddings)
- ✅ **Collections** = Isolated groups of vectors (like tables)
- ✅ **Our collection** = `langchain1_docs` (one collection)
- ✅ **Replace mode** = Default (clears old data)
- ✅ **Append mode** = Optional (keeps old data)
- ✅ **Same model** = Critical for consistency
