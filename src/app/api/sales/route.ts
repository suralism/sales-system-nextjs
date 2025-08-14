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
    
    let query: any = {}
    
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
    
    // Validate required fields
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
    
    // Determine the employee for this sale
    let targetEmployeeId = employeeId
    
    if (currentUser.role === 'employee') {
      // Employee can only create sales for themselves
      targetEmployeeId = currentUser.userId
    } else if (currentUser.role === 'admin') {
      // Admin can create sales for any employee
      if (!employeeId) {
        return NextResponse.json(
          { error: 'Employee ID is required' },
          { status: 400 }
        )
      }
      targetEmployeeId = employeeId
    }
    
    // Verify employee exists
    const employee = await User.findById(targetEmployeeId)
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      // Validate and process items
      const processedItems = []
      let totalAmount = 0
      
      for (const item of items) {
        const { productId, quantity } = item
        
        if (!productId || !quantity || quantity <= 0) {
          throw new Error('Invalid item data')
        }
        
        // Get product details
        const product = await Product.findById(productId).session(session)
        if (!product || !product.isActive) {
          throw new Error(`Product not found: ${productId}`)
        }
        
        // Check stock availability for 'เบิก' type
        if (type === 'เบิก' && product.stock < quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`)
        }
        
        const totalPrice = product.price * quantity
        
        processedItems.push({
          productId: product._id,
          productName: product.name,
          quantity,
          pricePerUnit: product.price,
          totalPrice
        })
        
        totalAmount += totalPrice
        
        // Update product stock
        const stockChange = type === 'เบิก' ? -quantity : quantity
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: stockChange } },
          { session }
        )
      }
      
      // Create sale record
      const newSale = new Sale({
        employeeId: targetEmployeeId,
        employeeName: employee.name,
        type,
        items: processedItems,
        totalAmount,
        notes: notes?.trim()
      })
      
      await newSale.save({ session })
      
      // Commit transaction
      await session.commitTransaction()
      
      return NextResponse.json({
        message: 'Sale recorded successfully',
        sale: newSale
      }, { status: 201 })
      
    } catch (error) {
      // Rollback transaction
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

