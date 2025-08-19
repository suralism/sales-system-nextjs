import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Requisition from '../../../../../lib/models/Requisition'
import { getUserFromRequest } from '../../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const requisition = await Requisition.findOne({ employeeId: currentUser.userId, status: 'open' }).lean()
    return NextResponse.json({ requisition })
  } catch (error) {
    console.error('Get current requisition error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
