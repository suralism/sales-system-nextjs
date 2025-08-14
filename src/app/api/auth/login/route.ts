import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import User from '../../../../../lib/models/User'
import { comparePassword, generateToken } from '../../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    // Find user by username
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }
    
    // Check password
    const isPasswordValid = await comparePassword(password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }
    
    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name
    })
    
    // Create response with user data (excluding password)
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      position: user.position,
      phone: user.phone,
      role: user.role
    }
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: userData,
      token
    })
    
    // Set token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    })
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

