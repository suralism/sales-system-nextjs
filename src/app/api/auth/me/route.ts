import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User, { IUser } from '../../../../../lib/models/User'
import { getUserFromRequest } from '../../../../../lib/auth'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../lib/credit'
import { logger } from '../../../../../lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Get fresh user data from database
    const userData = await User.findOne({ _id: user.userId })
      .select('-password')
      .lean<IUser>()
    
    if (!userData || !userData.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      )
    }
    
    const creditUsed = await calculateCreditForUser(userData._id)
    const credit = buildCreditSummary(userData.creditLimit ?? 0, creditUsed)

    return NextResponse.json({
      user: {
        id: userData._id,
        username: userData.username,
        email: userData.email,
        name: userData.name,
        position: userData.position,
        phone: userData.phone,
        role: userData.role,
        priceLevel: userData.priceLevel,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining,
        // Include impersonation info if present
        ...(user.isImpersonation && {
          isImpersonation: true,
          originalAdmin: {
            id: user.originalAdminId,
            name: user.originalAdminName
          }
        })
      }
    })
    
  } catch (error) {
    logger.error('Get user info error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

