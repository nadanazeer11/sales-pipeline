import { existsSync } from 'node:fs'
import type { NextConfig } from 'next'

const envFile = '../../.env'
if (existsSync(envFile)) process.loadEnvFile(envFile)

const config: NextConfig = {
  transpilePackages: ['@sp/core'],
  serverExternalPackages: ['postgres', 'pino', 'pino-pretty'],
  devIndicators: false,
}

export default config
