import pino from 'pino'
import pinoPretty from 'pino-pretty'

const pretty = pinoPretty({
  colorize: true,
  ignore: 'pid,hostname',
})

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      destination: process.stdout,
      pretty,
    },
  },
})
