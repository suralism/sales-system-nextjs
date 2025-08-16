import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Product from '../../../../lib/models/Product'
import { getUserFromRequest } from '../../../../lib/auth'

// GET - Get all products
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
    
    const products = await Product.find({ isActive: true })
      .sort({ name: 1 })
      .lean()
    
    return NextResponse.json({ products })
    
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    await connectDB()
    
    const { name, prices, stock, description, category } = await request.json()
    
    // Validate required fields
    if (!name || !prices || !Array.isArray(prices) || prices.length === 0 || stock === undefined) {
      return NextResponse.json(
        { error: 'Name, prices, and stock are required' },
        { status: 400 }
      )
    }
    
    // Validate stock
    if (stock < 0) {
      return NextResponse.json(
        { error: 'Stock must be non-negative' },
        { status: 400 }
      )
    }
    
    // Check if product name already exists
    const existingProduct = await Product.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    })
    
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product name already exists' },
        { status: 409 }
      )
    }
    
    // Create new product
    const newProduct = new Product({
      name: name.trim(),
      prices,
      stock: Number(stock),
      description: description?.trim(),
      category: category?.trim()
    })
    
    await newProduct.save()
    
    return NextResponse.json({
      message: 'Product created successfully',
      product: newProduct
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create product error:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}