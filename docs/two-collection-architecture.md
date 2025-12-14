# Two-Collection Architecture

## Overview

This RAG system uses **two separate Qdrant collections** for optimal performance:

1. **`langchain1_chunks`** - Small chunks with vectors for semantic search
2. **`langchain1_full_docs`** - Complete documents for LLM context

## Why Two Collections?

### The Problem with Single Collection

**Chunk-only approach:**
- ❌ LLM gets fragmented context
- ❌ Missing surrounding information
- ❌ Incoherent answers

**Full-doc only approach:**
- ❌ Poor search precision (whole docs are large)
- ❌ Irrelevant content in results
- ❌ Expensive embeddings

### The Solution: Separate Collections

```
User Query → Search chunks (precise) → Get doc IDs → Fetch full docs → LLM
```

**Benefits:**
- ✅ Precise semantic search on small chunks
- ✅ Complete context to LLM (full documents)
- ✅ No fragmentation or lost context
- ✅ Clean separation of concerns

## Data Flow

### 1. Ingestion (`pnpm ingest`)

```
Original Document (3000 chars)
         ↓
   Split into chunks
         ↓
┌─────────────────────┬─────────────────────┐
│   Chunks Collection │  Full Docs Collection│
├─────────────────────┼─────────────────────┤
│ Chunk 1 (500 chars) │                     │
│  + vector           │  Full Doc (3000)    │
│  + metadata.id      │   + vector          │
│                     │   + metadata.id     │
│ Chunk 2 (500 chars) │                     │
│  + vector           │                     │
│  + metadata.id      │                     │
│                     │                     │
│ ... (6 chunks)      │  (1 document)       │
└─────────────────────┴─────────────────────┘
```

### 2. Query Flow (`pnpm dev`)

```typescript
// Step 1: Search chunks for relevance
const chunks = await chunksStore.similaritySearch("Valencia tours", 3)
// Returns: [chunk1, chunk5, chunk9] from different documents

// Step 2: Extract unique document IDs
const docIds = [...new Set(chunks.map(c => c.metadata.documentId))]
// Returns: ["uuid-abc", "uuid-xyz"]

// Step 3: Fetch full documents
const fullDocs = await getFullDocumentsByIds(docIds, embeddingModel)
// Returns: 2 complete documents

// Step 4: Send to LLM
const answer = await llm.invoke({ context: fullDocs, question: "..." })
```

## Collection Schemas

### Chunks Collection

```typescript
{
  id: "qdrant-generated-uuid",
  vector: [0.123, -0.456, ...], // 1536 dimensions
  payload: {
    pageContent: "Old Town of Valencia tour...", // ~500 chars
    metadata: {
      id: "doc-uuid-abc",           // From parent document
      documentId: "doc-uuid-abc",   // Link to parent
      source: "data/docs/01_excursions_valencia.md",
      chunkIndex: 2,
      loc: { lines: { from: 15, to: 25 } }
    }
  }
}
```

### Full Docs Collection

```typescript
{
  id: "qdrant-generated-uuid",
  vector: [0.789, -0.123, ...], // 1536 dimensions
  payload: {
    pageContent: "# Excursions in Valencia\n\n...", // Full document
    metadata: {
      id: "doc-uuid-abc",                             // Unique doc ID
      source: "data/docs/01_excursions_valencia.md"
    }
  }
}
```

## Key Design Decisions

### 1. Store Full Chunk Text

**Decision:** Store complete chunk text in chunks collection

**Why:**
- Can show matched snippets to users
- Useful for debugging/inspection
- Enables fallback to "chunks only" mode
- Storage cost is minimal (few KB per chunk)

**Alternative considered:** Store only vectors + metadata (saves ~50% space but loses flexibility)

### 2. Use Document IDs for Linking

**Decision:** Assign UUIDs to documents, store in chunk metadata

**Why:**
- Fast lookups by ID
- Works with any source (files, URLs, DB)
- No dependency on file paths
- Enables deduplication

### 3. Embed Full Documents Too

**Decision:** Create vectors for full docs, not just chunks

**Why:**
- Qdrant requires vectors for all stored data
- Enables searching full docs directly if needed
- Minimal cost (1 embedding per document vs many per chunks)

## Storage Comparison

For 5 markdown files (~15KB total):

| Collection | Points | Storage | Purpose |
|------------|--------|---------|---------|
| Chunks | ~30 | ~500KB | Fast semantic search |
| Full Docs | 5 | ~100KB | Complete context |
| **Total** | **35** | **~600KB** | Both use cases |

*Note: Most storage is vectors (1536 floats = 6KB each)*

## Usage Patterns

### Standard RAG (Current)

```typescript
const agent = createDocumentSearchAgent(chunksStore, embeddingModel, {
  topK: 3,
  useFullDocs: true  // ← Retrieve full documents
})
```

### Chunks-Only Mode (Optional)

```typescript
const agent = createDocumentSearchAgent(chunksStore, embeddingModel, {
  topK: 5,
  useFullDocs: false  // ← Just use matched chunks
})
```

### Direct Full Doc Search (Experimental)

```typescript
const fullDocsStore = await getFullDocsStore(embeddingModel)
const docs = await fullDocsStore.similaritySearch(query, 2)
// Search full docs directly (lower precision but complete content)
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Chunk search (k=3) | ~10-30ms | Vector similarity on chunks |
| Fetch full docs (2 docs) | ~5-10ms | ID lookup, no vector search |
| Total query | ~15-40ms | Fast enough for real-time |
| Ingestion (5 files) | ~2-5s | Includes embedding API calls |

## Future Enhancements

### Potential Improvements

1. **Hybrid Search:** Add keyword filters on metadata
   ```typescript
   const chunks = await store.similaritySearch(query, 5, {
     "metadata.category": "tours",
     "metadata.price": { "$lt": 50 }
   })
   ```

2. **Chunk Context Window:** Retrieve surrounding chunks
   ```typescript
   // Get matched chunk + 1 before + 1 after
   const expandedChunks = await getChunksWithContext(matchedChunk, window=1)
   ```

3. **Re-ranking:** Score full docs by sum of chunk scores
   ```typescript
   const docScores = chunks.reduce((acc, chunk) => {
     acc[chunk.metadata.documentId] = (acc[...] || 0) + chunk.score
     return acc
   }, {})
   ```

4. **Streaming:** Return partial docs while fetching rest
   ```typescript
   for await (const doc of streamFullDocs(docIds)) {
     yield doc // Start LLM generation earlier
   }
   ```

## Migration Notes

### From Single Collection

If you have an existing `langchain1_docs` collection:

1. Run `pnpm clear` to remove old collection
2. Run `pnpm setup:qdrant` to create new collections
3. Run `pnpm ingest` to populate both collections

### Backward Compatibility

The `getQdrantStore()` function still exists for backward compatibility but now points to the chunks collection. Update your code to use:

- `getChunksStore()` - for searching
- `getFullDocsStore()` - for retrieval
- `getFullDocumentsByIds()` - to fetch by IDs

## Summary

This two-collection architecture provides:

- **Precise search** via small, focused chunks
- **Complete context** via full documents
- **Clean separation** of search vs retrieval
- **Flexibility** for different query patterns
- **Minimal overhead** (~600KB for 5 docs)

The result: Better answers from your RAG system! 🎯
