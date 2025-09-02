import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import { Inventory, StockMovement, StockAlert } from '../../../../lib/models/Inventory'
import Product from '../../../../lib/models/Product'
import { getUserFromRequest } from '../../../../lib/auth'
import { apiRateLimit } from '../../../../lib/rateLimit'
import { AuthenticationError, AuthorizationError, ValidationError, asyncHandler } from '../../../../lib/errorHandler'
import { logger } from '../../../../lib/logger'
import { createValidationMiddleware } from '../../../../lib/validationMiddleware'

// Validation schemas
const stockAdjustmentSchema = {
  productId: {
    required: true,
    type: 'objectId' as const
  },
  quantity: {
    required: true,
    type: 'number' as const
  },
  reason: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 500
  },
  unitCost: {
    type: 'number' as const,
    min: 0
  }
}

// GET - Get inventory overview and stock levels
export const GET = asyncHandler(async function getInventoryHandler(request: NextRequest) {
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
  const lowStock = searchParams.get('lowStock') === 'true'
  const outOfStock = searchParams.get('outOfStock') === 'true'
  const needsReorder = searchParams.get('needsReorder') === 'true'
  const search = searchParams.get('search')
  
  // Build query
  const query: Record<string, unknown> = { isActive: true }
  
  if (lowStock) {
    query.$expr = { $lte: ['$currentStock', '$reorderPoint'] }
  }
  
  if (outOfStock) {
    query.currentStock = 0
  }
  
  if (needsReorder) {
    query.needsReorder = true
  }
  
  // Build aggregation pipeline
  const pipeline: any[] = [
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $match: {
        ...query,
        'product.isActive': true
      }
    }
  ]
  
  // Add search filter if provided
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'product.name': { $regex: search, $options: 'i' } },
          { 'product.sku': { $regex: search, $options: 'i' } },
          { 'product.barcode': { $regex: search, $options: 'i' } }
        ]
      }
    })
  }
  
  // Add pagination
  pipeline.push(
    { $sort: { 'product.name': 1 } },
    { $skip: skip },
    { $limit: limit }
  )
  
  // Execute aggregation
  const [inventory, totalCount] = await Promise.all([
    Inventory.aggregate(pipeline),
    Inventory.countDocuments({
      ...query,
      $expr: undefined // Remove $expr for count query
    })
  ])
  
  // Get summary statistics
  const stats = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        totalValue: { $sum: { $multiply: ['$currentStock', '$averageCost'] } },
        lowStockCount: {
          $sum: {
            $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0]
          }
        },
        outOfStockCount: {
          $sum: {
            $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
          }
        },
        needsReorderCount: {
          $sum: {
            $cond: ['$needsReorder', 1, 0]
          }
        }
      }
    }
  ])
  
  logger.logRequest('GET', '/api/inventory', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: { 
      resultCount: inventory.length,
      filters: { lowStock, outOfStock, needsReorder, search }
    }
  })
  
  return NextResponse.json({
    inventory,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    },
    stats: stats[0] || {
      totalProducts: 0,
      totalStock: 0,
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      needsReorderCount: 0
    }
  })
})

// POST - Create stock adjustment or movement
export const POST = asyncHandler(async function createStockMovementHandler(request: NextRequest) {
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
  
  // Check permissions - only admins can make stock adjustments
  if (currentUser.role !== 'admin') {
    throw new AuthorizationError('Admin access required for stock adjustments')
  }
  
  await connectDB()
  
  // Validate input
  const validateAdjustment = createValidationMiddleware(stockAdjustmentSchema)
  const validation = await validateAdjustment(request)
  
  if (!validation.isValid) {
    logger.warn('Stock adjustment validation failed', {
      errors: validation.errors,
      userId: currentUser.userId
    })
    throw new ValidationError('Validation failed: ' + validation.errors.join(', '))
  }
  
  const { productId, quantity, reason, unitCost } = validation.sanitizedData
  
  // Verify product exists
  const product = await Product.findById(productId)
  if (!product) {
    throw new ValidationError('Product not found')
  }
  
  // Get current inventory
  let inventory = await Inventory.findOne({ productId })
  if (!inventory) {
    inventory = new Inventory({
      productId,
      currentStock: 0,
      minStock: 0,
      reorderPoint: 10,
      reorderQuantity: 100
    })
    await inventory.save()
  }
  
  const previousStock = inventory.currentStock
  const quantityNum = Number(quantity)
  const movementType = quantityNum > 0 ? 'adjustment' : 'adjustment'
  
  // Create stock movement
  const movement = new StockMovement({
    productId,
    type: movementType,
    quantity: Math.abs(Number(quantity)),
    previousStock,
    newStock: previousStock + Number(quantity),
    unitCost: Number(unitCost) || inventory.averageCost || 0,
    totalCost: Math.abs(Number(quantity)) * (Number(unitCost) || inventory.averageCost || 0),
    reason: String(reason),
    userId: currentUser.userId,
    isApproved: true // Admin adjustments are auto-approved
  })
  
  // Update inventory
  if (Number(quantity) > 0) {
    inventory.addStock(Number(quantity), Number(unitCost) || 0)
  } else {
    const absQuantity = Math.abs(Number(quantity))
    if (absQuantity > inventory.currentStock) {
      throw new ValidationError('Cannot reduce stock below zero')
    }
    inventory.removeStock(absQuantity)
  }
  
  await Promise.all([
    movement.save(),
    inventory.save()
  ])
  
  // Check for stock alerts
  await checkAndCreateStockAlerts(String(productId), inventory.currentStock, inventory.reorderPoint)
  
  logger.info('Stock adjustment created', {
    movementId: movement._id.toString(),
    productId: String(productId),
    quantity: Number(quantity),
    previousStock,
    newStock: inventory.currentStock,
    userId: currentUser.userId
  })
  
  logger.logRequest('POST', '/api/inventory', 201, Date.now() - startTime, {
    userId: currentUser.userId,
    context: { 
      productId: String(productId),
      quantity: Number(quantity),
      movementId: movement._id.toString()
    }
  })
  
  return NextResponse.json({
    message: 'Stock adjustment created successfully',
    movement: {
      id: movement._id,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      reason: movement.reason,
      createdAt: movement.createdAt
    },
    inventory: {
      currentStock: inventory.currentStock,
      availableStock: inventory.availableStock,
      needsReorder: inventory.needsReorder
    }
  }, { status: 201 })
})

// Helper function to check and create stock alerts
async function checkAndCreateStockAlerts(productId: string, currentStock: number, reorderPoint: number) {
  try {
    // Clear existing alerts for this product
    await StockAlert.updateMany(
      { productId, isActive: true },
      { isActive: false }
    )
    
    let alertType: string | null = null
    let message = ''
    let severity: 'info' | 'warning' | 'critical' = 'info'
    
    if (currentStock === 0) {
      alertType = 'out_of_stock'
      message = 'Product is out of stock'
      severity = 'critical'
    } else if (currentStock <= reorderPoint) {
      alertType = 'low_stock'
      message = `Stock is low (${currentStock} remaining, reorder point: ${reorderPoint})`
      severity = 'warning'
    }
    
    if (alertType) {
      const alert = new StockAlert({
        productId,
        type: alertType,
        message,
        currentStock,
        threshold: reorderPoint,
        severity,
        isActive: true
      })
      
      await alert.save()
    }
  } catch (error) {
    logger.error('Failed to create stock alert', error instanceof Error ? error : new Error(String(error)), {
      productId,
      currentStock,
      reorderPoint
    })
  }
}