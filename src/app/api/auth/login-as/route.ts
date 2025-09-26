import { NextRequest, NextResponse } from 'next/server'
import { UserModel } from '../../../../../lib/models/User'
import { getUserFromRequest } from '../../../../../lib/auth'
import { generateTokenPair } from '../../../../../lib/authEnhanced'
import { strictRateLimit } from '../../../../../lib/rateLimit'
import { handleError, AuthenticationError, ValidationError, asyncHandler, validateRequired, validateObjectId } from '../../../../../lib/errorHandler'
import { logger, logAuthSuccess, logAuthFailure } from '../../../../../lib/logger'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../lib/credit'

export const POST = asyncHandler(async function loginAsHandler(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Apply strict rate limiting for impersonation
    const rateLimitResponse = strictRateLimit()(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const currentUser = getUserFromRequest(request)
    
    // Only admins can use login-as functionality
    if (!currentUser || currentUser.role !== 'admin') {
      logAuthFailure('login_as_unauthorized', {
        userId: currentUser?.userId || 'unknown',
        role: currentUser?.role || 'none'
      })
      throw new AuthenticationError('Unauthorized - Admin access required')
    }
    

    const body = await request.json()
    const { targetUserId } = body
    
    // Input validation
    validateRequired({ targetUserId }, ['targetUserId'])
    validateObjectId(targetUserId, 'targetUserId')
    
    // Sanitize input (basic string trimming)
    const sanitizedTargetUserId = targetUserId.trim()
    
    // Find the target user to impersonate
    const targetUser = await UserModel.findOne({ 
      id: sanitizedTargetUserId,
      isActive: true,
      role: 'employee' // Only allow impersonating employees, not other admins
    })
    
    if (!targetUser) {
      logAuthFailure('login_as_target_not_found', {
        adminId: currentUser.userId,
        targetUserId: sanitizedTargetUserId
      })
      throw new ValidationError('Target employee not found or inactive')
    }
    
    // Generate token pair for impersonation with enhanced claims
    const tokenPair = generateTokenPair({
      userId: targetUser.id.toString(),
      username: targetUser.username,
      role: targetUser.role,
      name: targetUser.name,
      // Add special claims to identify this as an impersonation session
      originalAdminId: currentUser.userId,
      originalAdminName: currentUser.name,
      isImpersonation: true
    })
    
    const creditUsed = await calculateCreditForUser(targetUser.id)
    const credit = buildCreditSummary(targetUser.creditLimit ?? 0, creditUsed)

    // Create response with target user data
    const userData = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      name: targetUser.name,
      position: targetUser.position,
      phone: targetUser.phone,
      role: targetUser.role,
      priceLevel: targetUser.priceLevel,
      creditLimit: credit.creditLimit,
      creditUsed: credit.creditUsed,
      creditRemaining: credit.creditRemaining,
      // Include impersonation info for frontend
      isImpersonation: true,
      originalAdmin: {
        id: currentUser.userId,
        name: currentUser.name
      }
    }
    
    const response = NextResponse.json({
      message: 'Impersonation session started',
      user: userData
    })
    
    // Set the impersonation tokens in HTTP-only cookies
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
    
    response.cookies.set('userId', targetUser.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })
    
    // Also set legacy token for backward compatibility
    response.cookies.set('token', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    })
    
    // Log successful impersonation
    logAuthSuccess(currentUser.userId, 'impersonation_start', {
      targetUserId: targetUser.id.toString(),
      targetUsername: targetUser.username,
      tokenId: tokenPair.tokenId
    })
    
    logger.logRequest('POST', '/api/auth/login-as', 200, Date.now() - startTime, {
      context: {
        adminId: currentUser.userId,
        targetUserId: targetUser.id.toString()
      }
    })
    
    return response
    
  } catch (error) {
    const statusCode = error instanceof AuthenticationError ? 403 : 
                      error instanceof ValidationError ? 400 : 500
    
    logger.logRequest('POST', '/api/auth/login-as', statusCode, Date.now() - startTime)
    throw error
  }
})