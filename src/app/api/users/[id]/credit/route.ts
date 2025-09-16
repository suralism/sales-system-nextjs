import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../../lib/database'
import User, { IUser } from '../../../../../../lib/models/User'
import { getUserFromRequest } from '../../../../../../lib/auth'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../../lib/credit'

// GET - Get credit information for specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Check if user can access this data
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own credit data' },
        { status: 403 }
      )
    }
    
    const user = await User.findById(id)
      .select('name creditLimit')
      .lean<IUser>()

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const creditUsed = await calculateCreditForUser(user._id.toString())
    const credit = buildCreditSummary(user.creditLimit ?? 0, creditUsed)

    return NextResponse.json({
      userId: user._id,
      userName: user.name,
      creditLimit: credit.creditLimit,
      creditUsed: credit.creditUsed,
      creditRemaining: credit.creditRemaining
    })
    
  } catch (error) {
    console.error('Get user credit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}