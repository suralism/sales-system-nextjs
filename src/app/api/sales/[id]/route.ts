import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Sale, { ISaleItem } from '../../../../../lib/models/Sale'
import Product from '../../../../../lib/models/Product'
import User from '../../../../../lib/models/User'
import { getUserFromRequest } from '../../../../../lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: saleId } = await params
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const sale = await Sale.findById(saleId)
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    await Sale.findByIdAndDelete(saleId)

    return NextResponse.json({ message: 'Sale deleted successfully' })
  } catch (error) {
    console.error('Delete sale error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update existing sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: saleId } = await params
  try {
    const currentUser = getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const {
      items,
      notes,
      settled,
      paidAmount,
      paymentMethod,
      cashAmount,
      transferAmount,
      customerPending,
      expenseAmount,
      awaitingTransfer
    } = await request.json()

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

    if (items && Array.isArray(items) && items.length > 0) {
      const newProcessedItems: ISaleItem[] = []
      let totalAmount = 0

      for (const item of items) {
        const { productId, withdrawal, return: returnQty, defective } = item
        if (!productId) {
          throw new Error('Invalid item data: productId is missing')
        }

        const product = await Product.findById(productId)
        if (!product || !product.isActive) {
          throw new Error(`Product not found: ${productId}`)
        }

        const priceInfo = product.prices.find((p: { level: string; value: number }) => p.level === employee.priceLevel)
        if (!priceInfo) {
          throw new Error(`Price for level ${employee.priceLevel} not found for product ${product.name}`)
        }
        const price = priceInfo.value

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
      }

      sale.items = newProcessedItems
      sale.totalAmount = totalAmount
      sale.notes = notes?.trim()
      if (typeof settled === 'boolean') {
        sale.settled = settled
      }
      if (typeof cashAmount === 'number') sale.cashAmount = cashAmount
      if (typeof transferAmount === 'number') sale.transferAmount = transferAmount
      if (typeof customerPending === 'number') sale.customerPending = customerPending
      if (typeof expenseAmount === 'number') sale.expenseAmount = expenseAmount
      if (typeof awaitingTransfer === 'number') sale.awaitingTransfer = awaitingTransfer
      if (typeof paidAmount === 'number') {
        sale.paidAmount = paidAmount
      } else {
        sale.paidAmount = (sale.cashAmount || 0) + (sale.transferAmount || 0)
      }
      sale.pendingAmount = Math.max(sale.totalAmount - sale.paidAmount, 0)
      await sale.save()

      return NextResponse.json({ message: 'Sale updated successfully', sale })
    } else {
      sale.notes = notes?.trim() ?? sale.notes
      if (typeof cashAmount === 'number') sale.cashAmount = cashAmount
      if (typeof transferAmount === 'number') sale.transferAmount = transferAmount
      if (typeof customerPending === 'number') sale.customerPending = customerPending
      if (typeof expenseAmount === 'number') sale.expenseAmount = expenseAmount
      if (typeof awaitingTransfer === 'number') sale.awaitingTransfer = awaitingTransfer
      if (typeof paidAmount === 'number') {
        sale.paidAmount = paidAmount
      } else {
        sale.paidAmount = (sale.cashAmount || 0) + (sale.transferAmount || 0)
      }
      if (paymentMethod) {
        sale.paymentMethod = paymentMethod
      }
      if (typeof settled === 'boolean') {
        sale.settled = settled
      }
      sale.pendingAmount = Math.max(sale.totalAmount - sale.paidAmount, 0)
      await sale.save()
      return NextResponse.json({ message: 'Sale settlement updated successfully', sale })
    }
  } catch (error: unknown) {
    console.error('Update sale error:', error)
    if (error instanceof Error && error.message.includes('Product not found')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
