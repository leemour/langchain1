#!/usr/bin/env tsx
/**
 * Telegram Bot Launcher
 * Start with: pnpm bot
 */

import { startTelegramBot } from '../src/bots/telegram-bot.js'

startTelegramBot().catch((error) => {
  console.error('❌ Failed to start bot:', error)
  process.exit(1)
})
