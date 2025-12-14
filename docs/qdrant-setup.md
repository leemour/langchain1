# Qdrant Setup & Usage

## Architecture

### 1. **Singleton Pattern for Qdrant Client**
- Single `QdrantClient` instance is reused across all operations
- Avoids creating multiple connections
- More efficient and follows best practices

### 2. **Separation of Concerns**

**Setup (One-time):**
- `setupQdrantCollection()` - Creates the collection infrastructure
- Run once via: `pnpm setup:qdrant`

**Regular Operations:**
- `getQdrantStore()` - Get vector store for queries
- `addDocuments()` - Add new documents to existing collection

## Workflow

### Initial Setup (Run Once)
```bash
# 1. Make sure Qdrant is running (e.g., via Docker)
docker run -p 6333:6333 qdrant/qdrant

# 2. Create the collection
pnpm setup:qdrant
```

### Regular Usage
```bash
# Load, split, embed, and store documents
pnpm dev
```

## Why This Approach?

**❌ Bad (Old approach):**
```ts
// Creates collection AND adds documents - mixing concerns
initializeQdrantCollection(documents, embeddings)
```

**✅ Good (New approach):**
```ts
// Setup script (once)
setupQdrantCollection(embeddings)

// Application code (many times)
addDocuments(chunks, embeddings)
getQdrantStore(embeddings)
```

**Benefits:**
1. **Idempotent setup** - Can run multiple times safely
2. **Clear separation** - Setup vs operations
3. **Reusable client** - Single connection
4. **Migration-friendly** - Easy to version control setup
