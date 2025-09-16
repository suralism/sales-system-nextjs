/**
 * Simple test to check if credit calculation is working correctly
 * Run this in the browser console while logged in as admin
 */

async function testCreditCalculation() {
  try {
    console.log('Testing credit calculation...')
    
    // Fetch employee data
    const response = await fetch('/api/users')
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    
    const data = await response.json()
    console.log('Employee credit data:', data.users)
    
    // Display credit info for each employee
    data.users.forEach(user => {
      if (user.role === 'employee') {
        console.log(`Employee: ${user.name}`)
        console.log(`  Credit Limit: ${user.creditLimit}`)
        console.log(`  Credit Used: ${user.creditUsed}`)
        console.log(`  Credit Remaining: ${user.creditRemaining}`)
        console.log('---')
      }
    })
    
    return data.users
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testCreditCalculation()
