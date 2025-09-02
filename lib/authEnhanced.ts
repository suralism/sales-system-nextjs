import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'

// Validate JWT secrets
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key' || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long and properly configured')
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
  // Token metadata
  tokenId: string
  issuedAt: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  type: 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenId: string
}

// In-memory token store (in production, use Redis or database)
const activeTokens = new Map<string, {
  userId: string
  issuedAt: number
  expiresAt: number
  revoked?: boolean
}>()

// Clean up expired tokens
setInterval(() => {
  const now = Date.now()
  for (const [tokenId, token] of activeTokens.entries()) {
    if (token.expiresAt < now || token.revoked) {
      activeTokens.delete(tokenId)
    }
  }
}, 60000) // Clean every minute

export function generateTokenPair(payload: Omit<TokenPayload, 'tokenId' | 'issuedAt'>): TokenPair {
  const tokenId = crypto.randomBytes(32).toString('hex')
  const issuedAt = Math.floor(Date.now() / 1000)
  
  const accessTokenPayload: TokenPayload = {
    ...payload,
    tokenId,
    issuedAt
  }
  
  const refreshTokenPayload: RefreshTokenPayload = {
    userId: payload.userId,
    tokenId,
    type: 'refresh'
  }
  
  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET!, { 
    expiresIn: '15m' // Short-lived access token
  })
  
  const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: '7d' // Long-lived refresh token
  })
  
  // Store token metadata
  activeTokens.set(tokenId, {
    userId: payload.userId,
    issuedAt: issuedAt * 1000,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    revoked: false
  })
  
  return { accessToken, refreshToken, tokenId }
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload
    
    // Check if token is still active
    const tokenInfo = activeTokens.get(decoded.tokenId)
    if (!tokenInfo || tokenInfo.revoked || tokenInfo.userId !== decoded.userId) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload
    
    // Check if token is still active
    const tokenInfo = activeTokens.get(decoded.tokenId)
    if (!tokenInfo || tokenInfo.revoked || tokenInfo.userId !== decoded.userId) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}

export function refreshAccessToken(refreshToken: string, userPayload: Omit<TokenPayload, 'tokenId' | 'issuedAt'>): TokenPair | null {
  const refreshPayload = verifyRefreshToken(refreshToken)
  if (!refreshPayload || refreshPayload.userId !== userPayload.userId) {
    return null
  }
  
  // Revoke old token
  revokeToken(refreshPayload.tokenId)
  
  // Generate new token pair
  return generateTokenPair(userPayload)
}

export function revokeToken(tokenId: string): boolean {
  const tokenInfo = activeTokens.get(tokenId)
  if (tokenInfo) {
    tokenInfo.revoked = true
    return true
  }
  return false
}

export function revokeAllUserTokens(userId: string): number {
  let count = 0
  for (const [tokenId, token] of activeTokens.entries()) {
    if (token.userId === userId && !token.revoked) {
      token.revoked = true
      count++
    }
  }
  return count
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check for token in cookies
  const token = request.cookies.get('accessToken')?.value
  return token || null
}

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get('refreshToken')?.value || null
}

export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  
  return verifyAccessToken(token)
}

// Password strength validation
export function validatePasswordStrength(password: string): { 
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Check for common weak patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i
  ]
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns')
      break
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Session security helpers
export function createSecureSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashSessionData(data: string): string {
  return crypto.createHash('sha256').update(data + JWT_SECRET!).digest('hex')
}