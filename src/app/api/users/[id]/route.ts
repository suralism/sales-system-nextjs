import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User, { IUser } from '../../../../../lib/models/User'
import { getUserFromRequest, hashPassword } from '../../../../../lib/auth'
import { calculateCreditForUser, buildCreditSummary } from '../../../../../lib/credit'

// GET - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    // Check if user can access this data
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own data' },
        { status: 403 }
      )
    }
    
    const user = await User.findById<IUser>(id)
      .select('-password')
      .lean()

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const creditUsed = await calculateCreditForUser(user._id)
    const credit = buildCreditSummary(user.creditLimit ?? 0, creditUsed)

    return NextResponse.json({
      user: {
        ...user,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining
      }
    })
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
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
    const allowedUpdates: Record<string, unknown> = {}
    
    if (currentUser.role === 'admin') {
      // Admin can update all fields
      const { name, position, phone, email, role, password, priceLevel, creditLimit } = updateData

      if (name) allowedUpdates.name = name
      if (position) allowedUpdates.position = position
      if (phone) allowedUpdates.phone = phone
      if (email) allowedUpdates.email = email.toLowerCase()
      if (role) allowedUpdates.role = role
      if (priceLevel) allowedUpdates.priceLevel = priceLevel
      if (creditLimit !== undefined) {
        const parsedCredit = Number(creditLimit)
        if (Number.isNaN(parsedCredit) || parsedCredit < 0) {
          return NextResponse.json(
            { error: 'Credit limit must be a non-negative number' },
            { status: 400 }
          )
        }
        allowedUpdates.creditLimit = parsedCredit
      }
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

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updatedUserData = updatedUser.toObject()
    const creditUsed = await calculateCreditForUser(updatedUserData._id)
    const credit = buildCreditSummary(updatedUserData.creditLimit ?? 0, creditUsed)

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        ...updatedUserData,
        creditLimit: credit.creditLimit,
        creditUsed: credit.creditUsed,
        creditRemaining: credit.creditRemaining
      }
    })
    
  } catch (error) {
    console.error('Update user error:', error)
    
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

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    await connectDB()
    
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

