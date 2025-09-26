import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User from '../../../../../lib/models/User'
import { refreshAccessToken, getRefreshTokenFromRequest } from '../../../../../lib/authEnhanced'
import { handleError, AuthenticationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger, logAuthSuccess, logAuthFailure } from '../../../../../lib/logger'

export const POST = asyncHandler(async function refreshHandler(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    await connectDB()
    
    const refreshToken = getRefreshTokenFromRequest(request)
    
    if (!refreshToken) {
      logAuthFailure('refresh_no_token')
      throw new AuthenticationError('Refresh token not provided')
    }
    
    // Get user info from database to generate new token
    const userId = request.cookies.get('userId')?.value
    if (!userId) {
      logAuthFailure('refresh_no_user_id')
      throw new AuthenticationError('User information not available')
    }
    
    const userRecord = await User.findById(userId)
    if (!userRecord || !userRecord.isActive) {
      logAuthFailure('refresh_invalid_user', { userId })
      throw new AuthenticationError('User not found or inactive')
    }
    
    // Remove password from user object for security
    const user = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      name: userRecord.name,
      email: userRecord.email,
      position: userRecord.position,
      phone: userRecord.phone,
      priceLevel: userRecord.priceLevel,
      creditLimit: userRecord.creditLimit,
      isActive: userRecord.isActive
    }
    
    // Refresh the token
    const tokenPair = refreshAccessToken(refreshToken, {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    })
    
    if (!tokenPair) {
      logAuthFailure('refresh_invalid_token', { userId })
      throw new AuthenticationError('Invalid or expired refresh token')
    }
    
    const response = NextResponse.json({
      message: 'Token refreshed successfully'
    })
    
    // Set new tokens in cookies
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
    
    // Update userId cookie
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })
    
    logAuthSuccess(user.id, 'token_refresh', {
      tokenId: tokenPair.tokenId
    })
    
    logger.logRequest('POST', '/api/auth/refresh', 200, Date.now() - startTime, {
      userId: user.id
    })
    
    return response
    
  } catch (error) {
    logger.logRequest('POST', '/api/auth/refresh', error instanceof AuthenticationError ? 401 : 500, Date.now() - startTime)
    throw error
  }
})