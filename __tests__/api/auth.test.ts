import { NextRequest } from 'next/server'
import { POST as loginHandler } from '../../../src/app/api/auth/login/route'
import { POST as loginAsHandler } from '../../../src/app/api/auth/login-as/route'
import { POST as exitImpersonationHandler } from '../../../src/app/api/auth/exit-impersonation/route'
import { generateToken } from '../../../lib/auth'

// Mock the database connection
jest.mock('../../../lib/database', () => jest.fn().mockResolvedValue({}))

// Mock mongoose models
jest.mock('../../../lib/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}))

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  position: 'Developer',
  phone: '1234567890',
  role: 'employee',
  priceLevel: 'ราคาปกติ',
  isActive: true,
  password: '$2a$12$hashedpassword'
}

const mockAdmin = {
  ...mockUser,
  _id: '507f1f77bcf86cd799439012',
  username: 'admin',
  name: 'Admin User',
  role: 'admin'
}

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should login successfully with valid credentials', async () => {
    const User = require('../../../lib/models/User')
    User.findOne.mockResolvedValue(mockUser)
    
    // Mock bcrypt compare
    jest.doMock('bcryptjs', () => ({
      compare: jest.fn().mockResolvedValue(true)
    }))

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await loginHandler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Login successful')
    expect(data.user).toMatchObject({
      username: mockUser.username,
      role: mockUser.role,
      name: mockUser.name
    })
    expect(data.user.password).toBeUndefined()
    expect(data.token).toBeDefined()
  })

  it('should reject login with invalid credentials', async () => {
    const User = require('../../../lib/models/User')
    User.findOne.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'invaliduser',
        password: 'wrongpassword'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await loginHandler(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid username or password')
  })

  it('should reject login with missing credentials', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await loginHandler(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Username and password are required')
  })
})

describe('/api/auth/login-as', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should allow admin to impersonate employee', async () => {
    const User = require('../../../lib/models/User')
    User.findOne.mockResolvedValue(mockUser)

    // Create admin token
    const adminToken = generateToken({
      userId: mockAdmin._id,
      username: mockAdmin.username,
      role: mockAdmin.role,
      name: mockAdmin.name
    })

    const request = new NextRequest('http://localhost/api/auth/login-as', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: mockUser._id
      }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${adminToken}`
      }
    })

    const response = await loginAsHandler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Impersonation session started')
    expect(data.user.isImpersonation).toBe(true)
    expect(data.user.originalAdmin.id).toBe(mockAdmin._id)
  })

  it('should reject non-admin impersonation attempts', async () => {
    // Create employee token
    const employeeToken = generateToken({
      userId: mockUser._id,
      username: mockUser.username,
      role: mockUser.role,
      name: mockUser.name
    })

    const request = new NextRequest('http://localhost/api/auth/login-as', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: mockAdmin._id
      }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${employeeToken}`
      }
    })

    const response = await loginAsHandler(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Unauthorized - Admin access required')
  })
})

describe('/api/auth/exit-impersonation', () => {
  it('should exit impersonation session successfully', async () => {
    const User = require('../../../lib/models/User')
    User.findOne.mockResolvedValue(mockAdmin)

    // Create impersonation token
    const impersonationToken = generateToken({
      userId: mockUser._id,
      username: mockUser.username,
      role: mockUser.role,
      name: mockUser.name,
      originalAdminId: mockAdmin._id,
      originalAdminName: mockAdmin.name,
      isImpersonation: true
    })

    const request = new NextRequest('http://localhost/api/auth/exit-impersonation', {
      method: 'POST',
      headers: {
        'Cookie': `token=${impersonationToken}`
      }
    })

    const response = await exitImpersonationHandler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Exited impersonation session')
    expect(data.user.username).toBe(mockAdmin.username)
    expect(data.user.role).toBe(mockAdmin.role)
  })

  it('should reject exit when not in impersonation session', async () => {
    // Create regular token (not impersonation)
    const regularToken = generateToken({
      userId: mockUser._id,
      username: mockUser.username,
      role: mockUser.role,
      name: mockUser.name
    })

    const request = new NextRequest('http://localhost/api/auth/exit-impersonation', {
      method: 'POST',
      headers: {
        'Cookie': `token=${regularToken}`
      }
    })

    const response = await exitImpersonationHandler(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Not in an impersonation session')
  })
})