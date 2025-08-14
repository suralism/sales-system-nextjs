'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'

interface Product {
  _id: string
  name: string
  price: number
  stock: number
}

interface Employee {
  _id: string
  name: string
}

interface SaleItem {
  productId: string
  productName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

interface Sale {
  _id: string
  employeeId: string
  employeeName: string
  saleDate: string
  type: 'เบิก' | 'คืน'
  items: SaleItem[]
  totalAmount: number
  notes?: string
}

export default function SalesPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'เบิก' as 'เบิก' | 'คืน',
    items: [{ productId: '', quantity: 1 }],
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch('/api/sales', { credentials: 'include' }),
        fetch('/api/products', { credentials: 'include' }),
        user?.role === 'admin' ? fetch('/api/users', { credentials: 'include' }) : Promise.resolve(null)
      ])

      if (salesRes.ok) {
        const salesData = await salesRes.json()
        setSales(salesData.sales)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products)
      }

      if (employeesRes && employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData.users.filter((u: any) => u.role === 'employee'))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Calculate items with prices
      const processedItems = formData.items.map(item => {
        const product = products.find(p => p._id === item.productId)
        if (!product) throw new Error('Product not found')
        
        return {
          productId: item.productId,
          quantity: item.quantity
        }
      })

      const submitData = {
        employeeId: user?.role === 'employee' ? user.id : formData.employeeId,
        type: formData.type,
        items: processedItems,
        notes: formData.notes
      }
      
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
        credentials: 'include'
      })

      if (response.ok) {
        await fetchData()
        setShowModal(false)
        resetForm()
        alert('บันทึกการขายสำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'เบิก',
      items: [{ productId: '', quantity: 1 }],
      notes: ''
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }]
    })
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const product = products.find(p => p._id === item.productId)
      return total + (product ? product.price * item.quantity : 0)
    }, 0)
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">บันทึกการขาย</h1>
              <p className="text-gray-600">บันทึกการเบิกและคืนสินค้า</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              บันทึกการขายใหม่
            </button>
          </div>

          {/* Sales History */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">ประวัติการขาย</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      พนักงาน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รายการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ยอดรวม
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.type === 'เบิก' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {sale.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          {sale.items.map((item, index) => (
                            <div key={index}>
                              {item.productName} × {item.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    บันทึกการขายใหม่
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {user?.role === 'admin' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          พนักงาน *
                        </label>
                        <select
                          required
                          value={formData.employeeId}
                          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">เลือกพนักงาน</option>
                          {employees.map((employee) => (
                            <option key={employee._id} value={employee._id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ประเภท *
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'เบิก' | 'คืน' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="เบิก">เบิก</option>
                        <option value="คืน">คืน</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รายการสินค้า *
                      </label>
                      <div className="space-y-2">
                        {formData.items.map((item, index) => (
                          <div key={index} className="flex space-x-2">
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">เลือกสินค้า</option>
                              {products.map((product) => (
                                <option key={product._id} value={product._id}>
                                  {product.name} (คงเหลือ: {product.stock}) - {formatCurrency(product.price)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="จำนวน"
                            />
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="px-3 py-2 text-red-600 hover:text-red-800"
                              >
                                ลบ
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          + เพิ่มรายการ
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมายเหตุ
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="text-lg font-medium text-gray-900">
                        ยอดรวม: {formatCurrency(calculateTotal())}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        บันทึกการขาย
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

