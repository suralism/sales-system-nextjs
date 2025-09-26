import { NextRequest, NextResponse } from 'next/server'
import { UserModel } from '../../../../lib/models/User'
import { getUserFromRequest, hashPassword } from '../../../../lib/auth'
import { apiRateLimit } from '../../../../lib/rateLimit'
import { AuthenticationError, AuthorizationError, ConflictError, asyncHandler } from '../../../../lib/errorHandler'
import { logger } from '../../../../lib/logger'
import { createValidationMiddleware, userValidationSchema } from '../../../../lib/validationMiddleware'
import { calculateCreditUsage, buildCreditSummary } from '../../../../lib/credit'

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
  
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const view = searchParams.get('view')

  if (view === 'dropdown') {
    const limitParam = parseInt(searchParams.get('limit') || '0', 10)
    const requestedLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : null
    const roleFilter = searchParams.get('role') || 'employee'

    const query: any = { isActive: true }
    if (roleFilter !== 'all') {
      query.role = roleFilter as 'admin' | 'employee'
    }

    let users = await UserModel.find(query)
    
    if (requestedLimit) {
      users = users.slice(0, requestedLimit)
    }

    const usageMap = await calculateCreditUsage(users.map((user: any) => user.id.toString()))

    const usersWithCredit = users.map((user: any) => {
      const usage = usageMap.get(user.id.toString()) || 0
      const credit = buildCreditSummary(user.creditLimit ?? 0, usage)

      return {
        ...user,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining
      }
    })

    logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
      context: {
        userId: currentUser.userId,
        view: 'dropdown',
        roleFilter,
        resultCount: usersWithCredit.length
      }
    })

    return NextResponse.json({
      users: usersWithCredit,
      pagination: {
        page: 1,
        limit: usersWithCredit.length,
        total: usersWithCredit.length,
        pages: 1
      }
    })
  }

  if (currentUser.role === 'admin') {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    const query = { isActive: true }
    let allUsers = await UserModel.find(query)
    
    // Sort by created date (newest first)
    allUsers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    const total = allUsers.length
    const users = allUsers.slice(skip, skip + limit)

    const usageMap = await calculateCreditUsage(users.map((user: any) => user.id.toString()))

    const usersWithCredit = users.map((user: any) => {
      const usage = usageMap.get(user.id.toString()) || 0
      const credit = buildCreditSummary(user.creditLimit ?? 0, usage)

      return {
        ...user,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining
      }
    })

    logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
      context: { adminId: currentUser.userId, resultCount: users.length }
    })

    return NextResponse.json({
      users: usersWithCredit,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } else {
    // Check if this is a request for sales/dropdown purposes (no pagination params)
    const forSales = !searchParams.get('page') && !searchParams.get('limit')
    
    if (forSales) {
      // For sales recording, employees can see all employee users
      const query = { isActive: true, role: 'employee' as const }
      const users = await UserModel.find(query)

      const usageMap = await calculateCreditUsage(users.map((user: any) => user.id.toString()))

      const usersWithCredit = users.map((user: any) => {
        const usage = usageMap.get(user.id.toString()) || 0
        const credit = buildCreditSummary(user.creditLimit ?? 0, usage)

        return {
          ...user,
          creditLimit: credit.creditLimit,
          creditUsed: credit.creditUsed,
          creditRemaining: credit.creditRemaining
        }
      })

      logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
        userId: currentUser.userId,
        context: { type: 'sales-dropdown', resultCount: users.length }
      })

      return NextResponse.json({
        users: usersWithCredit,
        pagination: { page: 1, limit: users.length, total: users.length, pages: 1 }
      })
    } else {
      // Employee can only see their own info when accessing with pagination
      const user = await UserModel.findById(currentUser.userId)

      if (!user) {
        throw new AuthenticationError('User not found')
      }

      const usageMap = await calculateCreditUsage([user.id.toString()])
      const usage = usageMap.get(user.id.toString()) || 0
      const credit = buildCreditSummary(user.creditLimit ?? 0, usage)

      const userWithCredit = {
        ...user,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining
      }

      logger.logRequest('GET', '/api/users', 200, Date.now() - startTime, {
        userId: currentUser.userId
      })

      return NextResponse.json({
        users: [userWithCredit],
        pagination: { page: 1, limit: 1, total: 1, pages: 1 }
      })
    }
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
  
  const {
    username,
    email,
    password,
    name,
    position,
    phone,
    role,
    priceLevel,
    creditLimit
  } = validation.sanitizedData
  
  // Check if username or email already exists
  const existingUser = await UserModel.findOne({
    username: String(username).toLowerCase()
  })
  
  if (existingUser) {
    throw new ConflictError('Username or email already exists')
  }
  
  // Hash password
  const hashedPassword = await hashPassword(String(password))
  
  // Create new user
  const normalizedCreditLimit = typeof creditLimit === 'number' && creditLimit > 0 ? creditLimit : 0

  const newUser = await UserModel.create({
    username: String(username).toLowerCase(),
    email: String(email).toLowerCase(),
    password: hashedPassword,
    name: String(name),
    position: String(position),
    phone: String(phone),
    role: (role as 'admin' | 'employee') || 'employee',
    priceLevel: (priceLevel as 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ') || 'ราคาปกติ',
    creditLimit: normalizedCreditLimit,
    isActive: true
  })
  
  // Return user data without password
  const credit = buildCreditSummary(newUser.creditLimit, 0)

  const userData = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name,
    position: newUser.position,
    phone: newUser.phone,
    role: newUser.role,
    priceLevel: newUser.priceLevel,
    creditLimit: credit.creditLimit,
    creditUsed: credit.creditUsed,
    creditRemaining: credit.creditRemaining,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt
  }
  
  logger.info('User created successfully', {
    newUserId: newUser.id.toString(),
    adminId: currentUser.userId,
    username: newUser.username
  })
  
  logger.logRequest('POST', '/api/users', 201, Date.now() - startTime, {
    context: { adminId: currentUser.userId, newUserId: newUser.id.toString() }
  })
  
  return NextResponse.json({
    message: 'User created successfully',
    user: userData
  }, { status: 201 })
})