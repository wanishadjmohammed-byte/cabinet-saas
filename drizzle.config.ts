import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
