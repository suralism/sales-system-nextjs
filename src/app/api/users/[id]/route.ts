import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User from '../../../../../lib/models/User'
import { getUserFromRequest, hashPassword } from '../../../../../lib/auth'

// GET - Get specific user
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
    
    // Check if user can access this data
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own data' },
        { status: 403 }
      )
    }
    
    const user = await User.findById(id)
      .select('-password')
      .lean()
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ user })
    
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
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
    const updateData = await request.json()
    
    // Check if user can update this data
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own data' },
        { status: 403 }
      )
    }
    
    // Find the user to update
    const user = await User.findById(id)
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Prepare update object
    const allowedUpdates: any = {}
    
    if (currentUser.role === 'admin') {
      // Admin can update all fields
      const { name, position, phone, email, role, password } = updateData
      
      if (name) allowedUpdates.name = name
      if (position) allowedUpdates.position = position
      if (phone) allowedUpdates.phone = phone
      if (email) allowedUpdates.email = email.toLowerCase()
      if (role) allowedUpdates.role = role
      if (password) allowedUpdates.password = await hashPassword(password)
    } else {
      // Employee can only update their own personal info
      const { name, position, phone, email, password } = updateData
      
      if (name) allowedUpdates.name = name
      if (position) allowedUpdates.position = position
      if (phone) allowedUpdates.phone = phone
      if (email) allowedUpdates.email = email.toLowerCase()
      if (password) allowedUpdates.password = await hashPassword(password)
      // Role cannot be changed by employee
    }
    
    // Check for duplicate email if email is being updated
    if (allowedUpdates.email && allowedUpdates.email !== user.email) {
      const existingUser = await User.findOne({ 
        email: allowedUpdates.email,
        _id: { $ne: id }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }
    
    allowedUpdates.updatedAt = new Date()
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).select('-password')
    
    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    })
    
  } catch (error) {
    console.error('Update user error:', error)
    
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

// DELETE - Delete user (admin only)
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
    
    // Prevent admin from deleting themselves
    if (currentUser.userId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // Soft delete - set isActive to false
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('-password')
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'User deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

