import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import { StockAlert } from '../../../../../lib/models/Inventory'
import { getUserFromRequest } from '../../../../../lib/auth'
import { apiRateLimit } from '../../../../../lib/rateLimit'
import { AuthenticationError, ValidationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger } from '../../../../../lib/logger'

// GET - Get active stock alerts
export const GET = asyncHandler(async function getStockAlertsHandler(request: NextRequest) {
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
  const type = searchParams.get('type')
  const severity = searchParams.get('severity')
  const isRead = searchParams.get('isRead')
  const isActive = searchParams.get('isActive') !== 'false' // Default to active alerts
  
  // Build query
  const query: Record<string, unknown> = { isActive }
  
  if (type) {
    query.type = type
  }
  
  if (severity) {
    query.severity = severity
  }
  
  if (isRead !== null) {
    query.isRead = isRead === 'true'
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
        from: 'inventories',
        localField: 'productId',
        foreignField: 'productId',
        as: 'inventory'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'readBy',
        foreignField: '_id',
        as: 'reader'
      }
    },
    {
      $addFields: {
        product: { $arrayElemAt: ['$product', 0] },
        inventory: { $arrayElemAt: ['$inventory', 0] },
        reader: { $arrayElemAt: ['$reader', 0] }
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        message: 1,
        currentStock: 1,
        threshold: 1,
        severity: 1,
        isRead: 1,
        readAt: 1,
        createdAt: 1,
        product: {
          _id: '$product._id',
          name: '$product.name',
          sku: '$product.sku',
          barcode: '$product.barcode'
        },
        inventory: {
          currentStock: '$inventory.currentStock',
          reorderPoint: '$inventory.reorderPoint',
          reorderQuantity: '$inventory.reorderQuantity'
        },
        reader: {
          _id: '$reader._id',
          name: '$reader.name'
        }
      }
    },
    { $sort: { severity: 1, createdAt: -1 } }, // Critical first, then by date
    { $skip: skip },
    { $limit: limit }
  ]
  
  // Execute queries
  const [alerts, totalCount] = await Promise.all([
    StockAlert.aggregate(pipeline),
    StockAlert.countDocuments(query)
  ])
  
  // Get alert statistics
  const stats = await StockAlert.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        criticalCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        warningCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
        },
        infoCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'info'] }, 1, 0] }
        },
        unreadCount: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        }
      }
    }
  ])
  
  // Get alerts by type
  const alertsByType = await StockAlert.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ])
  
  logger.logRequest('GET', '/api/inventory/alerts', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      resultCount: alerts.length,
      filters: { type, severity, isRead, isActive }
    }
  })
  
  return NextResponse.json({
    alerts,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    },
    stats: stats[0] || {
      totalAlerts: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      unreadCount: 0
    },
    alertsByType
  })
})

// PUT - Mark alerts as read
export const PUT = asyncHandler(async function markAlertsReadHandler(request: NextRequest) {
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
  
  const body = await request.json()
  const { alertIds, markAllAsRead } = body
  
  const updateQuery: Record<string, unknown> = {
    isRead: true,
    readBy: currentUser.userId,
    readAt: new Date()
  }
  
  let filter: Record<string, unknown>
  
  if (markAllAsRead) {
    // Mark all unread alerts as read
    filter = { isRead: false, isActive: true }
  } else if (alertIds && Array.isArray(alertIds)) {
    // Mark specific alerts as read
    if (alertIds.length === 0) {
      throw new ValidationError('Alert IDs array cannot be empty')
    }
    filter = { _id: { $in: alertIds }, isActive: true }
  } else {
    throw new ValidationError('Either alertIds array or markAllAsRead flag is required')
  }
  
  const result = await StockAlert.updateMany(filter, updateQuery)
  
  logger.info('Stock alerts marked as read', {
    userId: currentUser.userId,
    markAllAsRead: !!markAllAsRead,
    alertIds: alertIds || [],
    modifiedCount: result.modifiedCount
  })
  
  logger.logRequest('PUT', '/api/inventory/alerts', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      markAllAsRead: !!markAllAsRead,
      alertCount: alertIds?.length || 0,
      modifiedCount: result.modifiedCount
    }
  })
  
  return NextResponse.json({
    message: 'Alerts marked as read successfully',
    modifiedCount: result.modifiedCount
  })
})

// DELETE - Deactivate alerts (soft delete)
export const DELETE = asyncHandler(async function deactivateAlertsHandler(request: NextRequest) {
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
  const alertIds = searchParams.get('ids')?.split(',') || []
  const type = searchParams.get('type')
  const productId = searchParams.get('productId')
  
  if (!alertIds.length && !type && !productId) {
    throw new ValidationError('Alert IDs, type, or productId is required')
  }
  
  let filter: Record<string, unknown> = { isActive: true }
  
  if (alertIds.length > 0) {
    filter = { ...filter, _id: { $in: alertIds } }
  }
  
  if (type) {
    filter = { ...filter, type }
  }
  
  if (productId) {
    filter = { ...filter, productId }
  }
  
  const result = await StockAlert.updateMany(filter, {
    isActive: false,
    readBy: currentUser.userId,
    readAt: new Date()
  })
  
  logger.info('Stock alerts deactivated', {
    userId: currentUser.userId,
    filter,
    modifiedCount: result.modifiedCount
  })
  
  logger.logRequest('DELETE', '/api/inventory/alerts', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      alertIds: alertIds,
      type,
      productId,
      modifiedCount: result.modifiedCount
    }
  })
  
  return NextResponse.json({
    message: 'Alerts deactivated successfully',
    modifiedCount: result.modifiedCount
  })
})