import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../../lib/database'
import Requisition from '../../../../../../lib/models/Requisition'
import { getUserFromRequest } from '../../../../../../lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const requisition = await Requisition.findOne({ _id: id, employeeId: currentUser._id, status: 'open' })

    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
    }

    requisition.status = 'cleared'
    await requisition.save()

    return NextResponse.json({ requisition })
  } catch (error) {
    console.error('Clear requisition error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
