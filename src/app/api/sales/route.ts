import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Sale, { ISale } from '../../../../lib/models/Sale'
import Product, { IPrice } from '../../../../lib/models/Product'
import User from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
import { calculateCreditForUser, buildCreditSummary } from '../../../../lib/credit'
import mongoose from 'mongoose'

// GET - Get sales (admin sees all, employee sees only their own)
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const query: {
      saleDate?: { $gte?: Date, $lte?: Date },
      settled?: boolean,
      employeeId?: mongoose.Types.ObjectId
    } = {}
    
    if (currentUser.role === 'employee') {
      // Employee can only see their own sales
      query.employeeId = new mongoose.Types.ObjectId(currentUser.userId)
    }
    
    // Add date filter if provided
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const settled = searchParams.get('settled')
    
    if (startDate || endDate) {
      const saleDateQuery: { $gte?: Date; $lte?: Date } = {};
      if (startDate) {
        saleDateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        saleDateQuery.$lte = new Date(endDate);
      }
      query.saleDate = saleDateQuery;
    }

    if (settled === 'true') query.settled = true
    if (settled === 'false') query.settled = false
    
    const sales = await Sale.find(query)
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    const total = await Sale.countDocuments(query)
    
    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new sale
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const { employeeId, type, items, settled } = await request.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale items are required' },
        { status: 400 }
      )
    }
    
    if (!type || type !== 'เบิก') {
      return NextResponse.json(
        { error: 'Only withdrawal type is allowed' },
        { status: 400 }
      )
    }
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }
    const targetEmployeeId = employeeId
    
    const employee = await User.findById(targetEmployeeId)
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    const processedItems = []
    let totalAmount = 0

    for (const item of items) {
      const { productId, withdrawal } = item

      if (!productId) {
        throw new Error('Invalid item data: productId is missing')
      }

      const product = await Product.findById(productId)
      if (!product || !product.isActive) {
        throw new Error(`Product not found: ${productId}`)
      }

      const priceInfo = product.prices.find((p: IPrice) => p.level === employee.priceLevel)
      if (!priceInfo) {
        throw new Error(
          `Price for level ${employee.priceLevel} not found for product ${product.name}`
        )
      }
      const price = priceInfo.value

      const netQuantity = withdrawal || 0
      const itemTotalPrice = price * netQuantity

      processedItems.push({
        productId: product._id,
        productName: product.name,
        pricePerUnit: price,
        withdrawal: withdrawal || 0,
        return: 0,
        defective: 0,
        totalPrice: itemTotalPrice
      })

      totalAmount += itemTotalPrice
    }

    let existingSale: ISale | null = null
    if (type === 'เบิก') {
      existingSale = await Sale.findOne({
        employeeId: targetEmployeeId,
        type: 'เบิก',
        settled: false
      })
      
      // Check credit limit for withdrawal type
      const currentCreditUsed = await calculateCreditForUser(targetEmployeeId)
      const currentPendingAmount = existingSale ? existingSale.totalAmount : 0
      const newCreditUsed = currentCreditUsed - currentPendingAmount + totalAmount
      const creditSummary = buildCreditSummary(employee.creditLimit, newCreditUsed)
      
      if (newCreditUsed > (employee.creditLimit || 0)) {
        return NextResponse.json({
          error: 'เกินวงเงินเครดิต',
          details: {
            creditLimit: creditSummary.creditLimit,
            currentUsed: currentCreditUsed,
            requestedAmount: totalAmount,
            newTotal: newCreditUsed,
            exceededBy: newCreditUsed - creditSummary.creditLimit
          }
        }, { status: 400 })
      }
    }

    if (existingSale) {
      processedItems.forEach((newItem) => {
        const existingItem = existingSale!.items.find(
          (item) => item.productId.toString() === newItem.productId.toString()
        )

        if (existingItem) {
          existingItem.withdrawal += newItem.withdrawal
          existingItem.totalPrice = existingItem.pricePerUnit * existingItem.withdrawal
        } else {
          existingSale!.items.push(newItem)
        }
      })

      existingSale.totalAmount = existingSale.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      )
      existingSale.pendingAmount = Math.max(
        existingSale.totalAmount - (existingSale.paidAmount || 0),
        0
      )

      await existingSale.save()

      return NextResponse.json({
        message: 'Sale updated successfully',
        sale: existingSale
      })
    }

    const newSale = new Sale({
      employeeId: targetEmployeeId,
      employeeName: employee.name,
      type,
      items: processedItems,
      totalAmount,
      paidAmount: 0,
      paymentMethod: 'cash',
      pendingAmount: totalAmount,
      cashAmount: 0,
      transferAmount: 0,
      customerPending: 0,
      expenseAmount: 0,
      awaitingTransfer: 0,
      settled: settled ?? false
    })

    await newSale.save()

    return NextResponse.json(
      {
        message: 'Sale recorded successfully',
        sale: newSale
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Create sale error:', error)
    
    if (error instanceof Error && (error.message.includes('Product not found') ||
        error.message.includes('Invalid item data'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

