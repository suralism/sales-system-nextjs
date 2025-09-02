import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Sale from '../../../../lib/models/Sale'
import { Inventory, StockMovement } from '../../../../lib/models/Inventory'
import { getUserFromRequest } from '../../../../lib/auth'
import { apiRateLimit } from '../../../../lib/rateLimit'
import { AuthenticationError, ValidationError, asyncHandler } from '../../../../lib/errorHandler'
import { logger } from '../../../../lib/logger'

// GET - Get comprehensive analytics and reports
export const GET = asyncHandler(async function getAnalyticsHandler(request: NextRequest) {
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
  const reportType = searchParams.get('type') || 'dashboard'
  const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  // Calculate date range
  const now = new Date()
  let dateFrom = new Date()
  let dateTo = new Date()
  
  if (startDate && endDate) {
    dateFrom = new Date(startDate)
    dateTo = new Date(endDate)
  } else {
    switch (period) {
      case '7d':
        dateFrom.setDate(now.getDate() - 7)
        break
      case '30d':
        dateFrom.setDate(now.getDate() - 30)
        break
      case '90d':
        dateFrom.setDate(now.getDate() - 90)
        break
      case '1y':
        dateFrom.setFullYear(now.getFullYear() - 1)
        break
      default:
        dateFrom.setDate(now.getDate() - 30)
    }
    dateTo = now
  }
  
  let reportData: Record<string, unknown> = {}
  
  switch (reportType) {
    case 'dashboard':
      reportData = await getDashboardAnalytics(dateFrom, dateTo)
      break
    case 'sales':
      reportData = await getSalesAnalytics(dateFrom, dateTo)
      break
    case 'inventory':
      reportData = await getInventoryAnalytics(dateFrom, dateTo)
      break
    case 'products':
      reportData = await getProductAnalytics(dateFrom, dateTo)
      break
    case 'performance':
      reportData = await getPerformanceAnalytics(dateFrom, dateTo)
      break
    case 'trends':
      reportData = await getTrendsAnalytics(dateFrom, dateTo)
      break
    default:
      throw new ValidationError('Invalid report type')
  }
  
  logger.logRequest('GET', '/api/analytics', 200, Date.now() - startTime, {
    userId: currentUser.userId,
    context: {
      reportType,
      period,
      dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
    }
  })
  
  return NextResponse.json({
    reportType,
    period,
    dateRange: { from: dateFrom, to: dateTo },
    data: reportData,
    generatedAt: new Date()
  })
})

// Dashboard Analytics - High-level overview
async function getDashboardAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    salesSummary,
    inventorySummary,
    topProducts,
    recentActivity,
    kpis
  ] = await Promise.all([
    getSalesSummary(dateFrom, dateTo),
    getInventorySummary(),
    getTopProducts(dateFrom, dateTo, 5),
    getRecentActivity(5),
    getKPIs(dateFrom, dateTo)
  ])
  
  return {
    salesSummary,
    inventorySummary,
    topProducts,
    recentActivity,
    kpis,
    alerts: await getSystemAlerts()
  }
}

// Sales Analytics - Detailed sales insights
async function getSalesAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    salesSummary,
    salesTrends,
    salesByCategory,
    salesByUser,
    salesByPayment,
    topCustomers
  ] = await Promise.all([
    getSalesSummary(dateFrom, dateTo),
    getSalesTrends(dateFrom, dateTo),
    getSalesByCategory(dateFrom, dateTo),
    getSalesByUser(dateFrom, dateTo),
    getSalesByPaymentMethod(dateFrom, dateTo),
    getTopCustomers(dateFrom, dateTo, 10)
  ])
  
  return {
    summary: salesSummary,
    trends: salesTrends,
    byCategory: salesByCategory,
    byUser: salesByUser,
    byPaymentMethod: salesByPayment,
    topCustomers
  }
}

// Inventory Analytics - Stock insights
async function getInventoryAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    inventorySummary,
    stockMovements,
    lowStockItems,
    fastMovingItems,
    slowMovingItems,
    inventoryValue
  ] = await Promise.all([
    getInventorySummary(),
    getStockMovementsSummary(dateFrom, dateTo),
    getLowStockItems(),
    getFastMovingItems(dateFrom, dateTo, 10),
    getSlowMovingItems(dateFrom, dateTo, 10),
    getInventoryValueAnalysis()
  ])
  
  return {
    summary: inventorySummary,
    movements: stockMovements,
    lowStock: lowStockItems,
    fastMoving: fastMovingItems,
    slowMoving: slowMovingItems,
    valueAnalysis: inventoryValue
  }
}

// Product Analytics - Product performance
async function getProductAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    topProducts,
    categoryPerformance,
    productProfitability,
    newProducts
  ] = await Promise.all([
    getTopProducts(dateFrom, dateTo, 20),
    getCategoryPerformance(dateFrom, dateTo),
    getProductProfitability(dateFrom, dateTo),
    getNewProducts(dateFrom, dateTo)
  ])
  
  return {
    topProducts,
    categoryPerformance,
    profitability: productProfitability,
    newProducts
  }
}

// Performance Analytics - Business performance metrics
async function getPerformanceAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    kpis,
    userPerformance,
    growthMetrics,
    efficiency
  ] = await Promise.all([
    getKPIs(dateFrom, dateTo),
    getUserPerformance(dateFrom, dateTo),
    getGrowthMetrics(dateFrom, dateTo),
    getEfficiencyMetrics(dateFrom, dateTo)
  ])
  
  return {
    kpis,
    userPerformance,
    growth: growthMetrics,
    efficiency
  }
}

// Trends Analytics - Time-based trends
async function getTrendsAnalytics(dateFrom: Date, dateTo: Date) {
  const [
    salesTrends,
    inventoryTrends,
    customerTrends,
    seasonalTrends
  ] = await Promise.all([
    getSalesTrends(dateFrom, dateTo),
    getInventoryTrends(dateFrom, dateTo),
    getCustomerTrends(dateFrom, dateTo),
    getSeasonalTrends(dateFrom, dateTo)
  ])
  
  return {
    sales: salesTrends,
    inventory: inventoryTrends,
    customers: customerTrends,
    seasonal: seasonalTrends
  }
}

// Helper functions for specific analytics

async function getSalesSummary(dateFrom: Date, dateTo: Date) {
  const result = await Sale.aggregate([
    {
      $match: {
        saleDate: { $gte: dateFrom, $lte: dateTo },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalTransactions: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' },
        totalItems: { $sum: { $sum: '$items.quantity' } }
      }
    }
  ])
  
  return result[0] || {
    totalSales: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    totalItems: 0
  }
}

async function getInventorySummary() {
  const result = await Inventory.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        totalValue: { $sum: { $multiply: ['$currentStock', '$averageCost'] } },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$currentStock', '$reorderPoint'] }, 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] }
        }
      }
    }
  ])
  
  return result[0] || {
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  }
}

async function getTopProducts(dateFrom: Date, dateTo: Date, limit: number) {
  return await Sale.aggregate([
    {
      $match: {
        saleDate: { $gte: dateFrom, $lte: dateTo },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        transactions: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        productId: '$_id',
        productName: '$product.name',
        sku: '$product.sku',
        category: '$product.category',
        totalQuantity: 1,
        totalRevenue: 1,
        transactions: 1,
        averagePrice: { $divide: ['$totalRevenue', '$totalQuantity'] }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit }
  ])
}

async function getKPIs(dateFrom: Date, dateTo: Date) {
  // Calculate previous period for comparison
  const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
  const prevDateFrom = new Date(dateFrom.getTime() - (daysDiff * 24 * 60 * 60 * 1000))
  const prevDateTo = new Date(dateFrom.getTime())
  
  const [currentPeriod, previousPeriod] = await Promise.all([
    getSalesSummary(dateFrom, dateTo),
    getSalesSummary(prevDateFrom, prevDateTo)
  ])
  
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }
  
  return {
    totalSales: {
      current: currentPeriod.totalSales,
      previous: previousPeriod.totalSales,
      growth: calculateGrowth(currentPeriod.totalSales, previousPeriod.totalSales)
    },
    totalTransactions: {
      current: currentPeriod.totalTransactions,
      previous: previousPeriod.totalTransactions,
      growth: calculateGrowth(currentPeriod.totalTransactions, previousPeriod.totalTransactions)
    },
    averageOrderValue: {
      current: currentPeriod.averageOrderValue,
      previous: previousPeriod.averageOrderValue,
      growth: calculateGrowth(currentPeriod.averageOrderValue, previousPeriod.averageOrderValue)
    }
  }
}

async function getSalesTrends(dateFrom: Date, dateTo: Date) {
  return await Sale.aggregate([
    {
      $match: {
        saleDate: { $gte: dateFrom, $lte: dateTo },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' }
        },
        dailySales: { $sum: '$totalAmount' },
        dailyTransactions: { $sum: 1 },
        dailyItems: { $sum: { $sum: '$items.quantity' } }
      }
    },
    {
      $addFields: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        }
      }
    },
    { $sort: { date: 1 } },
    {
      $project: {
        _id: 0,
        date: 1,
        sales: '$dailySales',
        transactions: '$dailyTransactions',
        items: '$dailyItems',
        averageOrderValue: { $divide: ['$dailySales', '$dailyTransactions'] }
      }
    }
  ])
}

async function getRecentActivity(limit: number) {
  const [recentSales, recentMovements] = await Promise.all([
    Sale.find({ status: { $ne: 'cancelled' } })
      .sort({ saleDate: -1 })
      .limit(limit)
      .populate('createdBy', 'name username')
      .lean(),
    StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productId', 'name sku')
      .populate('userId', 'name username')
      .lean()
  ])
  
  return {
    recentSales,
    recentMovements
  }
}

async function getSystemAlerts() {
  const [lowStock, outOfStock, expiringSoon] = await Promise.all([
    Inventory.countDocuments({ 
      $expr: { $lte: ['$currentStock', '$reorderPoint'] },
      isActive: true 
    }),
    Inventory.countDocuments({ 
      currentStock: 0,
      isActive: true 
    }),
    // This would need to be implemented based on product expiry tracking
    Promise.resolve(0)
  ])
  
  return {
    lowStock,
    outOfStock,
    expiringSoon
  }
}

// Additional helper functions would continue here...
async function getSalesByCategory(dateFrom: Date, dateTo: Date) {
  return await Sale.aggregate([
    {
      $match: {
        saleDate: { $gte: dateFrom, $lte: dateTo },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        totalQuantity: { $sum: '$items.quantity' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ])
}

async function getLowStockItems() {
  return await Inventory.find({
    $expr: { $lte: ['$currentStock', '$reorderPoint'] },
    isActive: true
  })
  .populate('productId', 'name sku category')
  .sort({ currentStock: 1 })
  .limit(20)
  .lean()
}

// More helper functions would be implemented as needed...