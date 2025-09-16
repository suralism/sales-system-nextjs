import { NextRequest } from 'next/server'
import { ValidationError, validateRequired, validateEmail, validateObjectId, validateEnum } from './errorHandler'

// Validation schema types
export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'objectId'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  enum?: readonly string[]
  pattern?: RegExp
  custom?: (value: unknown) => boolean | string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

// Input sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return String(input)
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function sanitizeNumber(input: unknown): number | null {
  const num = Number(input)
  return isNaN(num) ? null : num
}

export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') return input
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1'
  }
  return Boolean(input)
}

// Main validation function
export function validateInput(data: Record<string, unknown>, schema: ValidationSchema): string[] {
  const errors: string[] = []
  
  // Check required fields
  const requiredFields = Object.entries(schema)
    .filter(([, rule]) => rule.required)
    .map(([field]) => field)
  
  try {
    validateRequired(data, requiredFields)
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message)
    }
  }
  
  // Validate each field
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field]
    
    // Skip validation if field is not required and value is undefined/null
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue
    }
    
    try {
      // Type validation
      switch (rule.type) {
        case 'email':
          if (value) validateEmail(String(value))
          break
          
        case 'objectId':
          if (value) validateObjectId(String(value), field)
          break
          
        case 'string':
          if (value !== undefined && typeof value !== 'string') {
            errors.push(`${field} must be a string`)
          }
          break
          
        case 'number':
          if (value !== undefined && typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`${field} must be a number`)
          }
          break
          
        case 'boolean':
          if (value !== undefined && typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`)
          }
          break
          
        case 'array':
          if (value !== undefined && !Array.isArray(value)) {
            errors.push(`${field} must be an array`)
          }
          break
          
        case 'object':
          if (value !== undefined && (typeof value !== 'object' || Array.isArray(value))) {
            errors.push(`${field} must be an object`)
          }
          break
      }
      
      // Length validation for strings
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters long`)
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be at most ${rule.maxLength} characters long`)
        }
      }
      
      // Numeric range validation
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`)
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${field} must be at most ${rule.max}`)
        }
      }
      
      // Enum validation
      if (rule.enum && value !== undefined && value !== null) {
        try {
          validateEnum(String(value), rule.enum, field)
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error.message)
          }
        }
      }
      
      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`)
        }
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value)
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `${field} is invalid`)
        }
      }
      
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message)
      } else {
        errors.push(`Validation error for ${field}`)
      }
    }
  }
  
  return errors
}

// Sanitization function
export function sanitizeInput(data: Record<string, unknown>, schema: ValidationSchema): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field]
    
    if (value === undefined || value === null) {
      sanitized[field] = value
      continue
    }
    
    switch (rule.type) {
      case 'string':
      case 'email':
        sanitized[field] = sanitizeString(value as string)
        break
        
      case 'number':
        sanitized[field] = sanitizeNumber(value)
        break
        
      case 'boolean':
        sanitized[field] = sanitizeBoolean(value)
        break
        
      case 'objectId':
        sanitized[field] = sanitizeString(value as string)
        break
        
      default:
        sanitized[field] = value
    }
  }
  
  return sanitized
}

// Middleware factory for API routes
export function createValidationMiddleware(schema: ValidationSchema) {
  return async function validationMiddleware(request: NextRequest): Promise<{
    isValid: boolean
    errors: string[]
    sanitizedData: Record<string, unknown>
  }> {
    try {
      const body = await request.json()
      
      // Validate input
      const errors = validateInput(body, schema)
      
      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          sanitizedData: {}
        }
      }
      
      // Sanitize input
      const sanitizedData = sanitizeInput(body, schema)
      
      return {
        isValid: true,
        errors: [],
        sanitizedData
      }
      
    } catch {
      return {
        isValid: false,
        errors: ['Invalid JSON in request body'],
        sanitizedData: {}
      }
    }
  }
}

// Common validation schemas
export const userValidationSchema: ValidationSchema = {
  username: {
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/
  },
  email: {
    required: true,
    type: 'email'
  },
  password: {
    required: true,
    type: 'string',
    minLength: 8,
    maxLength: 128,
    custom: (value) => {
      const stringValue = String(value)
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(stringValue)) {
        return 'Password must contain at least one lowercase, one uppercase letter, and one number'
      }
      return true
    }
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  position: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  phone: {
    required: true,
    type: 'string',
    pattern: /^\+?[\d\s\-()]+$/
  },
  role: {
    required: true,
    type: 'string',
    enum: ['admin', 'employee'] as const
  },
  priceLevel: {
    required: true,
    type: 'string',
    enum: ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'] as const
  },
  creditLimit: {
    type: 'number',
    min: 0
  }
}

export const loginValidationSchema: ValidationSchema = {
  username: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50
  },
  password: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 128
  }
}

export const productValidationSchema: ValidationSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  price: {
    required: true,
    type: 'number',
    min: 0
  },
  category: {
    type: 'string',
    maxLength: 100
  },
  description: {
    type: 'string',
    maxLength: 1000
  },
  stock: {
    type: 'number',
    min: 0
  }
}

export const saleValidationSchema: ValidationSchema = {
  customerId: {
    type: 'objectId'
  },
  items: {
    required: true,
    type: 'array'
  },
  totalAmount: {
    required: true,
    type: 'number',
    min: 0
  },
  paymentMethod: {
    required: true,
    type: 'string',
    enum: ['cash', 'card', 'transfer'] as const
  }
}