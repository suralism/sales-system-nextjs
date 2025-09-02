import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number     // Time window in milliseconds
  maxRequests: number  // Max requests per window
  message?: string    // Custom error message
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RequestRecord {
  count: number
  resetTime: number
  blockedUntil?: number
}

// In-memory store (in production, use Redis or similar)
const requestStore = new Map<string, RequestRecord>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestStore.entries()) {
    if (record.resetTime < now && (!record.blockedUntil || record.blockedUntil < now)) {
      requestStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimitMiddleware(
    getKey: (request: NextRequest) => string = (req) => getClientIP(req)
  ) {
    return function rateLimit(request: NextRequest): NextResponse | null {
      const key = getKey(request)
      const now = Date.now()
      
      let record = requestStore.get(key)
      
      if (!record || record.resetTime < now) {
        // Reset window
        record = {
          count: 1,
          resetTime: now + config.windowMs
        }
        requestStore.set(key, record)
        return null // Allow request
      }
      
      // Check if currently blocked
      if (record.blockedUntil && record.blockedUntil > now) {
        return NextResponse.json(
          { 
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((record.blockedUntil - now) / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
            }
          }
        )
      }
      
      record.count++
      
      if (record.count > config.maxRequests) {
        // Block for additional time on excessive requests
        const blockDuration = Math.min(config.windowMs * 2, 300000) // Max 5 minutes
        record.blockedUntil = now + blockDuration
        
        return NextResponse.json(
          { 
            error: config.message || 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(blockDuration / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(blockDuration / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
            }
          }
        )
      }
      
      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - record.count)
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
      
      return null // Allow request
    }
  }
}

function getClientIP(request: NextRequest): string {
  // Try to get real IP from various headers (when behind proxy)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback when no headers are available
  return 'unknown'
}

// Pre-configured rate limiters for different endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.'
})

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 API calls per 15 minutes
  message: 'API rate limit exceeded. Please slow down your requests.'
})

export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for sensitive operations
  message: 'Rate limit exceeded for sensitive operation.'
})