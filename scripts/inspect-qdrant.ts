#!/usr/bin/env tsx
/**
 * Inspect Qdrant Collections
 * Shows what's actually stored in the database
 *
 * Usage: pnpm inspect
 */

import { getQdrantClient, CHUNKS_COLLECTION, FULL_DOCS_COLLECTION, DOCS_COLLECTION } from '../src/storage/quadrant'

async function inspectCollection(client: any, collectionName: string) {
  try {
    // Get collection info
    const collection = await client.getCollection(collectionName)
    console.log(`\n📊 Collection: ${collectionName}`)
    console.log(`   Status: ${collection.status}`)
    console.log(`   Vectors: ${collection.points_count}`)
    console.log(`   Vector size: ${collection.config.params?.vectors?.size}`)
    console.log(`   Distance: ${collection.config.params?.vectors?.distance}`)

    // Get all points with their payloads
    const points = await client.scroll(collectionName, {
      limit: 100,
      with_payload: true,
      with_vector: false,
    })

    console.log(`\n📄 Documents in Collection (${points.points.length} total):\n`)

    // Group by source file
    const bySource = new Map<string, number>()

    points.points.forEach((point, index) => {
      const payload = point.payload as any

      // Try different payload structures
      const source = payload?.metadata?.source || payload?.source || 'unknown'
      const content = payload?.pageContent || payload?.page_content || payload?.text || payload?.content || 'no content'
      const docId = payload?.metadata?.id || payload?.metadata?.documentId || 'no-id'

      // Count by source
      bySource.set(source, (bySource.get(source) || 0) + 1)

      // Show first few items in detail
      if (index < 3) {
        console.log(`[${index + 1}] Point ID: ${point.id}`)
        console.log(`    Document ID: ${docId}`)
        console.log(`    Source: ${source}`)
        console.log(`    Content: ${content.slice(0, 100)}...`)
        if (payload?.metadata) {
          console.log(`    Metadata: ${JSON.stringify(payload.metadata, null, 2).slice(0, 200)}`)
        }
        console.log()
      }
    })

    // Show remaining items summary
    if (points.points.length > 3) {
      console.log(`... and ${points.points.length - 3} more documents\n`)
    }

    console.log('📈 Summary by Source File:')
    Array.from(bySource.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count} documents`)
      })

    // Check if collection is empty
    if (points.points.length === 0) {
      console.log('\n⚠️  Collection is EMPTY!')
      console.log('   Run: pnpm ingest')
    }

    return true
  } catch (error: any) {
    if (error.message?.includes('Not found')) {
      console.log(`\n❌ Collection '${collectionName}' does not exist!`)
      return false
    } else {
      throw error
    }
  }
}

async function main() {
  const client = getQdrantClient()

  console.log('🔍 Inspecting Qdrant Collections...')
  console.log('=' .repeat(60))

  // Inspect chunks collection
  const chunksExists = await inspectCollection(client, CHUNKS_COLLECTION)

  console.log('\n' + '='.repeat(60))

  // Inspect full docs collection
  const fullDocsExists = await inspectCollection(client, FULL_DOCS_COLLECTION)

  console.log('\n' + '='.repeat(60))

  // Check for old collection
  try {
    await client.getCollection(DOCS_COLLECTION)
    console.log(`\n⚠️  Old collection '${DOCS_COLLECTION}' still exists`)
    console.log('   Consider running: pnpm clear')
  } catch {
    // Old collection doesn't exist, that's good
  }

  if (!chunksExists || !fullDocsExists) {
    console.log('\n⚠️  Some collections are missing!')
    console.log('   Run: pnpm setup:qdrant')
    console.log('   Then: pnpm ingest')
  }
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
