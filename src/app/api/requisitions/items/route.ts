import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Requisition, { IRequisitionItem } from '../../../../../lib/models/Requisition'
import { getUserFromRequest } from '../../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items } = await request.json()
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 })
    }

    await connectDB()

    let requisition = await Requisition.findOne({ employeeId: currentUser.userId, status: 'open' })
    if (!requisition) {
      requisition = new Requisition({ employeeId: currentUser.userId, items: [] })
    }

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
        continue
      }
      const existing = requisition.items.find(
        (i: IRequisitionItem) => i.productId.toString() === item.productId
      )
      if (existing) {
        existing.quantity += item.quantity
      } else {
        requisition.items.push({ productId: item.productId, quantity: item.quantity })
      }
    }

    await requisition.save()
    return NextResponse.json({ requisition })
  } catch (error) {
    console.error('Add requisition items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
