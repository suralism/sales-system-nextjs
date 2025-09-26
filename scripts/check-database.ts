import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

import { createClient } from '@libsql/client'

async function checkDatabaseStatus() {
  console.log('🔍 Checking Turso database status...')
  
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    
    console.log('✅ Connected to Turso database')
    console.log('📍 Database URL:', process.env.TURSO_DATABASE_URL)
    
    // Try to run a simple query first
    console.log('🔍 Testing basic connectivity...')
    
    try {
      const result = await client.execute('SELECT 1 as test')
      console.log('✅ Basic query successful:', result.rows)
    } catch (error) {
      console.error('❌ Basic query failed:', error)
      return
    }
    
    // Check existing tables
    console.log('📋 Checking existing tables...')
    try {
      const tablesResult = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)
      
      if (tablesResult.rows.length === 0) {
        console.log('📝 No tables found in database')
      } else {
        console.log('📋 Existing tables:')
        tablesResult.rows.forEach((row: any) => {
          console.log(`  - ${row.name}`)
        })
      }
    } catch (error) {
      console.error('❌ Error checking tables:', error)
    }
    
    // Try to create a simple test table
    console.log('🧪 Testing table creation...')
    try {
      await client.execute('DROP TABLE IF EXISTS test_table')
      await client.execute(`
        CREATE TABLE test_table (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Test table created successfully')
      
      // Test insert
      await client.execute(`
        INSERT INTO test_table (id, name) VALUES ('test1', 'Test Entry')
      `)
      console.log('✅ Test insert successful')
      
      // Test select
      const selectResult = await client.execute('SELECT * FROM test_table')
      console.log('✅ Test select successful:', selectResult.rows)
      
      // Clean up
      await client.execute('DROP TABLE test_table')
      console.log('✅ Test table cleaned up')
      
    } catch (error) {
      console.error('❌ Test table creation failed:', error)
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
}

if (require.main === module) {
  checkDatabaseStatus()
    .then(() => {
      console.log('✅ Database check completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database check failed:', error)
      process.exit(1)
    })
}