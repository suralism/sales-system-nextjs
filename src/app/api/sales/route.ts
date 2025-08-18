import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Sale from '../../../../lib/models/Sale'
import Product from '../../../../lib/models/Product'
import User from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
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
    
    const query: Record<string, unknown> = {}
    
    if (currentUser.role === 'employee') {
      // Employee can only see their own sales
      query.employeeId = new mongoose.Types.ObjectId(currentUser.userId)
    }
    
    // Add date filter if provided
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (startDate || endDate) {
      query.saleDate = {}
      if (startDate) query.saleDate.$gte = new Date(startDate)
      if (endDate) query.saleDate.$lte = new Date(endDate)
    }
    
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
    
    const { employeeId, type, items, notes } = await request.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale items are required' },
        { status: 400 }
      )
    }
    
    if (!type || !['เบิก', 'คืน'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sale type' },
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
    
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const processedItems = []
      let totalAmount = 0
      
      for (const item of items) {
        const { productId, withdrawal, return: returnQty, defective } = item
        
        if (!productId) {
          throw new Error('Invalid item data: productId is missing')
        }
        
        const product = await Product.findById(productId).session(session)
        if (!product || !product.isActive) {
          throw new Error(`Product not found: ${productId}`)
        }
        
        const priceInfo = product.prices.find(p => p.level === employee.priceLevel);
        if (!priceInfo) {
          throw new Error(`Price for level ${employee.priceLevel} not found for product ${product.name}`)
        }
        const price = priceInfo.value;

        const netStockChange = (returnQty || 0) - (withdrawal || 0)

        if (product.stock + netStockChange < 0) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${withdrawal}`)
        }
        
        const netQuantity = (withdrawal || 0) - (returnQty || 0) - (defective || 0);
        const itemTotalPrice = price * netQuantity;
        
        processedItems.push({
          productId: product._id,
          productName: product.name,
          pricePerUnit: price,
          withdrawal: withdrawal || 0,
          return: returnQty || 0,
          defective: defective || 0,
          totalPrice: itemTotalPrice
        })
        
        totalAmount += itemTotalPrice
        
        if (netStockChange !== 0) {
            await Product.findByIdAndUpdate(
              productId,
              { $inc: { stock: netStockChange } },
              { session }
            )
        }
      }
      
      const newSale = new Sale({
        employeeId: targetEmployeeId,
        employeeName: employee.name,
        type,
        items: processedItems,
        totalAmount,
        notes: notes?.trim()
      })
      
      await newSale.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        message: 'Sale recorded successfully',
        sale: newSale
      }, { status: 201 })
      
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
    
  } catch (error) {
    console.error('Create sale error:', error)
    
    if (error.message.includes('Insufficient stock') || 
        error.message.includes('Product not found') ||
        error.message.includes('Invalid item data')) {
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

