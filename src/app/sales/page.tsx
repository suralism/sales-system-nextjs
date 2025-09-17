
'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { Form } from '@/components/Form'

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
}

interface Employee {
  _id: string
  name: string
  priceLevel: string;
  creditLimit?: number
  creditUsed?: number
  creditRemaining?: number
}

interface SaleItem {
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number | ''
}

interface Sale {
  _id: string
  employeeId: string
  employeeName: string
  saleDate: string
  type: 'เบิก' | 'คืน'
  items: SaleItem[]
  totalAmount: number
  paidAmount: number
  paymentMethod: string
  pendingAmount: number
  cashAmount: number
  transferAmount: number
  customerPending: number
  expenseAmount: number
  awaitingTransfer: number
  settled: boolean
}

export default function SalesPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEmployeeCredit, setSelectedEmployeeCredit] = useState<{
    creditLimit: number
    creditUsed: number
    creditRemaining: number
  } | null>(null)

  const [formData, setFormData] = useState({
    employeeId: '',
    items: [] as SaleItem[]
  })

  // Fetch employee credit information
  const fetchEmployeeCredit = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setSelectedEmployeeCredit(null)
      return
    }
    
    try {
      const response = await fetch(`/api/users/${employeeId}/credit`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const creditData = await response.json()
        setSelectedEmployeeCredit({
          creditLimit: creditData.creditLimit,
          creditUsed: creditData.creditUsed,
          creditRemaining: creditData.creditRemaining
        })
      } else {
        setSelectedEmployeeCredit(null)
      }
    } catch (error) {
      console.error('Failed to fetch employee credit:', error)
      setSelectedEmployeeCredit(null)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch(`/api/sales?page=${page}&limit=${limit}`, { credentials: 'include' }),
        fetch('/api/products?limit=1000', { credentials: 'include' }),
        fetch('/api/users?view=dropdown&limit=1000', { credentials: 'include' })
      ])

      if (salesRes.ok) {
        const salesData = await salesRes.json()
        setSales(salesData.sales)
        setTotal(salesData.pagination?.total || 0)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products)
      }

      if (employeesRes && employeesRes.ok) {
        const employeesData = await employeesRes.json()
        console.log('Sales page - Employees data:', employeesData)
        console.log('Sales page - Current user role:', user?.role)
        setEmployees(employeesData.users)
      } else {
        console.error('Sales page - Failed to fetch employees:', employeesRes?.status, employeesRes?.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if(user) {
        fetchData()
        if (user.role === 'employee') {
          setFormData(prev => ({ ...prev, employeeId: user.id }))
          fetchEmployeeCredit(user.id)
        }
    }
  }, [user, fetchData, fetchEmployeeCredit])

  // Fetch credit when employee changes
  useEffect(() => {
    if (formData.employeeId) {
      fetchEmployeeCredit(formData.employeeId)
    }
  }, [formData.employeeId, fetchEmployeeCredit])

  // Auto-refresh credit information every 30 seconds for employees
  useEffect(() => {
    if (user?.role === 'employee' && user.id) {
      const interval = setInterval(() => {
        fetchEmployeeCredit(user.id)
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [user, fetchEmployeeCredit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check credit limit for withdrawal
    if (selectedEmployeeCredit && totalAmount > selectedEmployeeCredit.creditRemaining) {
      toast.error(`เกินวงเงินเครดิต! คงเหลือ: ${formatCurrency(selectedEmployeeCredit.creditRemaining)}, ยอดที่ต้องการเบิก: ${formatCurrency(totalAmount)}`)
      return
    }
    
    setIsSubmitting(true)

    try {
      const processedItems = formData.items.map(item => ({
        productId: item.productId,
        withdrawal: Number(item.withdrawal) || 0,
        return: 0,
        defective: 0,
      }))

      const submitData = {
        employeeId: formData.employeeId,
        type: 'เบิก',
        items: processedItems
      }
      
      console.log('Submitting sale data:', JSON.stringify(submitData, null, 2))
      
      const url = editingSaleId ? `/api/sales/${editingSaleId}` : '/api/sales'
      const method = editingSaleId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
        credentials: 'include'
      })

      if (response.ok) {
        await fetchData()
        // Refresh credit information after successful submission
        if (formData.employeeId) {
          await fetchEmployeeCredit(formData.employeeId)
        }
        setShowModal(false)
        resetForm()
        toast.success(editingSaleId ? 'อัปเดตการเบิกสำเร็จ' : 'บันทึกการเบิกสำเร็จ')
      } else {
        const error = await response.json()
        toast.error(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: user?.role === 'employee' ? user.id : '',
      items: []
    })
    setEditingSaleId(null)
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = [...formData.items]
    const item = newItems[index]
    if (field === 'productId') {
        const product = products.find(p => p._id === value);
        if (product) {
            item.productId = product._id;
            item.productName = product.name;
            const employee = employees.find(e => e._id === formData.employeeId);
            if (employee) {
                const priceInfo = product.prices.find(p => p.level === employee.priceLevel);
                item.pricePerUnit = priceInfo ? priceInfo.value : 0;
            }
        }
    } else if (field === 'withdrawal') {
      (item[field] as number | '') = value === '' ? '' : parseInt(value, 10)
    }
    setFormData({ ...formData, items: newItems })
  }

  const { totalAmount } = useMemo(() => {
    let amount = 0
    formData.items.forEach(item => {
      const w = Number(item.withdrawal) || 0
      amount += w * item.pricePerUnit
    })
    return { totalAmount: amount }
  }, [formData.items, products, employees, formData.employeeId])

  const handleDelete = async (saleId: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        const response = await fetch(`/api/sales/${saleId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          toast.success('Sale deleted successfully');
          fetchData();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to delete sale');
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSaleId(sale._id)
    setFormData({
      employeeId: sale.employeeId,
      items: sale.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        pricePerUnit: item.pricePerUnit,
        withdrawal: item.withdrawal
      }))
    })
    setShowModal(true)
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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกการเบิก</h1>
          <p className="text-gray-600 mb-6">บันทึกการเบิกสินค้า (การคืนหรือชำรุดจะจัดการในหน้าเคลียบิล)</p>

          {/* Real-time Credit Display for Employees */}
          {user?.role === 'employee' && selectedEmployeeCredit && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💳 ข้อมูลเครดิตของคุณ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">วงเงินเครดิต</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedEmployeeCredit.creditLimit)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-sm text-orange-600 font-medium">ใช้ไปแล้ว</p>
                  <p className="text-xl font-bold text-orange-900">{formatCurrency(selectedEmployeeCredit.creditUsed)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-sm text-green-600 font-medium">คงเหลือ</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(selectedEmployeeCredit.creditRemaining)}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => fetchEmployeeCredit(user.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  รีเฟรช
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              + บันทึกการเบิกใหม่
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : sales.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              ยังไม่มีการเบิกสินค้า
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {formatDate(sale.saleDate)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(sale)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(sale._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">พนักงาน: {sale.employeeName}</p>
                  <p className="text-md text-gray-700 mb-2">ประเภท: {sale.type}</p>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-sm font-medium text-gray-700">รายการสินค้า:</p>
                    {sale.items.map(item => (
                      <p key={item.productId} className="text-sm text-gray-600 ml-2">
                        - {item.productName} ({item.withdrawal})
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <p className="text-md font-semibold text-gray-800">ยอดรวม: {formatCurrency(sale.totalAmount)}</p>
                    {sale.settled ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        เคลียร์แล้ว
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        ยังไม่เคลียร์
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Pagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </div>

          {/* Add/Edit Sale Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{editingSaleId ? 'แก้ไขการเบิกสินค้า' : 'บันทึกการเบิกใหม่'}</h2>
                <Form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-1">พนักงาน</label>
                      <select
                        id="employee"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        <option value="">เลือกพนักงาน</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                      </select>
                      
                      {/* Credit Information Display */}
                      {selectedEmployeeCredit && formData.employeeId && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">ข้อมูลเครดิต</h4>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700">วงเงินเครดิต:</span>
                              <span className="font-semibold text-blue-900">{formatCurrency(selectedEmployeeCredit.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">ใช้ไปแล้ว:</span>
                              <span className="font-semibold text-blue-900">{formatCurrency(selectedEmployeeCredit.creditUsed)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">คงเหลือ:</span>
                              <span className="font-semibold text-green-700">{formatCurrency(selectedEmployeeCredit.creditRemaining)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">รายการสินค้า</h3>
                    {formData.items.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 mb-3 relative">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">สินค้า</label>
                            <select
                              id={`product-${index}`}
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              required
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                            >
                              <option value="">เลือกสินค้า</option>
                              {products
                                .filter(prod => 
                                  !formData.items.some((item, itemIndex) => 
                                    itemIndex !== index && item.productId === prod._id
                                  )
                                )
                                .map(prod => (
                                  <option key={prod._id} value={prod._id}>{prod.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`withdrawal-${index}`} className="block text-sm font-medium text-gray-700 mb-1">จำนวนที่เบิก</label>
                            <input
                              id={`withdrawal-${index}`}
                              type="number"
                              value={item.withdrawal}
                              onChange={(e) => updateItem(index, 'withdrawal', e.target.value)}
                              min="0"
                              required
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { productId: '', productName: '', pricePerUnit: 0, withdrawal: '' }] })} className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors">
                      + เพิ่มรายการสินค้า
                    </button>

                    <div className="mt-4 text-right">
                      <p className="text-lg font-semibold text-gray-800">ยอดรวม: {totalAmount.toFixed(2)} บาท</p>
                      
                      {/* Credit limit warning */}
                      {selectedEmployeeCredit && totalAmount > selectedEmployeeCredit.creditRemaining && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-red-800">เกินวงเงินเครดิต!</p>
                              <p className="text-sm text-red-700">
                                ยอดเบิกเกินคงเหลือ {formatCurrency(totalAmount - selectedEmployeeCredit.creditRemaining)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || (selectedEmployeeCredit !== null && totalAmount > selectedEmployeeCredit.creditRemaining)}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            กำลังบันทึก...
                          </div>
                        ) : (
                          editingSaleId ? 'บันทึกการแก้ไข' : 'บันทึก'
                        )}
                      </button>
                    </div>
                  </div>
                </Form>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}


