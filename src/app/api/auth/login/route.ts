import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User from '../../../../../lib/models/User'
import { comparePassword } from '../../../../../lib/auth'
import { generateTokenPair } from '../../../../../lib/authEnhanced'
import { authRateLimit } from '../../../../../lib/rateLimit'
import { AuthenticationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger, logAuthSuccess, logAuthFailure, setRequestContext } from '../../../../../lib/logger'
import { createValidationMiddleware, loginValidationSchema } from '../../../../../lib/validationMiddleware'
import crypto from 'crypto'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../lib/credit'

export const POST = asyncHandler(async function loginHandler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = authRateLimit()(request)
  
  if (rateLimitResponse) {
    logAuthFailure('login_rate_limited', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    })
    return rateLimitResponse
  }

  // Set request context for logging
  const requestId = crypto.randomBytes(16).toString('hex')
  setRequestContext({
    requestId,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  })

  const startTime = Date.now()
  
  try {
    await connectDB()
    
    // Validate and sanitize input
    const validateLogin = createValidationMiddleware(loginValidationSchema)
    const validation = await validateLogin(request)
    
    if (!validation.isValid) {
      logAuthFailure('login_validation_failed', {
        errors: validation.errors,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      })
      throw new AuthenticationError('Invalid input: ' + validation.errors.join(', '))
    }
    
    const { username, password } = validation.sanitizedData
    
    logger.info('Login attempt', {
      username: username,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    })
    
    // Find user by username (case insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      isActive: true 
    })
    
    if (!user) {
      logAuthFailure('invalid_username', { username: username })
      throw new AuthenticationError('Invalid username or password')
    }
    
    // Check password
    const isPasswordValid = await comparePassword(String(password), user.password)
    
    if (!isPasswordValid) {
      logAuthFailure('invalid_password', { 
        userId: user._id.toString(),
        username: username 
      })
      throw new AuthenticationError('Invalid username or password')
    }
    
    // Generate token pair
    const tokenPair = generateTokenPair({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name
    })
    
    const creditUsed = await calculateCreditForUser(user._id)
    const credit = buildCreditSummary(user.creditLimit ?? 0, creditUsed)

    // Create response with user data (excluding password)
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      position: user.position,
      phone: user.phone,
      role: user.role,
      priceLevel: user.priceLevel,
      creditLimit: credit.creditLimit,
      creditUsed: credit.creditUsed,
      creditRemaining: credit.creditRemaining
    }
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: userData
    })
    
    // Set tokens in HTTP-only cookies
    response.cookies.set('accessToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    })
    
    response.cookies.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })
    
    logAuthSuccess(user._id.toString(), 'login', {
      username: user.username,
      role: user.role,
      tokenId: tokenPair.tokenId
    })
    
    logger.logRequest('POST', '/api/auth/login', 200, Date.now() - startTime, {
      userId: user._id.toString()
    })
    
    return response
    
  } catch (error) {
    logger.logRequest('POST', '/api/auth/login', error instanceof AuthenticationError ? 401 : 500, Date.now() - startTime)
    throw error
  }
})

