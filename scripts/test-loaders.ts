#!/usr/bin/env tsx
/**
 * Test document loading
 * Verifies files can be loaded from data/docs/
 */

import { loadDocuments } from '../src/utils/loaders.js'

async function main() {
  console.log('🧪 Testing document loading...\n')

  try {
    const docs = await loadDocuments()

    console.log(`✅ Loaded ${docs.length} documents\n`)

    docs.forEach((doc, i) => {
      console.log(`Document ${i + 1}:`)
      console.log(`  Source: ${doc.metadata.source}`)
      console.log(`  Length: ${doc.pageContent.length} characters`)
      console.log(`  Preview: ${doc.pageContent.slice(0, 100).replace(/\n/g, ' ')}...`)
      console.log()
    })

  } catch (error: any) {
    console.error('❌ Loading failed:', error.message)
    console.error('\nFull error:', error)
  }
}

main()
