
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
}

interface SaleItem {
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number | ''
  return: number | ''
  defective: number | ''
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

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'เบิก' as 'เบิก' | 'คืน',
    items: [] as SaleItem[],
    notes: ''
  })

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch(`/api/sales?page=${page}&limit=${limit}`, { credentials: 'include' }),
        fetch('/api/products?limit=1000', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' })
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
        setEmployees(employeesData.users)
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
        }
    }
  }, [user, fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const processedItems = formData.items.map(item => ({
        productId: item.productId,
        withdrawal: Number(item.withdrawal) || 0,
        return: Number(item.return) || 0,
        defective: Number(item.defective) || 0,
      }))

      const submitData = {
        employeeId: formData.employeeId,
        type: formData.type,
        items: processedItems,
        notes: formData.notes
      }
      
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
      type: 'เบิก',
      items: [],
      notes: ''
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
    } else if (field === 'withdrawal' || field === 'return' || field === 'defective') {
      (item[field] as number | '') = value === '' ? '' : parseInt(value, 10)
    }
    setFormData({ ...formData, items: newItems })
  }

  const { totalAmount } = useMemo(() => {
    let amount = 0
    formData.items.forEach(item => {
      const w = Number(item.withdrawal) || 0
      const r = Number(item.return) || 0
      const d = Number(item.defective) || 0
      const netQuantity = w - r - d
      amount += netQuantity * item.pricePerUnit
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
      type: sale.type,
      items: sale.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        pricePerUnit: item.pricePerUnit,
        withdrawal: item.withdrawal,
        return: item.return,
        defective: item.defective
      })),
      notes: sale.notes || ''
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
          <p className="text-gray-600 mb-6">บันทึกการเบิกสินค้า (คืน/เคลมใส่ตอนเคลียบิล)</p>

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
                        - {item.productName} ({item.withdrawal || item.return || item.defective})
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
                    </div>

                    <div>
                      <label htmlFor="saleType" className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                      <select
                        id="saleType"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'เบิก' | 'คืน' })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        <option value="เบิก">เบิก</option>
                        <option value="คืน">คืน</option>
                      </select>
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
                        <div className="space-y-3">
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
                              {products.map(prod => (
                                <option key={prod._id} value={prod._id}>{prod.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label htmlFor={`withdrawal-${index}`} className="block text-sm font-medium text-gray-700 mb-1">เบิก</label>
                              <input
                                id={`withdrawal-${index}`}
                                type="number"
                                value={item.withdrawal}
                                onChange={(e) => updateItem(index, 'withdrawal', e.target.value)}
                                min="0"
                                disabled={formData.type === 'คืน'}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                              />
                            </div>
                            <div>
                              <label htmlFor={`return-${index}`} className="block text-sm font-medium text-gray-700 mb-1">คืน</label>
                              <input
                                id={`return-${index}`}
                                type="number"
                                value={item.return}
                                onChange={(e) => updateItem(index, 'return', e.target.value)}
                                min="0"
                                disabled={formData.type === 'เบิก'}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                              />
                            </div>
                            <div>
                              <label htmlFor={`defective-${index}`} className="block text-sm font-medium text-gray-700 mb-1">ชำรุด</label>
                              <input
                                id={`defective-${index}`}
                                type="number"
                                value={item.defective}
                                onChange={(e) => updateItem(index, 'defective', e.target.value)}
                                min="0"
                                disabled={formData.type === 'เบิก'}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { productId: '', productName: '', pricePerUnit: 0, withdrawal: '', return: '', defective: '' }] })} className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors">
                      + เพิ่มรายการสินค้า
                    </button>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                      <textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>

                    <div className="mt-4 text-right">
                      <p className="text-lg font-semibold text-gray-800">ยอดรวม: {totalAmount.toFixed(2)} บาท</p>
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
                        disabled={isSubmitting}
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


