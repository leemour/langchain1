import { buildEmbeddingModel } from '@/utils/embeddings.js'
import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { getChunksStore } from '@/storage/quadrant.js'
import { createDocumentSearchGraph } from '@/agents/document-search-graph.js'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

let graph: any

bot.use((ctx, next) => {
  if (ctx.from) {
    const userId = ctx.from.id.toString()
    // @ts-ignore - Add custom property to context
    ctx.threadConfig = {
      configurable: {
        thread_id: userId
      }
    }
  }
  return next()
})

async function initializeBot() {
  console.log('🤖 Initializing Telegram bot...')

  const embeddingModel = buildEmbeddingModel()
  const chunksStore = await getChunksStore(embeddingModel)

  graph = await createDocumentSearchGraph({
    vectorStore: chunksStore,
    embeddingModel,
    topK: 3,
    enableQueryRefinement: true,
    maxIterations: 2
  })

  console.log('✅ Telegram bot initialized')
}

bot.command('start', (ctx) => {
  ctx.reply(
    `Hi! 👋 I'm a Valencia Tourism Bot. How can I help you today?\n` +
    `Ask me about guided tours, excursions, and activities in Valencia.`
  )
})

bot.command('clear', (ctx) => {
  ctx.reply('🧹 Clearing conversation history...')
  graph.invoke({
    question: '',
    conversationHistory: [],
    documents: [],
    needsRetrieval: true,
    needsRefinement: false,
    refinedQuery: '',
    answer: '',
    iterations: 0,
    retrievalCount: 0
  })
})

// Handle /start command
bot.on(message('text'), async (ctx) => {
  const userId = ctx.from.id.toString()
  const question = ctx.text

  console.log(`\n📨 Message from ${userId}: ${question}`)

  try {
   const threadConfig = {
    configurable: {
      thread_id: userId
    }
   }

   const result = await graph.invoke({
    question,
    conversationHistory: [],
    documents: [],
    needsRetrieval: true,
    needsRefinement: false,
    refinedQuery: '',
    answer: '',
    iterations: 0,
    retrievalCount: 0
   }, threadConfig)

   await ctx.reply(result.answer)

    console.log(`\n✅ Answer: ${result.answer.slice(0, 100)}...`)
  } catch (error) {
    console.error('❌ Error processing message:', error)
    await ctx.reply('Sorry, I encountered an error. Please try again.')
  }
})

bot.catch((err, ctx) => {
  console.error('❌ Error:', err)
})

export async function startTelegramBot() {
  await initializeBot()
  await bot.launch()
  console.log('🚀 Telegram bot started')

  process.once('SIGINT', () => {
    bot.stop('SIGINT')
    console.log('👋 Telegram bot stopped')
  })

  process.once('SIGTERM', () => {
    bot.stop('SIGTERM')
    console.log('👋 Telegram bot stopped')
  })
}
