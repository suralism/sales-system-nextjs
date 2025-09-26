'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import DailySalesChart from '@/components/DailySalesChart'
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Statistic, 
  Badge, 
  Spin, 
  Empty,
  message
} from 'antd'
import { 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  CalendarOutlined, 
  TrophyOutlined,
  CreditCardOutlined,
  DollarOutlined,
  LineChartOutlined,
  InboxOutlined,
  TagOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useAuth } from '@/contexts/AuthContext'

const { Title, Text } = Typography

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
  const [messageApi, contextHolder] = message.useMessage()

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
        messageApi.error('Failed to fetch dashboard data.');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      messageApi.error('Failed to fetch dashboard data.');
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <>
      {contextHolder}
      <ProtectedRoute>
        <Layout enablePullToRefresh={true} onRefresh={fetchDashboardData}>
          <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
            {/* Header Section */}
            <div>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <DashboardOutlined style={{ marginRight: 8 }} />
                แดชบอร์ด
              </Title>
              <Text type="secondary">ภาพรวมของระบบขายสินค้า</Text>
            </div>

            {/* Quick Stats Cards */}
            <Row gutter={[16, 16]}>
              {user?.role === 'employee' && (
                <Col xs={24} sm={12} lg={8}>
                  <Card 
                    style={{ 
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      borderColor: '#f59e0b'
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space align="start">
                        <div style={{
                          width: 40,
                          height: 40,
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}>
                          💳
                        </div>
                        <div>
                          <Text strong style={{ color: '#92400e' }}>เครดิตทั้งหมด</Text>
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                            {formatCurrency(data?.credit?.creditLimit || 0)}
                          </div>
                        </div>
                      </Space>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Card size="small" style={{ background: 'rgba(255,255,255,0.7)' }}>
                            <Text style={{ fontSize: 12, color: '#ea580c' }}>ใช้ไปแล้ว</Text>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#9a3412' }}>
                              {formatCurrency(data?.credit?.creditUsed || 0)}
                            </div>
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card size="small" style={{ background: 'rgba(255,255,255,0.7)' }}>
                            <Text style={{ fontSize: 12, color: '#059669' }}>คงเหลือ</Text>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
                              {formatCurrency(data?.credit?.creditRemaining || 0)}
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                </Col>
              )}
              
              {/* Today Sales */}
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ 
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  borderColor: '#3b82f6'
                }}>
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      💰
                    </div>
                    <div>
                      <Text strong style={{ color: '#1d4ed8' }}>ยอดขายวันนี้</Text>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                        {formatCurrency(data?.summary.todaySalesAmount || 0)}
                      </div>
                      <Text style={{ fontSize: 12, color: '#2563eb' }}>{data?.summary.todaySalesCount || 0} รายการ</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* Monthly Sales */}
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ 
                  background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                  borderColor: '#22c55e'
                }}>
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      🗓
                    </div>
                    <div>
                      <Text strong style={{ color: '#15803d' }}>ยอดขายเดือนนี้</Text>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                        {formatCurrency(data?.summary.monthlySalesAmount || 0)}
                      </div>
                      <Text style={{ fontSize: 12, color: '#16a34a' }}>{data?.summary.monthlySalesCount || 0} รายการ</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* Total Sales */}
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ 
                  background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                  borderColor: '#a855f7'
                }}>
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      📈
                    </div>
                    <div>
                      <Text strong style={{ color: '#7c3aed' }}>ยอดขายรวม</Text>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                        {formatCurrency(data?.summary.totalSalesAmount || 0)}
                      </div>
                      <Text style={{ fontSize: 12, color: '#9333ea' }}>{data?.summary.totalSalesCount || 0} รายการ</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </Layout>
      </ProtectedRoute>
    </>
  )
}