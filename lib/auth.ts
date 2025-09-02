import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET

// Validate JWT secret on startup
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key' || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long and not use the default value. ' +
    'Please set a secure JWT_SECRET in your .env.local file.'
  )
}

export interface TokenPayload {
  userId: string
  username: string
  role: 'admin' | 'employee'
  name: string
  // Impersonation fields
  originalAdminId?: string
  originalAdminName?: string
  isImpersonation?: boolean
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '24h' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as TokenPayload
  } catch (error) {
    // Log verification failures for security monitoring
    if (process.env.NODE_ENV === 'development') {
      console.debug('Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    }
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false
  }
  return bcrypt.compare(password, hashedPassword)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Check for token in cookies (legacy support)
  const legacyToken = request.cookies.get('token')?.value
  if (legacyToken) {
    return legacyToken
  }
  
  // Check for new access token format
  const accessToken = request.cookies.get('accessToken')?.value
  return accessToken || null
}

export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  
  return verifyToken(token)
}

