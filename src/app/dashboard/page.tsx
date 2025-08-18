'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'

interface RecentSale {
  employeeName: string
  type: string
  saleDate: string
  totalAmount: number
  items: unknown[]
}

interface LowStockProduct {
  name: string
  category: string
  stock: number
  price: number
}

interface DashboardData {
  summary: {
    totalProducts: number
    totalEmployees: number
    todaySalesAmount: number
    todaySalesCount: number
    totalSalesAmount: number
    totalSalesCount: number
  }
  recentSales: RecentSale[]
  lowStockProducts?: LowStockProduct[]
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
      currency: 'THB'
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
            <p className="text-gray-600">ภาพรวมของระบบขายสินค้า</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">สินค้าทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">{data?.summary.totalProducts || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">พนักงาน</p>
                  <p className="text-2xl font-semibold text-gray-900">{data?.summary.totalEmployees || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ยอดขายวันนี้</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(data?.summary.todaySalesAmount || 0)}
                  </p>
                  <p className="text-sm text-gray-500">{data?.summary.todaySalesCount || 0} รายการ</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ยอดขายรวม</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(data?.summary.totalSalesAmount || 0)}
                  </p>
                  <p className="text-sm text-gray-500">{data?.summary.totalSalesCount || 0} รายการ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sales */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">การขายล่าสุด</h3>
              </div>
              <div className="p-6">
                {data?.recentSales && data.recentSales.length > 0 ? (
                  <div className="space-y-4">
                    {data.recentSales.map((sale, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{sale.employeeName}</p>
                          <p className="text-sm text-gray-500">
                            {sale.type} • {formatDate(sale.saleDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
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
                  <p className="text-gray-500 text-center py-4">ยังไม่มีการขาย</p>
                )}
              </div>
            </div>

            {/* Low Stock Products (Admin only) */}
            {user?.role === 'admin' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">สินค้าใกล้หมด</h3>
                </div>
                <div className="p-6">
                  {data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
                    <div className="space-y-4">
                      {data.lowStockProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-red-600">
                              เหลือ {product.stock} ชิ้น
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">สินค้าทุกรายการมีสต็อกเพียงพอ</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

