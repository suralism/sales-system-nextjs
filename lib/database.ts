import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('Please define the TURSO_DATABASE_URL environment variable')
}

let db: any

try {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  })
  
  db = drizzle(client)
  console.log('✅ Connected to SQLite database:', process.env.TURSO_DATABASE_URL)
} catch (error) {
  console.error('❌ Database connection failed:', (error as Error).message)
  throw error
}

export { db }

// For compatibility, export as default
export default db

