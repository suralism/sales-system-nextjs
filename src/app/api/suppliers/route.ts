import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import { Supplier } from '../../../../lib/models/Inventory'
import { getUserFromRequest } from '../../../../lib/auth'
import { apiRateLimit } from '../../../../lib/rateLimit'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, asyncHandler } from '../../../../lib/errorHandler'
import { logger } from '../../../../lib/logger'
import { createValidationMiddleware } from '../../../../lib/validationMiddleware'

// Validation schema for supplier
const supplierValidationSchema = {
  name: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 200
  },
  code: {
    type: 'string' as const,
    maxLength: 50
  },
  contactPerson: {
    type: 'string' as const,
    maxLength: 100
  },
  email: {
    type: 'email' as const
  },
  phone: {
    type: 'string' as const
  },
  paymentTerms: {
    type: 'string' as const,
    enum: ['cash', 'net7', 'net15', 'net30', 'net60'] as const
  },
  currency: {
    type: 'string' as const
  },
  taxId: {
    type: 'string' as const
  },
  rating: {
    type: 'number' as const,
    min: 1,
    max: 5
  },
  notes: {
    type: 'string' as const,
    maxLength: 1000
  }
}

// GET - Get suppliers list
export const GET = asyncHandler(async function getSuppliersHandler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimit()(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  const startTime = Date.now()
  
  const currentUser = getUserFromRequest(request)
  if (!currentUser) {
    throw new AuthenticationError('Authentication required')
  }
  
  await connectDB()
  
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit
  
  // Filters
  const search = searchParams.get('search')
  const isActive = searchParams.get('isActive') !== 'false' // Default to active suppliers
  const paymentTerms = searchParams.get('paymentTerms')
  const minRating = searchParams.get('minRating')
  
  // Build query
  const query: Record<string, unknown> = { isActive }
  
  if (paymentTerms) {
    query.paymentTerms = paymentTerms
  }
  
  if (minRating) {
    query.rating = { $gte: parseInt(minRating, 10) }
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }
  
  // Execute queries
  const [suppliers, totalCount] = await Promise.all([
    Supplier.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Supplier.countDocuments(query)
  ])
  
  // Get supplier statistics
  const stats = await Supplier.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalSuppliers: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        paymentTermsBreakdown: {
          $push: '$paymentTerms'
        },
        topRatedCount: {
          $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] }
        }
      }
    }
  ])
  
  // Get payment terms breakdown
  const paymentTermsStats = await Supplier.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$paymentTerms',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ])
  
  logger.logRequest('GET', '/api/suppliers', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      resultCount: suppliers.length,
      filters: { search, isActive, paymentTerms, minRating }
    }
  })
  
  return NextResponse.json({
    suppliers,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    },
    stats: stats[0] || {
      totalSuppliers: 0,
      averageRating: 0,
      topRatedCount: 0
    },
    paymentTermsStats
  })
})

// POST - Create new supplier
export const POST = asyncHandler(async function createSupplierHandler(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = apiRateLimit()(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  const startTime = Date.now()
  
  const currentUser = getUserFromRequest(request)
  if (!currentUser) {
    throw new AuthenticationError('Authentication required')
  }
  
  // Check permissions - only admins can create suppliers
  if (currentUser.role !== 'admin') {
    throw new AuthorizationError('Admin access required to create suppliers')
  }
  
  await connectDB()
  
  // Validate input
  const validateSupplier = createValidationMiddleware(supplierValidationSchema)
  const validation = await validateSupplier(request)
  
  if (!validation.isValid) {
    logger.warn('Supplier creation validation failed', {
      errors: validation.errors,
      userId: currentUser.userId
    })
    throw new ValidationError('Validation failed: ' + validation.errors.join(', '))
  }
  
  const supplierData = validation.sanitizedData
  
  // Check for duplicate supplier code if provided
  if (supplierData.code) {
    const existingSupplier = await Supplier.findOne({ 
      code: String(supplierData.code).trim(),
      isActive: true 
    })
    
    if (existingSupplier) {
      throw new ConflictError('Supplier code already exists')
    }
  }
  
  // Create supplier
  const supplier = new Supplier({
    name: String(supplierData.name).trim(),
    code: supplierData.code ? String(supplierData.code).trim() : undefined,
    contactPerson: supplierData.contactPerson ? String(supplierData.contactPerson).trim() : undefined,
    email: supplierData.email ? String(supplierData.email).toLowerCase().trim() : undefined,
    phone: supplierData.phone ? String(supplierData.phone).trim() : undefined,
    paymentTerms: supplierData.paymentTerms || 'net30',
    currency: supplierData.currency || 'THB',
    taxId: supplierData.taxId ? String(supplierData.taxId).trim() : undefined,
    rating: supplierData.rating ? Number(supplierData.rating) : 3,
    notes: supplierData.notes ? String(supplierData.notes).trim() : undefined,
    isActive: true
  })
  
  await supplier.save()
  
  logger.info('Supplier created successfully', {
    supplierId: supplier._id.toString(),
    supplierName: supplier.name,
    supplierCode: supplier.code,
    userId: currentUser.userId
  })
  
  logger.logRequest('POST', '/api/suppliers', 201, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name
    }
  })
  
  return NextResponse.json({
    message: 'Supplier created successfully',
    supplier: {
      id: supplier._id,
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      paymentTerms: supplier.paymentTerms,
      currency: supplier.currency,
      taxId: supplier.taxId,
      rating: supplier.rating,
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt
    }
  }, { status: 201 })
})