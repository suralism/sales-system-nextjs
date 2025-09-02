import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import User from '../../../../lib/models/User'
import { getUserFromRequest, hashPassword } from '../../../../lib/auth'
import { apiRateLimit } from '../../../../lib/rateLimit'
import { AuthenticationError, AuthorizationError, ConflictError, asyncHandler } from '../../../../lib/errorHandler'
import { logger } from '../../../../lib/logger'
import { createValidationMiddleware, userValidationSchema } from '../../../../lib/validationMiddleware'

// GET - Get all users (admin only) or current user info
export const GET = asyncHandler(async function getUsersHandler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimit()(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  const startTime = Date.now()
  
  const currentUser = getUserFromRequest(request)
  
  if (!currentUser) {
    throw new AuthenticationError('Authentication required')
  }
  
  await connectDB()

  if (currentUser.role === 'admin') {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    const query = { isActive: true }
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ])

    logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
      context: { adminId: currentUser.userId, resultCount: users.length }
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } else {
    // Employee can only see their own info
    const user = await User.findById(currentUser.userId)
      .select('-password')
      .lean()

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
      userId: currentUser.userId
    })

    return NextResponse.json({
      users: [user],
      pagination: { page: 1, limit: 1, total: 1, pages: 1 }
    })
  }
})

// POST - Create new user (admin only)
export const POST = asyncHandler(async function createUserHandler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimit()(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  const startTime = Date.now()
  
  const currentUser = getUserFromRequest(request)
  
  if (!currentUser || currentUser.role !== 'admin') {
    throw new AuthorizationError('Admin access required')
  }
  
  await connectDB()
  
  // Validate and sanitize input
  const validateUser = createValidationMiddleware(userValidationSchema)
  const validation = await validateUser(request)
  
  if (!validation.isValid) {
    logger.warn('User creation validation failed', {
      errors: validation.errors,
      adminId: currentUser.userId
    })
    throw new AuthenticationError('Validation failed: ' + validation.errors.join(', '))
  }
  
  const { username, email, password, name, position, phone, role } = validation.sanitizedData
  
  // Check if username or email already exists
  const existingUser = await User.findOne({
    $or: [
      { username: String(username).toLowerCase() },
      { email: String(email).toLowerCase() }
    ]
  })
  
  if (existingUser) {
    throw new ConflictError('Username or email already exists')
  }
  
  // Hash password
  const hashedPassword = await hashPassword(String(password))
  
  // Create new user
  const newUser = new User({
    username: String(username).toLowerCase(),
    email: String(email).toLowerCase(),
    password: hashedPassword,
    name: String(name),
    position: String(position),
    phone: String(phone),
    role: role || 'employee'
  })
  
  await newUser.save()
  
  // Return user data without password
  const userData = {
    id: newUser._id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name,
    position: newUser.position,
    phone: newUser.phone,
    role: newUser.role,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt
  }
  
  logger.info('User created successfully', {
    newUserId: newUser._id.toString(),
    adminId: currentUser.userId,
    username: newUser.username
  })
  
  logger.logRequest('POST', '/api/users', 201, Date.now() - startTime, {
    context: { adminId: currentUser.userId, newUserId: newUser._id.toString() }
  })
  
  return NextResponse.json({
    message: 'User created successfully',
    user: userData
  }, { status: 201 })
})

