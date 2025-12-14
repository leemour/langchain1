import { config } from 'dotenv'
import { z } from 'zod'

config()
config({ path: `.env.${process.env.NODE_ENV}`, override: true }) // loads .env.development, .env.production, etc.

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
})

export const env = envSchema.parse(process.env)
