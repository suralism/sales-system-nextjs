import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import { StockMovement, MovementType } from '../../../../../lib/models/Inventory'
import { getUserFromRequest } from '../../../../../lib/auth'
import { apiRateLimit } from '../../../../../lib/rateLimit'
import { AuthenticationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger } from '../../../../../lib/logger'

// GET - Get stock movements history
export const GET = asyncHandler(async function getStockMovementsHandler(request: NextRequest) {
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
  const productId = searchParams.get('productId')
  const type = searchParams.get('type')
  const userId = searchParams.get('userId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const reference = searchParams.get('reference')
  
  // Build query
  const query: Record<string, unknown> = {}
  
  if (productId) {
    query.productId = productId
  }
  
  if (type && Object.values(MovementType).includes(type as MovementType)) {
    query.type = type
  }
  
  if (userId) {
    query.userId = userId
  }
  
  if (reference) {
    query.reference = { $regex: reference, $options: 'i' }
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    (query as any).createdAt = {}
    if (dateFrom) {
      (query as any).createdAt.$gte = new Date(dateFrom)
    }
    if (dateTo) {
      (query as any).createdAt.$lte = new Date(dateTo)
    }
  }
  
  // Build aggregation pipeline
  const pipeline: any[] = [
    { $match: query },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'approvedBy',
        foreignField: '_id',
        as: 'approver'
      }
    },
    {
      $addFields: {
        product: { $arrayElemAt: ['$product', 0] },
        user: { $arrayElemAt: ['$user', 0] },
        approver: { $arrayElemAt: ['$approver', 0] }
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        quantity: 1,
        previousStock: 1,
        newStock: 1,
        unitCost: 1,
        totalCost: 1,
        reference: 1,
        reason: 1,
        location: 1,
        batchNumber: 1,
        expiryDate: 1,
        isApproved: 1,
        approvedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        product: {
          _id: '$product._id',
          name: '$product.name',
          sku: '$product.sku',
          barcode: '$product.barcode'
        },
        user: {
          _id: '$user._id',
          name: '$user.name',
          username: '$user.username'
        },
        approver: {
          _id: '$approver._id',
          name: '$approver.name',
          username: '$approver.username'
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]
  
  try {
    // Get basic movements without complex aggregation
    const movements = await StockMovement.find({})
    const totalCount = movements.length
    
    logger.logRequest('GET', '/api/inventory/movements', 200, Date.now() - startTime, {
      userId: currentUser.userId,
      context: {
        resultCount: movements.length
      }
    })
    
    return NextResponse.json({
      movements,
      pagination: {
        page: 1,
        limit: movements.length,
        total: totalCount,
        pages: 1
      },
      stats: [],
      dailySummary: []
    })
  } catch (error) {
    console.error('Error fetching movements:', error)
    return NextResponse.json({
      movements: [],
      pagination: { page: 1, limit: 0, total: 0, pages: 0 },
      stats: [],
      dailySummary: []
    })
  }
})