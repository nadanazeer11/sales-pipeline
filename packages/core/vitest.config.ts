import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5999/test',
      UNIPILE_BASE_URL: 'http://api.test.local',
      UNIPILE_API_KEY: 'test',
      UNIPILE_WEBHOOK_SECRET: 'test-secret',
    },
  },
})
