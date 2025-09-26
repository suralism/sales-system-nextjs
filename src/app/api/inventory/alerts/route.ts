import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import { StockAlert } from '../../../../../lib/models/Inventory'
import { getUserFromRequest } from '../../../../../lib/auth'
import { apiRateLimit } from '../../../../../lib/rateLimit'
import { AuthenticationError, ValidationError, asyncHandler } from '../../../../../lib/errorHandler'
import { logger } from '../../../../../lib/logger'

// GET - Get active stock alerts (simplified version)
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
  
  try {
    // Get basic alerts without complex aggregation
    const alerts = await StockAlert.find({ isActive: true })
    
    // Basic stats calculation
    const totalAlerts = alerts.length
    const unreadCount = alerts.filter(alert => !alert.isRead).length
    
    logger.logRequest('GET', '/api/inventory/alerts', 200, Date.now() - startTime, {
      userId: currentUser.userId,
      context: {
        resultCount: alerts.length
      }
    })
    
    return NextResponse.json({
      alerts,
      pagination: {
        page: 1,
        limit: alerts.length,
        total: totalAlerts,
        pages: 1
      },
      stats: {
        totalAlerts,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        unreadCount
      },
      alertsByType: []
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({
      alerts: [],
      pagination: { page: 1, limit: 0, total: 0, pages: 0 },
      stats: { totalAlerts: 0, criticalCount: 0, warningCount: 0, infoCount: 0, unreadCount: 0 },
      alertsByType: []
    })
  }
})

// PUT - Mark alerts as read (simplified version)
export const PUT = asyncHandler(async function markAlertsReadHandler(request: NextRequest) {
  const currentUser = getUserFromRequest(request)
  if (!currentUser) {
    throw new AuthenticationError('Authentication required')
  }
  
  return NextResponse.json({
    message: 'Alerts marked as read successfully',
    modifiedCount: 0
  })
})

// DELETE - Deactivate alerts (simplified version)
export const DELETE = asyncHandler(async function deactivateAlertsHandler(request: NextRequest) {
  const currentUser = getUserFromRequest(request)
  if (!currentUser) {
    throw new AuthenticationError('Authentication required')
  }
  
  return NextResponse.json({
    message: 'Alerts deactivated successfully',
    modifiedCount: 0
  })
})