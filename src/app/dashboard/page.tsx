'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import DailySalesChart from '@/components/DailySalesChart'
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/Card'

interface RecentSale {
  employeeName: string
  type: string
  saleDate: string
  totalAmount: number
  items: unknown[]
}

interface DailySale {
  date: string
  totalAmount: number
}

interface DashboardData {
  summary: {
    todaySalesAmount: number
    todaySalesCount: number
    monthlySalesAmount: number
    monthlySalesCount: number
    totalSalesAmount: number
    totalSalesCount: number
    monthlyMainProductQuantity: number
    monthlyMainProductValue: number
    monthlyOptionalProductQuantity: number
    monthlyOptionalProductValue: number
  }
  productDetails: {
    สินค้าหลัก: { productName: string; quantity: number; value: number }[]
    สินค้าทางเลือก: { productName: string; quantity: number; value: number }[]
  }
  recentSales: RecentSale[]
  dailySales: DailySale[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">แดชบอร์ด</h1>
            <p className="text-gray-600 mt-2">ภาพรวมของระบบขายสินค้า</p>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Today Sales */}
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-blue-700">ยอดขายวันนี้</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.todaySalesAmount || 0)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">{data?.summary.todaySalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Sales */}
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🗓</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-green-700">ยอดขายเดือนนี้</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.monthlySalesAmount || 0)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">{data?.summary.monthlySalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Sales */}
            <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 sm:col-span-2 lg:col-span-1">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📈</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-purple-700">ยอดขายรวม</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.totalSalesAmount || 0)}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">{data?.summary.totalSalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Product Category Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Main Products */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">📦</span>
                  </div>
                  <div>
                    <CardTitle size="lg" className="text-blue-900">สินค้าหลัก - เดือนนี้</CardTitle>
                    <p className="text-sm text-blue-700 mt-1">ยอดรวมสินค้าหลักที่ขายได้</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/60 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">จำนวนชิ้น</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {(data?.summary.monthlyMainProductQuantity || 0).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white/60 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">มูลค่า</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {formatCurrency(data?.summary.monthlyMainProductValue || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Product Details */}
                  {data?.productDetails.สินค้าหลัก && data.productDetails.สินค้าหลัก.length > 0 && (
                    <div className="pt-4 border-t border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">รายละเอียดสินค้า</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {data.productDetails.สินค้าหลัก.map((product, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white/40 rounded-lg">
                            <span className="text-sm text-blue-800 font-medium truncate flex-1 mr-2">{product.productName}</span>
                            <span className="text-sm font-bold text-blue-900 bg-blue-200 px-2 py-1 rounded">
                              {product.quantity.toLocaleString('th-TH')} ชิ้น
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Optional Products */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">🎯</span>
                  </div>
                  <div>
                    <CardTitle size="lg" className="text-purple-900">สินค้าทางเลือก - เดือนนี้</CardTitle>
                    <p className="text-sm text-purple-700 mt-1">ยอดรวมสินค้าทางเลือกที่ขายได้</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/60 rounded-lg">
                      <p className="text-sm text-purple-700 font-medium">จำนวนชิ้น</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {(data?.summary.monthlyOptionalProductQuantity || 0).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white/60 rounded-lg">
                      <p className="text-sm text-purple-700 font-medium">มูลค่า</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {formatCurrency(data?.summary.monthlyOptionalProductValue || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Product Details */}
                  {data?.productDetails.สินค้าทางเลือก && data.productDetails.สินค้าทางเลือก.length > 0 && (
                    <div className="pt-4 border-t border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3">รายละเอียดสินค้า</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {data.productDetails.สินค้าทางเลือก.map((product, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white/40 rounded-lg">
                            <span className="text-sm text-purple-800 font-medium truncate flex-1 mr-2">{product.productName}</span>
                            <span className="text-sm font-bold text-purple-900 bg-purple-200 px-2 py-1 rounded">
                              {product.quantity.toLocaleString('th-TH')} ชิ้น
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity and Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">📋</span>
                  </div>
                  <CardTitle>การขายล่าสุด</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data?.recentSales && data.recentSales.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentSales.map((sale, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {sale.employeeName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{sale.employeeName}</p>
                            <p className="text-sm text-gray-500">
                              {sale.type} • {formatDate(sale.saleDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(sale.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {sale.items.length} รายการ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">📋</span>
                    </div>
                    <p className="text-gray-500">ยังไม่มีการขาย</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Daily Sales Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">📈</span>
                  </div>
                  <CardTitle>ยอดขายรายวัน</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <DailySalesChart data={data?.dailySales || []} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

