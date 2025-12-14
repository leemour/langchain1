import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'

export async function loadDocuments() {
  const loader = new DirectoryLoader(
    "data/docs",
    {
      ".md": (path: string) => new TextLoader(path),
      ".txt": (path: string) => new TextLoader(path)
    }
  )
  const docs = await loader.load()
  return docs
}
