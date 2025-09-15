import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Product from '../../../../lib/models/Product'
import { CATEGORY_TYPES } from '../../../../lib/constants'
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit
    const search = searchParams.get('search')?.toString().trim()

    // Include products that are active or don't have the isActive field (legacy data)
    const query: Record<string, unknown> = { isActive: { $ne: false } }
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
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

    const { name, prices, category } = await request.json()

    // Validate required fields
    if (!name || !prices || !Array.isArray(prices) || prices.length === 0 || !category) {
      return NextResponse.json(
        { error: 'Name, prices, and category are required' },
        { status: 400 }
      )
    }

    const trimmedCategory = category.trim()
    if (!CATEGORY_TYPES.includes(trimmedCategory)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }
    
    // Check if product name already exists
    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: { $ne: false }
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
      category: trimmedCategory
    })
    
    await newProduct.save()
    
    return NextResponse.json({
      message: 'Product created successfully',
      product: newProduct
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create product error:', error)
    
    if (error instanceof Error && error.name === 'ValidationError') {
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