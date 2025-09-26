import { NextRequest, NextResponse } from 'next/server'
import { UserModel } from '../../../../../lib/models/User'
import { getUserFromRequest } from '../../../../../lib/auth'
import { generateTokenPair } from '../../../../../lib/authEnhanced'
import { strictRateLimit } from '../../../../../lib/rateLimit'
import { handleError, AuthenticationError, ValidationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger, logAuthSuccess, logAuthFailure } from '../../../../../lib/logger'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../lib/credit'

export const POST = asyncHandler(async function exitImpersonationHandler(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Apply strict rate limiting
    const rateLimitResponse = strictRateLimit()(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      logAuthFailure('exit_impersonation_no_user')
      throw new AuthenticationError('Unauthorized')
    }
    
    // Check if this is actually an impersonation session
    if (!currentUser.isImpersonation || !currentUser.originalAdminId) {
      logAuthFailure('exit_impersonation_not_in_session', {
        userId: currentUser.userId,
        isImpersonation: currentUser.isImpersonation || false
      })
      throw new ValidationError('Not in an impersonation session')
    }
    
    // Find the original admin user
    const originalAdmin = await UserModel.findOne({ 
      id: currentUser.originalAdminId,
      isActive: true,
      role: 'admin'
    })
    
    if (!originalAdmin) {
      logAuthFailure('exit_impersonation_admin_not_found', {
        originalAdminId: currentUser.originalAdminId,
        currentUserId: currentUser.userId
      })
      throw new ValidationError('Original admin user not found')
    }
    
    // Generate new token pair for the original admin (without impersonation claims)
    const tokenPair = generateTokenPair({
      userId: originalAdmin.id.toString(),
      username: originalAdmin.username,
      role: originalAdmin.role,
      name: originalAdmin.name
    })
    
    const creditUsed = await calculateCreditForUser(originalAdmin.id)
    const credit = buildCreditSummary(originalAdmin.creditLimit ?? 0, creditUsed)

    // Create response with original admin data
    const userData = {
      id: originalAdmin.id,
      username: originalAdmin.username,
      email: originalAdmin.email,
      name: originalAdmin.name,
      position: originalAdmin.position,
      phone: originalAdmin.phone,
      role: originalAdmin.role,
      priceLevel: originalAdmin.priceLevel,
      creditLimit: credit.creditLimit,
      creditUsed: credit.creditUsed,
      creditRemaining: credit.creditRemaining
    }
    
    const response = NextResponse.json({
      message: 'Exited impersonation session',
      user: userData
    })
    
    // Set the admin tokens in HTTP-only cookies
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
    
    response.cookies.set('userId', originalAdmin.id.toString(), {
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
    
    // Log successful exit from impersonation
    logAuthSuccess(originalAdmin.id.toString(), 'impersonation_exit', {
      previousTargetUserId: currentUser.userId,
      tokenId: tokenPair.tokenId
    })
    
    logger.logRequest('POST', '/api/auth/exit-impersonation', 200, Date.now() - startTime, {
      context: {
        adminId: originalAdmin.id.toString(),
        previousTargetUserId: currentUser.userId
      }
    })
    
    return response
    
  } catch (error) {
    const statusCode = error instanceof AuthenticationError ? 401 : 
                      error instanceof ValidationError ? 400 : 500
    
    logger.logRequest('POST', '/api/auth/exit-impersonation', statusCode, Date.now() - startTime)
    throw error
  }
})