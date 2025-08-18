import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Sale, { ISaleItem } from '../../../../../lib/models/Sale'
import Product from '../../../../../lib/models/Product'
import User from '../../../../../lib/models/User'
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

// PUT - Update existing sale
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const saleId = params.id
    const { items, notes, settled } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale items are required' },
        { status: 400 }
      )
    }

    const sale = await Sale.findById(saleId)
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    if (sale.settled) {
      return NextResponse.json({ error: 'Sale already settled' }, { status: 400 })
    }

    // Only admin or the employee who owns the sale can update
    if (currentUser.role !== 'admin' && sale.employeeId.toString() !== currentUser.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await User.findById(sale.employeeId)
    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const oldItemsMap = new Map<string, ISaleItem>()
      ;(sale.items as ISaleItem[]).forEach(item => {
        oldItemsMap.set(item.productId.toString(), item)
      })

      const newProcessedItems: ISaleItem[] = []
      let totalAmount = 0
      const stockAdjustments = new Map<string, number>()

      for (const item of items) {
        const { productId, withdrawal, return: returnQty, defective } = item
        if (!productId) {
          throw new Error('Invalid item data: productId is missing')
        }

        const product = await Product.findById(productId).session(session)
        if (!product || !product.isActive) {
          throw new Error(`Product not found: ${productId}`)
        }

        const priceInfo = product.prices.find((p: { level: string; value: number }) => p.level === employee.priceLevel)
        if (!priceInfo) {
          throw new Error(`Price for level ${employee.priceLevel} not found for product ${product.name}`)
        }
        const price = priceInfo.value

        const netStockChange = (returnQty || 0) - (withdrawal || 0)
        const oldItem = oldItemsMap.get(productId.toString())
        const oldNetStock = oldItem ? (oldItem.return - oldItem.withdrawal) : 0
        const deltaStock = netStockChange - oldNetStock

        if (product.stock + deltaStock < 0) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`)
        }

        if (deltaStock !== 0) {
          stockAdjustments.set(productId.toString(), deltaStock)
        }

        const netQuantity = (withdrawal || 0) - (returnQty || 0) - (defective || 0)
        const itemTotalPrice = price * netQuantity
        totalAmount += itemTotalPrice

        newProcessedItems.push({
          productId: product._id,
          productName: product.name,
          pricePerUnit: price,
          withdrawal: withdrawal || 0,
          return: returnQty || 0,
          defective: defective || 0,
          totalPrice: itemTotalPrice
        })

        oldItemsMap.delete(productId.toString())
      }

      // Handle removed items
      for (const [productId, oldItem] of oldItemsMap) {
        const revertStock = oldItem.withdrawal - oldItem.return
        if (revertStock !== 0) {
          const product = await Product.findById(productId).session(session)
          if (!product || !product.isActive) {
            throw new Error(`Product not found: ${productId}`)
          }
          if (product.stock + revertStock < 0) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`)
          }
          stockAdjustments.set(productId, (stockAdjustments.get(productId) || 0) + revertStock)
        }
      }

      for (const [productId, delta] of stockAdjustments) {
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: delta } },
          { session }
        )
      }

      sale.items = newProcessedItems
      sale.totalAmount = totalAmount
      sale.notes = notes?.trim()
      if (typeof settled === 'boolean') {
        sale.settled = settled
      }
      await sale.save({ session })

      await session.commitTransaction()

      return NextResponse.json({ message: 'Sale updated successfully', sale })
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error: unknown) {
    console.error('Update sale error:', error)
    if (error instanceof Error && (error.message.includes('Insufficient stock') || error.message.includes('Product not found'))) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
