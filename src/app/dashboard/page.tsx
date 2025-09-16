
'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import DailySalesChart from '@/components/DailySalesChart'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

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
  credit?: {
    creditLimit: number
    creditUsed: number
    creditRemaining: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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
      } else {
        toast.error('Failed to fetch dashboard data.');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to fetch dashboard data.');
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
      <Layout enablePullToRefresh={true} onRefresh={fetchDashboardData}>
        <div className="p-4 sm:p-6">
          {/* Header Section */}
          <div className="text-center sm:text-left mb-6">
            <h1 className="text-2xl font-bold text-gray-900">📊 แดชบอร์ด</h1>
            <p className="text-gray-600 mt-1">ภาพรวมของระบบขายสินค้า</p>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {user?.role === 'employee' && (
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                      <span className="text-xl">💳</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-amber-700">เครดิตทั้งหมด</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(data?.credit?.creditLimit || 0)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-xs text-orange-600">ใช้ไปแล้ว</p>
                          <p className="text-sm font-semibold text-orange-900">
                            {formatCurrency(data?.credit?.creditUsed || 0)}
                          </p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-xs text-emerald-600">คงเหลือ</p>
                          <p className="text-sm font-semibold text-emerald-900">
                            {formatCurrency(data?.credit?.creditRemaining || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Today Sales */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">ยอดขายวันนี้</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.todaySalesAmount || 0)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{data?.summary.todaySalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Sales */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">🗓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">ยอดขายเดือนนี้</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.monthlySalesAmount || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">{data?.summary.monthlySalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Sales */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">📈</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-700">ยอดขายรวม</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(data?.summary.totalSalesAmount || 0)}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">{data?.summary.totalSalesCount || 0} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Product Category Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Main Products */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">📦</span>
                  </div>
                  <div>
                    <CardTitle className="text-blue-900">สินค้าหลัก - เดือนนี้</CardTitle>
                    <p className="text-sm text-blue-700">ยอดรวมสินค้าหลักที่ขายได้</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">จำนวนชิ้น</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {(data?.summary.monthlyMainProductQuantity || 0).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">มูลค่า</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {formatCurrency(data?.summary.monthlyMainProductValue || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Product Details */}
                  {data?.productDetails.สินค้าหลัก && data.productDetails.สินค้าหลัก.length > 0 && (
                    <div className="pt-4 border-t border-blue-200 mt-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">รายละเอียดสินค้า</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {data.productDetails.สินค้าหลัก.map((product, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
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
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">🎯</span>
                  </div>
                  <div>
                    <CardTitle className="text-purple-900">สินค้าทางเลือก - เดือนนี้</CardTitle>
                    <p className="text-sm text-purple-700">ยอดรวมสินค้าทางเลือกที่ขายได้</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-700 font-medium">จำนวนชิ้น</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {(data?.summary.monthlyOptionalProductQuantity || 0).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-700 font-medium">มูลค่า</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {formatCurrency(data?.summary.monthlyOptionalProductValue || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Product Details */}
                  {data?.productDetails.สินค้าทางเลือก && data.productDetails.สินค้าทางเลือก.length > 0 && (
                    <div className="pt-4 border-t border-purple-200 mt-4">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3">รายละเอียดสินค้า</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {data.productDetails.สินค้าทางเลือก.map((product, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
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
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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


