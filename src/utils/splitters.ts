import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { Document } from '@langchain/core/documents'

export async function splitDocuments(docs: Document[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  })
  return await splitter.splitDocuments(docs)
}
