import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

import { UserModel } from '../lib/models/User'

async function testMockData() {
  try {
    console.log('Testing mock data access...')
    
    // Try to find users
    console.log('Finding users...')
    const users = await UserModel.find()
    console.log('Users found:', users.length)
    
    if (users.length > 0) {
      console.log('Sample user:', {
        id: users[0].id,
        username: users[0].username,
        name: users[0].name,
        role: users[0].role
      })
    }
    
    // Try to find a specific user
    console.log('Finding admin user...')
    const admin = await UserModel.findOne({ username: 'admin' })
    
    if (admin) {
      console.log('✅ Admin user found:', admin.name)
    } else {
      console.log('❌ Admin user not found')
    }
    
    console.log('✅ Mock data test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing mock data:', error)
  } finally {
    process.exit(0)
  }
}

testMockData()