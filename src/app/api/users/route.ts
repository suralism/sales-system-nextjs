import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import User from '../../../../lib/models/User'
import { getUserFromRequest, hashPassword } from '../../../../lib/auth'

// GET - Get all users (admin only) or current user info
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
    
    let users
    
    if (currentUser.role === 'admin') {
      // Admin can see all users
      users = await User.find({ isActive: true })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean()
    } else {
      // Employee can only see their own info
      users = await User.findById(currentUser.userId)
        .select('-password')
        .lean()
      
      if (!users) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      users = [users] // Make it an array for consistency
    }
    
    return NextResponse.json({ users })
    
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new user (admin only)
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
    
    const { username, email, password, name, position, phone, role } = await request.json()
    
    // Validate required fields
    if (!username || !email || !password || !name || !position || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      position,
      phone,
      role: role || 'employee'
    })
    
    await newUser.save()
    
    // Return user data without password
    const userData = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      position: newUser.position,
      phone: newUser.phone,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt
    }
    
    return NextResponse.json({
      message: 'User created successfully',
      user: userData
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create user error:', error)
    
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

