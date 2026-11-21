import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

const envFile = '../../.env'
if (existsSync(envFile)) process.loadEnvFile(envFile)

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
