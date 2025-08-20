import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/database'
import Sale from '../../../../lib/models/Sale'
import Product from '../../../../lib/models/Product'
import User from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
import mongoose from 'mongoose'

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

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    
    const salesQuery: Record<string, unknown> = { settled: true }
    
    if (currentUser.role === 'employee') {
      // Employee can only see their own statistics
      salesQuery.employeeId = new mongoose.Types.ObjectId(currentUser.userId)
    }
    
    // Get statistics
    const [
      totalProducts,
      totalEmployees,
      todaySales,
      monthSales,
      totalSales,
      recentSales
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
      
      // Recent sales (last 5)
      Sale.find(salesQuery)
        .sort({ saleDate: -1 })
        .limit(5)
        .lean()
    ])
    
    // Format the response
    const todayStats = todaySales[0] || { totalAmount: 0, count: 0 }
    const monthStats = monthSales[0] || { totalAmount: 0, count: 0 }
    const totalStats = totalSales[0] || { totalAmount: 0, count: 0 }
    
    const dashboardData = {
      summary: {
        totalProducts,
        totalEmployees,
        todaySalesAmount: todayStats.totalAmount,
        todaySalesCount: todayStats.count,
        monthlySalesAmount: monthStats.totalAmount,
        monthlySalesCount: monthStats.count,
        totalSalesAmount: totalStats.totalAmount,
        totalSalesCount: totalStats.count
      },
      recentSales
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

