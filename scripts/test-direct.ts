import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.TURSO_DATABASE_URL
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

async function testDirectConnection() {
  try {
    console.log('Testing direct connection to Turso...')
    console.log('Database URL:', DATABASE_URL?.substring(0, 50) + '...')
    console.log('Auth Token:', AUTH_TOKEN?.substring(0, 20) + '...')
    
    // Try a direct HTTP request to the database
    const response = await fetch(`${DATABASE_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [
          {
            q: 'SELECT 1 as test'
          }
        ]
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Direct connection successful!')
    } else {
      console.log('❌ Direct connection failed')
    }
    
  } catch (error) {
    console.error('Error testing connection:', error)
  }
}

testDirectConnection()