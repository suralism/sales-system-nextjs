// Import testing library if available
try {
  require('@testing-library/jest-dom')
} catch (e) {
  // jest-dom not available, skip
}

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-with-minimum-32-characters'
process.env.MONGODB_URI = 'mongodb://localhost:27017/sales_system_test'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Setup and teardown for each test
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})