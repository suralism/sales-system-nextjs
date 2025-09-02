import { NextResponse } from 'next/server'
import { logger } from './logger'

// Custom error types
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code?: string

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message)
    
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  public readonly field?: string
  public readonly value?: unknown

  constructor(message: string, field?: string, value?: unknown) {
    super(message, 400, true, 'VALIDATION_ERROR')
    this.field = field
    this.value = value
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTH_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR')
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, true, 'RATE_LIMIT_ERROR')
    this.retryAfter = retryAfter
  }
}

// Error handler function
export function handleError(error: unknown, context?: Record<string, unknown>): NextResponse {
  // Generate error ID for tracking
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2)
  
  let statusCode = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_ERROR'
  let details: Record<string, unknown> = {}

  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
    code = error.code || 'APP_ERROR'
    
    // Add specific error details
    if (error instanceof ValidationError) {
      details = {
        field: error.field,
        value: error.value
      }
    } else if (error instanceof RateLimitError) {
      details = {
        retryAfter: error.retryAfter
      }
    }
  } else if (error instanceof Error) {
    // Handle known JavaScript errors
    if (error.name === 'ValidationError') {
      statusCode = 400
      message = 'Validation failed'
      code = 'VALIDATION_ERROR'
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      statusCode = 500
      message = 'Database operation failed'
      code = 'DATABASE_ERROR'
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401
      message = 'Invalid token'
      code = 'TOKEN_ERROR'
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401
      message = 'Token expired'
      code = 'TOKEN_EXPIRED'
    }
  }

  // Log the error
  const logContext = {
    errorId,
    statusCode,
    code,
    ...context
  }

  if (statusCode >= 500) {
    logger.error(`Error ${errorId}: ${message}`, error instanceof Error ? error : new Error(String(error)), logContext)
  } else if (statusCode >= 400) {
    logger.warn(`Client error ${errorId}: ${message}`, logContext)
  }

  // Prepare response
  const responseBody: Record<string, unknown> = {
    error: message,
    code,
    errorId
  }

  // Add details in development or for client errors
  if (process.env.NODE_ENV === 'development' || statusCode < 500) {
    responseBody.details = details
  }

  // Add retry information for rate limit errors
  if (statusCode === 429 && details.retryAfter) {
    return NextResponse.json(responseBody, {
      status: statusCode,
      headers: {
        'Retry-After': String(details.retryAfter)
      }
    })
  }

  return NextResponse.json(responseBody, { status: statusCode })
}

// Async error wrapper for API routes
export function asyncHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleError(error, {
        handler: fn.name,
        args: args.length
      })
    }
  }
}

// Input validation helper
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && (data[field] as string).trim() === '')) {
      throw new ValidationError(`${field} is required`, field, data[field])
    }
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email', email)
  }
}

export function validateObjectId(id: string, fieldName: string = 'id'): void {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/
  if (!objectIdRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName, id)
  }
}

export function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  fieldName: string
): T {
  if (!validValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`,
      fieldName,
      value
    )
  }
  return value as T
}

// Security validation helpers
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

export function validateCSRF(token: string, expected: string): void {
  if (!token || token !== expected) {
    throw new AuthenticationError('Invalid CSRF token')
  }
}

// Database error helper
export function handleDatabaseError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error) {
    const mongoError = error as { code: number; keyPattern?: Record<string, unknown> }
    
    if (mongoError.code === 11000) {
      // Duplicate key error
      const field = mongoError.keyPattern ? Object.keys(mongoError.keyPattern)[0] : 'field'
      throw new ConflictError(`${field} already exists`)
    }
  }
  
  throw new AppError('Database operation failed', 500, true, 'DATABASE_ERROR')
}

// Request validation middleware helper
export interface RequestValidation {
  body?: (data: unknown) => void
  params?: (params: Record<string, string>) => void
  query?: (query: Record<string, string | string[]>) => void
}

export function validateRequest(validation: RequestValidation) {
  return async (request: Request, params?: Record<string, string>) => {
    try {
      if (validation.body) {
        const body = await request.json()
        validation.body(body)
      }
      
      if (validation.params && params) {
        validation.params(params)
      }
      
      if (validation.query) {
        const url = new URL(request.url)
        const queryParams: Record<string, string | string[]> = {}
        for (const [key, value] of url.searchParams.entries()) {
          if (queryParams[key]) {
            if (Array.isArray(queryParams[key])) {
              (queryParams[key] as string[]).push(value)
            } else {
              queryParams[key] = [queryParams[key] as string, value]
            }
          } else {
            queryParams[key] = value
          }
        }
        validation.query(queryParams)
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError('Invalid request format')
    }
  }
}