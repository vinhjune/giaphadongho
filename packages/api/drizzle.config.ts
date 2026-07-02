import { defineConfig } from 'drizzle-kit'
import path from 'path'

export default defineConfig({
  schema: path.resolve(__dirname, '../shared/src/schema.ts'),
  out: path.resolve(__dirname, './migrations'),
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
})
