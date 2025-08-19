'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Spinner, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  Chip 
} from '@nextui-org/react'
import { DollarSign, Package, Users, ShoppingCart } from 'lucide-react';

interface RecentSale {
  _id: string;
  employeeName: string
  type: string
  saleDate: string
  totalAmount: number
  items: unknown[]
}

interface LowStockProduct {
  _id: string;
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
      } else {
        // Handle error
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

  const summaryCards = [
    { title: 'สินค้าทั้งหมด', value: data?.summary.totalProducts || 0, icon: <Package className="text-blue-500" /> },
    { title: 'พนักงาน', value: data?.summary.totalEmployees || 0, icon: <Users className="text-green-500" /> },
    { title: 'ยอดขายวันนี้', value: formatCurrency(data?.summary.todaySalesAmount || 0), subValue: `${data?.summary.todaySalesCount || 0} รายการ`, icon: <DollarSign className="text-yellow-500" /> },
    { title: 'ยอดขายรวม', value: formatCurrency(data?.summary.totalSalesAmount || 0), subValue: `${data?.summary.totalSalesCount || 0} รายการ`, icon: <ShoppingCart className="text-purple-500" /> },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card, index) => (
              <Card key={index} shadow="sm">
                <CardBody className="flex flex-row items-center gap-4 p-6">
                  <div className="bg-default-100 p-3 rounded-full">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-default-600">{card.title}</p>
                    <p className="text-2xl font-semibold text-default-900">{card.value}</p>
                    {card.subValue && <p className="text-xs text-default-500">{card.subValue}</p>}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">การขายล่าสุด</h3>
              </CardHeader>
              <CardBody className="p-0">
                <Table aria-label="Recent Sales Table">
                  <TableHeader>
                    <TableColumn>พนักงาน</TableColumn>
                    <TableColumn>ประเภท</TableColumn>
                    <TableColumn>ยอดรวม</TableColumn>
                  </TableHeader>
                  <TableBody items={data?.recentSales || []} emptyContent="ยังไม่มีการขาย">
                    {(item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <p className="font-medium">{item.employeeName}</p>
                          <p className="text-sm text-default-500">{formatDate(item.saleDate)}</p>
                        </TableCell>
                        <TableCell>
                          <Chip color={item.type === 'เบิก' ? "danger" : "success"} variant="flat">{item.type}</Chip>
                        </TableCell>
                        <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>

            {user?.role === 'admin' && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">สินค้าใกล้หมด</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <Table aria-label="Low Stock Products Table">
                    <TableHeader>
                      <TableColumn>สินค้า</TableColumn>
                      <TableColumn>สต็อก</TableColumn>
                      <TableColumn>ราคา</TableColumn>
                    </TableHeader>
                    <TableBody items={data?.lowStockProducts || []} emptyContent="ไม่มีสินค้าใกล้หมด">
                      {(item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-default-500">{item.category}</p>
                          </TableCell>
                          <TableCell>
                            <Chip color="warning" variant="solid">{item.stock} ชิ้น</Chip>
                          </TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

