import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Sale from '../../../../../lib/models/Sale'
import Product from '../../../../../lib/models/Product'
import { getUserFromRequest } from '../../../../../lib/auth'
import mongoose from 'mongoose'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const saleId = params.id

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const sale = await Sale.findById(saleId).session(session)
      if (!sale) {
        throw new Error('Sale not found')
      }

      // Revert stock quantities
      for (const item of sale.items) {
        const stockChange = item.withdrawal - item.return
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: stockChange } },
          { session }
        )
      }

      await Sale.findByIdAndDelete(saleId).session(session)

      await session.commitTransaction()

      return NextResponse.json({ message: 'Sale deleted successfully' })
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error) {
    console.error('Delete sale error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
