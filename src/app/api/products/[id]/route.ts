import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Product from '../../../../../lib/models/Product'
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
    const { name, price, stock, description, category } = await request.json()
    
    // Find the product to update
    const product = await Product.findById(id)
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Prepare update object
    const updateData: any = {}
    
    if (name !== undefined) {
      // Check if new name already exists (excluding current product)
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
    
    if (price !== undefined) {
      if (price < 0) {
        return NextResponse.json(
          { error: 'Price must be non-negative' },
          { status: 400 }
        )
      }
      updateData.price = Number(price)
    }
    
    if (stock !== undefined) {
      if (stock < 0) {
        return NextResponse.json(
          { error: 'Stock must be non-negative' },
          { status: 400 }
        )
      }
      updateData.stock = Number(stock)
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim()
    }
    
    if (category !== undefined) {
      updateData.category = category?.trim()
    }
    
    updateData.updatedAt = new Date()
    
    // Update product
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
    
    // Soft delete - set isActive to false
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

