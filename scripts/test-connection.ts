import * as dotenv from 'dotenv'
import { createClient } from '@libsql/client'

// Load environment variables
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function testConnection() {
  try {
    console.log('Testing Turso connection...')
    
    // Try a simple query first
    const result = await client.execute('SELECT 1 as test')
    console.log('Connection test result:', result.rows)
    
    // Try to create a simple test table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY,
        name TEXT
      )
    `)
    console.log('Test table created successfully')
    
    // Try to insert a record
    await client.execute({
      sql: 'INSERT INTO test_table (name) VALUES (?)',
      args: ['test_record']
    })
    console.log('Test record inserted successfully')
    
    // Try to query the record
    const records = await client.execute('SELECT * FROM test_table')
    console.log('Test records:', records.rows)
    
    // Clean up
    await client.execute('DROP TABLE test_table')
    console.log('Test table dropped successfully')
    
    console.log('All tests passed! Turso connection is working.')
    
  } catch (error) {
    console.error('Error testing connection:', error)
  } finally {
    process.exit(0)
  }
}

testConnection()