import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Product from '../../../../../lib/models/Product'
import { CATEGORY_TYPES } from '../../../../../lib/constants'
import { getUserFromRequest } from '../../../../../lib/auth'

// GET - Get specific product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const { id } = params
    
    const product = await Product.findById(id).lean()
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ product })
    
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update product (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    await connectDB()
    
    const { id } = params
    const { name, prices, category } = await request.json()
    
    const product = await Product.findById(id)
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const updateData: Record<string, unknown> = {}
    
    if (name !== undefined) {
      const existingProduct = await Product.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true,
        _id: { $ne: id }
      })
      
      if (existingProduct) {
        return NextResponse.json(
          { error: 'Product name already exists' },
          { status: 409 }
        )
      }
      
      updateData.name = name.trim()
    }
    
    if (prices !== undefined) {
      updateData.prices = prices
    }
    
    if (category !== undefined) {
      const trimmedCategory = category.trim()
      if (!CATEGORY_TYPES.includes(trimmedCategory)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        )
      }
      updateData.category = trimmedCategory
    }
    
    updateData.updatedAt = new Date()
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    
    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct
    })
    
  } catch (error) {
    console.error('Update product error:', error)
    
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

// DELETE - Delete product (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    await connectDB()
    
    const { id } = params
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    )
    
    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'Product deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}