import { NextRequest, NextResponse } from 'next/server'
import { SaleModel } from '../../../../lib/models/Sale'
import { ProductModel } from '../../../../lib/models/Product'
import { UserModel } from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
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
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - 6)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    
    // Get statistics
    let creditSummary: ReturnType<typeof buildCreditSummary> | undefined
    if (currentUser.role === 'employee') {
      const [userRecord, creditUsed] = await Promise.all([
        UserModel.findById(currentUser.userId),
        calculateCreditForUser(currentUser.userId)
      ])
      creditSummary = buildCreditSummary(userRecord?.creditLimit ?? 0, creditUsed)
    }

    // Get basic counts - simplified for now
    const [allProducts, allUsers, allSales] = await Promise.all([
      ProductModel.find({ isActive: true }),
      currentUser.role === 'admin' ? UserModel.find({ role: 'employee', isActive: true }) : [],
      currentUser.role === 'employee' 
        ? SaleModel.find({ employeeId: currentUser.userId })
        : SaleModel.find({})
    ])

    // Filter sales by date ranges
    const todayISO = today.toISOString()
    const tomorrowISO = tomorrow.toISOString()
    const monthStartISO = monthStart.toISOString()
    const nextMonthStartISO = nextMonthStart.toISOString()
    const weekStartISO = weekStart.toISOString()

    const todaySales = allSales.filter(sale => 
      sale.saleDate >= todayISO && sale.saleDate < tomorrowISO
    )
    
    const monthSales = allSales.filter(sale => 
      sale.saleDate >= monthStartISO && sale.saleDate < nextMonthStartISO
    )
    
    const weekSales = allSales.filter(sale => 
      sale.saleDate >= weekStartISO && sale.saleDate < tomorrowISO
    )

    // Calculate totals
    const todayStats = {
      totalAmount: todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      count: todaySales.length
    }
    
    const monthStats = {
      totalAmount: monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      count: monthSales.length
    }
    
    const totalStats = {
      totalAmount: allSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      count: allSales.length
    }

    // Calculate category statistics for the month
    const categoryStats = {
      'สินค้าหลัก': { quantity: 0, value: 0 },
      'สินค้าทางเลือก': { quantity: 0, value: 0 }
    }

    // Process monthly sales items to get category breakdown
    for (const sale of monthSales) {
      for (const item of sale.items) {
        const product = allProducts.find(p => p.id === item.productId)
        if (product) {
          const netQuantity = item.withdrawal - item.return - item.defective
          const value = netQuantity * item.pricePerUnit
          
          if (product.category === 'สินค้าหลัก' || product.category === 'สินค้าทางเลือก') {
            categoryStats[product.category].quantity += netQuantity
            categoryStats[product.category].value += value
          }
        }
      }
    }

    // Product details by category
    const productDetails = {
      'สินค้าหลัก': [] as { productName: string; quantity: number; value: number }[],
      'สินค้าทางเลือก': [] as { productName: string; quantity: number; value: number }[]
    }

    const productSummary = new Map<string, { name: string; category: string; quantity: number; value: number }>()
    
    for (const sale of monthSales) {
      for (const item of sale.items) {
        const product = allProducts.find(p => p.id === item.productId)
        if (product) {
          const netQuantity = item.withdrawal - item.return - item.defective
          const value = netQuantity * item.pricePerUnit
          
          const key = product.id
          const existing = productSummary.get(key)
          if (existing) {
            existing.quantity += netQuantity
            existing.value += value
          } else {
            productSummary.set(key, {
              name: product.name,
              category: product.category,
              quantity: netQuantity,
              value: value
            })
          }
        }
      }
    }

    // Group by category and filter positive quantities
    for (const [_, product] of productSummary) {
      if (product.quantity > 0 && (product.category === 'สินค้าหลัก' || product.category === 'สินค้าทางเลือก')) {
        productDetails[product.category].push({
          productName: product.name,
          quantity: product.quantity,
          value: product.value
        })
      }
    }

    // Sort product details by quantity
    productDetails['สินค้าหลัก'].sort((a, b) => b.quantity - a.quantity)
    productDetails['สินค้าทางเลือก'].sort((a, b) => b.quantity - a.quantity)

    // Recent sales (last 5)
    const recentSales = allSales
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 5)

    // Daily sales for last 7 days
    const dailySalesMap = new Map<string, number>()
    
    for (const sale of weekSales) {
      const date = sale.saleDate.split('T')[0]
      const existing = dailySalesMap.get(date) || 0
      dailySalesMap.set(date, existing + sale.totalAmount)
    }

    const dailySales = [] as { date: string; totalAmount: number }[]
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const iso = date.toISOString().split('T')[0]
      dailySales.push({ date: iso, totalAmount: dailySalesMap.get(iso) || 0 })
    }

    const dashboardData = {
      summary: {
        totalProducts: allProducts.length,
        totalEmployees: currentUser.role === 'admin' ? allUsers.length : 1,
        todaySalesAmount: todayStats.totalAmount,
        todaySalesCount: todayStats.count,
        monthlySalesAmount: monthStats.totalAmount,
        monthlySalesCount: monthStats.count,
        totalSalesAmount: totalStats.totalAmount,
        totalSalesCount: totalStats.count,
        // Monthly category statistics
        monthlyMainProductQuantity: categoryStats['สินค้าหลัก'].quantity,
        monthlyMainProductValue: categoryStats['สินค้าหลัก'].value,
        monthlyOptionalProductQuantity: categoryStats['สินค้าทางเลือก'].quantity,
        monthlyOptionalProductValue: categoryStats['สินค้าทางเลือก'].value
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

