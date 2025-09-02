import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/auth'
import { revokeToken, getUserFromRequest as getEnhancedUserFromRequest } from '../../../../../lib/authEnhanced'
import { apiRateLimit } from '../../../../../lib/rateLimit'
import { handleError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger, logAuthSuccess } from '../../../../../lib/logger'

export const POST = asyncHandler(async function logoutHandler(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Apply rate limiting
    const rateLimitResponse = apiRateLimit()(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Get user info for logging (optional - logout should work even without valid token)
    const currentUser = getUserFromRequest(request)
    const enhancedUser = getEnhancedUserFromRequest(request)
    const userId = currentUser?.userId || enhancedUser?.userId
    
    const response = NextResponse.json({
      message: 'Logout successful'
    })
    
    // Clear all authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0,
      path: '/'
    }
    
    // Clear legacy token cookie
    response.cookies.set('token', '', cookieOptions)
    
    // Clear enhanced auth cookies
    response.cookies.set('accessToken', '', cookieOptions)
    response.cookies.set('refreshToken', '', cookieOptions)
    response.cookies.set('userId', '', cookieOptions)
    
    // Revoke refresh token if we have user info
    if (userId && enhancedUser?.tokenId) {
      try {
        revokeToken(enhancedUser.tokenId)
      } catch (revokeError) {
        // Log but don't fail logout for revocation errors
        logger.warn('Failed to revoke token during logout', {
          userId,
          error: revokeError instanceof Error ? revokeError.message : 'Unknown error'
        })
      }
    }
    
    // Log successful logout
    logAuthSuccess(userId || 'unknown', 'logout')
    
    logger.logRequest('POST', '/api/auth/logout', 200, Date.now() - startTime, {
      userId: userId || 'unknown'
    })
    
    return response
    
  } catch (error) {
    logger.logRequest('POST', '/api/auth/logout', 500, Date.now() - startTime)
    throw error
  }
})

