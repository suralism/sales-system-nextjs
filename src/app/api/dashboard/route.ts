import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Sale from '../../../../lib/models/Sale'
import Product from '../../../../lib/models/Product'
import User from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
import mongoose from 'mongoose'
import { calculateCreditForUser, buildCreditSummary } from '../../../../lib/credit'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    
    const salesQuery: Record<string, unknown> = {}
    
    if (currentUser.role === 'employee') {
      // Employee can only see their own statistics
      salesQuery.employeeId = new mongoose.Types.ObjectId(currentUser.userId)
    }
    
    // Get statistics
    let creditSummary: ReturnType<typeof buildCreditSummary> | undefined
    if (currentUser.role === 'employee') {
      const [userRecord, creditUsed] = await Promise.all([
        User.findById(currentUser.userId).select('creditLimit').lean<{ creditLimit?: number }>(),
        calculateCreditForUser(currentUser.userId)
      ])
      creditSummary = buildCreditSummary(userRecord?.creditLimit ?? 0, creditUsed)
    }

    const [
      totalProducts,
      totalEmployees,
      todaySales,
      monthSales,
      totalSales,
      monthlyQuantityByCategory,
      monthlyProductDetails,
      recentSales,
      dailySalesRaw
    ] = await Promise.all([
      // Total active products
      Product.countDocuments({ isActive: true }),
      
      // Total active employees (admin sees all, employee sees 1 - themselves)
      currentUser.role === 'admin' 
        ? User.countDocuments({ isActive: true, role: 'employee' })
        : 1,
      
      // Today's sales
      Sale.aggregate([
        {
          $match: {
            ...salesQuery,
            saleDate: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // This month's sales
      Sale.aggregate([
        {
          $match: {
            ...salesQuery,
            saleDate: { $gte: monthStart, $lt: nextMonthStart }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Total sales
      Sale.aggregate([
        {
          $match: salesQuery
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Monthly quantity by product category
      Sale.aggregate([
        {
          $match: {
            ...salesQuery,
            saleDate: { $gte: monthStart, $lt: nextMonthStart }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $group: {
            _id: '$product.category',
            totalQuantity: {
              $sum: {
                $subtract: [
                  { $subtract: ['$items.withdrawal', '$items.return'] },
                  '$items.defective'
                ]
              }
            },
            totalValue: {
              $sum: {
                $multiply: [
                  {
                    $subtract: [
                      { $subtract: ['$items.withdrawal', '$items.return'] },
                      '$items.defective'
                    ]
                  },
                  '$items.pricePerUnit'
                ]
              }
            }
          }
        }
      ]),
      
      // Monthly product details breakdown
      Sale.aggregate([
        {
          $match: {
            ...salesQuery,
            saleDate: { $gte: monthStart, $lt: nextMonthStart }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $group: {
            _id: {
              productId: '$product._id',
              productName: '$product.name',
              category: '$product.category'
            },
            totalQuantity: {
              $sum: {
                $subtract: [
                  { $subtract: ['$items.withdrawal', '$items.return'] },
                  '$items.defective'
                ]
              }
            },
            totalValue: {
              $sum: {
                $multiply: [
                  {
                    $subtract: [
                      { $subtract: ['$items.withdrawal', '$items.return'] },
                      '$items.defective'
                    ]
                  },
                  '$items.pricePerUnit'
                ]
              }
            }
          }
        },
        {
          $match: {
            totalQuantity: { $gt: 0 }
          }
        },
        {
          $sort: {
            '_id.category': 1,
            totalQuantity: -1
          }
        }
      ]),
      
      // Recent sales (last 5)
      Sale.find(salesQuery)
        .sort({ saleDate: -1 })
        .limit(5)
        .lean(),

      // Daily sales for last 7 days
      Sale.aggregate([
        {
          $match: {
            ...salesQuery,
            saleDate: { $gte: weekStart, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' },
              day: { $dayOfMonth: '$saleDate' }
            },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
            '_id.day': 1
          }
        }
      ])
    ])
    
    // Format the response
    const todayStats = todaySales[0] || { totalAmount: 0, count: 0 }
    const monthStats = monthSales[0] || { totalAmount: 0, count: 0 }
    const totalStats = totalSales[0] || { totalAmount: 0, count: 0 }

    // Process monthly quantity by category
    const categoryStats = {
      สินค้าหลัก: { quantity: 0, value: 0 },
      สินค้าทางเลือก: { quantity: 0, value: 0 }
    }
    
    monthlyQuantityByCategory.forEach((item: { _id: string; totalQuantity: number; totalValue: number }) => {
      if (item._id === 'สินค้าหลัก' || item._id === 'สินค้าทางเลือก') {
        categoryStats[item._id] = {
          quantity: item.totalQuantity || 0,
          value: item.totalValue || 0
        }
      }
    })

    // Process product details by category
    const productDetails = {
      สินค้าหลัก: [] as { productName: string; quantity: number; value: number }[],
      สินค้าทางเลือก: [] as { productName: string; quantity: number; value: number }[]
    }
    
    monthlyProductDetails.forEach((item: { 
      _id: { productName: string; category: string }; 
      totalQuantity: number; 
      totalValue: number 
    }) => {
      if (item._id.category === 'สินค้าหลัก' || item._id.category === 'สินค้าทางเลือก') {
        productDetails[item._id.category].push({
          productName: item._id.productName,
          quantity: item.totalQuantity || 0,
          value: item.totalValue || 0
        })
      }
    })

    const dailySalesMap = new Map(
      dailySalesRaw.map(
        (item: { _id: { year: number; month: number; day: number }; totalAmount: number }) => {
          const date = new Date(
            item._id.year,
            item._id.month - 1,
            item._id.day
          )
            .toISOString()
            .split('T')[0]
          return [date, item.totalAmount]
        }
      )
    )

    const dailySales = [] as { date: string; totalAmount: number }[]
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const iso = date.toISOString().split('T')[0]
      dailySales.push({ date: iso, totalAmount: dailySalesMap.get(iso) || 0 })
    }

    const dashboardData = {
      summary: {
        totalProducts,
        totalEmployees,
        todaySalesAmount: todayStats.totalAmount,
        todaySalesCount: todayStats.count,
        monthlySalesAmount: monthStats.totalAmount,
        monthlySalesCount: monthStats.count,
        totalSalesAmount: totalStats.totalAmount,
        totalSalesCount: totalStats.count,
        // Monthly category statistics
        monthlyMainProductQuantity: categoryStats.สินค้าหลัก.quantity,
        monthlyMainProductValue: categoryStats.สินค้าหลัก.value,
        monthlyOptionalProductQuantity: categoryStats.สินค้าทางเลือก.quantity,
        monthlyOptionalProductValue: categoryStats.สินค้าทางเลือก.value
      },
      productDetails,
      recentSales,
      dailySales,
      credit: creditSummary
    }

    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

