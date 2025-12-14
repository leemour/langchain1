# RAG Application Setup Guide

## Plan

Top 10 Suggested Improvements:
✅ Separate ingestion - IMPLEMENTED!
Add streaming - Real-time responses
Add source citations - LLM cites which doc used
Add metadata filtering - Filter by type, date, etc.
Add caching - Redis for common queries
Add reranking - Better retrieval accuracy
Add chat history - Multi-turn conversations
Hybrid search - Vector + keyword
Query rewriting - Improve vague queries
Evaluation metrics - Track quality

## Overview

This is a complete RAG (Retrieval-Augmented Generation) application that lets you ask questions about your documents.

## Architecture

```
┌─────────────────┐
│  1. Setup       │  Create Qdrant collection (once)
│  setup:qdrant   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Ingest      │  Load & embed documents (when docs change)
│  ingest         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Query       │  Ask questions (many times)
│  dev            │
└─────────────────┘
```

## Quick Start

### 1. Prerequisites

Start Qdrant (Docker):
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Set environment variables:
```bash
# .env
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333  # optional, defaults to localhost
```

### 2. Initial Setup (Run Once)

```bash
# Create the Qdrant collection
pnpm setup:qdrant
```

### 3. Ingest Documents (Run When Adding Docs)

Add your documents to `data/docs/` then:

```bash
# Load, split, embed, and store documents
pnpm ingest
```

### 4. Query Your Documents

```bash
# Ask questions about your documents
pnpm dev
```

## Commands

| Command | Purpose | When to Run |
|---------|---------|-------------|
| `pnpm setup:qdrant` | Create Qdrant collection | Once (initial setup) |
| `pnpm ingest` | Load documents into Qdrant | When adding/updating docs |
| `pnpm dev` | Query the RAG agent | Anytime to ask questions |

## File Structure

```
scripts/
  ├── setup-qdrant.ts      # Creates collection (step 1)
  └── ingest-docs.ts       # Loads documents (step 2)

src/
  ├── index.ts             # Query interface (step 3)
  ├── agents/
  │   └── document-searcher.ts  # RAG agent logic
  ├── storage/
  │   └── quadrant.ts      # Qdrant operations
  └── utils/
      ├── loaders.ts       # Load files from disk
      ├── splitters.ts     # Split into chunks
      └── embeddings.ts    # Embedding model

data/
  └── docs/                # Put your .md/.txt files here
```

## How It Works

### Ingestion Pipeline
```
.md/.txt files → Load → Split into chunks → Create embeddings → Store in Qdrant
```

### Query Pipeline
```
Question → Embed query → Find similar chunks → Format context → LLM → Answer
```

## Example Workflow

```bash
# First time setup
docker run -p 6333:6333 qdrant/qdrant
pnpm setup:qdrant

# Add some documents to data/docs/
echo "LangChain is a framework for AI" > data/docs/intro.md

# Ingest them
pnpm ingest

# Ask questions
pnpm dev
# Output: Answers questions about LangChain
```

## Customization

### Change Chunk Size
Edit `src/utils/splitters.ts`:
```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,     // Larger chunks = more context
  chunkOverlap: 200,   // More overlap = better continuity
})
```

### Change Retrieval Count
Edit `src/index.ts`:
```typescript
const agent = createDocumentSearcherAgent(vectorStore, { 
  topK: 5  // Retrieve more documents
})
```

### Change Model
Edit `src/agents/document-searcher.ts`:
```typescript
const agent = createDocumentSearcherAgent(vectorStore, {
  modelName: 'gpt-4o',  // More capable model
  temperature: 0.3,     // More creative
})
```

## Troubleshooting

### "Collection not found"
Run `pnpm setup:qdrant` first

### "No documents found"
Run `pnpm ingest` to load documents

### Slow performance
- Use smaller chunks
- Reduce topK
- Cache common queries (see improvements.md)

## Next Steps

See `docs/improvements.md` for suggested enhancements:
- Streaming responses
- Source citations
- Metadata filtering
- Caching
- And more!
