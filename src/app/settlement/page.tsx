
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { CATEGORY_TYPES, CategoryType } from '../../../lib/constants'
import { Form } from '@/components/Form'

interface SaleItem {
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number
  return: number | ''
  defective: number | ''
  category?: CategoryType
}

interface Sale {
  _id: string
  employeeId: string
  employeeName: string
  saleDate: string
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

export default function SettlementPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [itemsForm, setItemsForm] = useState<SaleItem[]>([])
  const [deliveredAmount, setDeliveredAmount] = useState('')
  const [categorySummary, setCategorySummary] = useState({ main: 0, optional: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales?settled=false&page=${page}&limit=${limit}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSales(data.sales)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      toast.error('Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (user) {
      fetchSales()
    }
  }, [user, fetchSales])

  const fetchItemCategories = async (items: SaleItem[]) => {
    return Promise.all(
      items.map(async item => {
        try {
          const res = await fetch(`/api/products/${item.productId}`, { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            return { ...item, category: data.product.category as CategoryType }
          }
        } catch (err) {
          console.error('Failed to fetch product category:', err)
        }
        return { ...item }
      })
    )
  }

  const updateCategorySummary = (items: SaleItem[]) => {
    const summary = items.reduce(
      (acc, item) => {
        const sold =
          (Number(item.withdrawal) || 0) -
          (Number(item.return) || 0) -
          (Number(item.defective) || 0)
        if (item.category === CATEGORY_TYPES[0]) acc.main += sold
        else if (item.category === CATEGORY_TYPES[1]) acc.optional += sold
        return acc
      },
      { main: 0, optional: 0 }
    )
    setCategorySummary(summary)
  }

  const openSettle = async (sale: Sale) => {
    setSelectedSale(sale)
    setDeliveredAmount(String((sale.cashAmount || 0) + (sale.transferAmount || 0)))
    const itemsWithCategory = await fetchItemCategories(sale.items)
    setItemsForm(itemsWithCategory)
    updateCategorySummary(itemsWithCategory)
    setShowModal(true)
  }

  const openDetails = async (sale: Sale) => {
    const itemsWithCategory = await fetchItemCategories(sale.items)
    setSelectedSale({ ...sale, items: itemsWithCategory })
    updateCategorySummary(itemsWithCategory)
    setShowDetails(true)
  }

  const updateItem = (index: number, field: 'return' | 'defective', value: string) => {
    setItemsForm(prev => {
      const newItems = [...prev]
      newItems[index] = {
        ...newItems[index],
        [field]: value === '' ? '' : parseInt(value, 10)
      }
      updateCategorySummary(newItems)
      return newItems
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSale) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/sales/${selectedSale._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: itemsForm.map(item => ({
            productId: item.productId,
            withdrawal: item.withdrawal,
            return: Number(item.return) || 0,
            defective: Number(item.defective) || 0
          })),
          cashAmount: Number(deliveredAmount) || 0,
          transferAmount: 0,
          customerPending: 0,
          expenseAmount: 0,
          awaitingTransfer: 0,
          paidAmount: Number(deliveredAmount) || 0,
          settled: true
        })
      })
      if (response.ok) {
        toast.success('เคลียบิลสำเร็จ')
        setShowModal(false)
        setSelectedSale(null)
        setCategorySummary({ main: 0, optional: 0 })
        fetchSales()
      } else {
        const err = await response.json()
        toast.error(err.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Settle error:', error)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
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

  const unsettledSales = useMemo(() => sales.filter(sale => !sale.settled), [sales]);

  const totalAmount = useMemo(() => {
    return itemsForm.reduce(
      (sum, item) =>
        sum +
        item.pricePerUnit * ((Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0)),
      0
    )
  }, [itemsForm]);

  const remaining = useMemo(() => {
    return selectedSale ? totalAmount - (Number(deliveredAmount) || 0) : 0
  }, [selectedSale, totalAmount, deliveredAmount]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">เคลียบิล</h1>
          <p className="text-gray-600 mb-6">จัดการการเคลียบิลสำหรับพนักงาน</p>

          {unsettledSales.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              ยังไม่มีรายการที่รอเคลียบิล
            </div>
          ) : (
            <div className="space-y-4">
              {unsettledSales.map(sale => (
                <div key={sale._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {formatDate(sale.saleDate)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetails(sale)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        รายละเอียด
                      </button>
                      <button
                        onClick={() => openSettle(sale)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        เคลียบิล
                      </button>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">พนักงาน: {sale.employeeName}</p>
                  <p className="text-md text-gray-700 mb-2">ยอดรวม: {formatCurrency(sale.totalAmount)}</p>
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

          {/* Details Modal */}
          {showDetails && selectedSale && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">รายละเอียดสินค้า - {selectedSale.employeeName}</h2>
                <div className="max-h-[60vh] overflow-y-auto mb-4">
                  <div className="space-y-3">
                    {selectedSale.items.map((item, idx) => {
                      const sold =
                        (Number(item.withdrawal) || 0) -
                        (Number(item.return) || 0) -
                        (Number(item.defective) || 0)
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <p className="font-semibold text-gray-900">{item.productName}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mt-1">
                            <span>ราคาต่อหน่วย: {formatCurrency(item.pricePerUnit)}</span>
                            <span className="text-right">เบิก: {item.withdrawal}</span>
                            <span>คืน: {item.return}</span>
                            <span className="text-right">เสีย: {item.defective}</span>
                            <span>ขายได้: {sold}</span>
                            <span className="text-right">รวม: {formatCurrency(sold * item.pricePerUnit)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <p className="text-md font-semibold text-gray-800">ยอดรวม: {formatCurrency(selectedSale.totalAmount)}</p>
                  <button
                    type="button"
                    onClick={() => { setShowDetails(false); setSelectedSale(null); setCategorySummary({ main: 0, optional: 0 }) }}
                    className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Settle Modal */}
          {showModal && selectedSale && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">เคลียบิล - {selectedSale.employeeName}</h2>
                <Form onSubmit={handleSubmit}>
                  <div className="max-h-[50vh] overflow-y-auto mb-4">
                    <div className="space-y-3">
                      {itemsForm.map((item, idx) => {
                        const sold =
                          (Number(item.withdrawal) || 0) -
                          (Number(item.return) || 0) -
                          (Number(item.defective) || 0)
                        return (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3 relative">
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mt-1">
                              <span>ราคาต่อหน่วย: {formatCurrency(item.pricePerUnit)}</span>
                              <span className="text-right">เบิก: {item.withdrawal}</span>
                              <div>
                                <label htmlFor={`return-${idx}`} className="block text-xs font-medium text-gray-500">คืน</label>
                                <input
                                  id={`return-${idx}`}
                                  type="number"
                                  inputMode="numeric"
                                  value={item.return === '' ? '' : item.return}
                                  onChange={e => updateItem(idx, 'return', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                />
                              </div>
                              <div>
                                <label htmlFor={`defective-${idx}`} className="block text-xs font-medium text-gray-500">ชำรุด</label>
                                <input
                                  id={`defective-${idx}`}
                                  type="number"
                                  inputMode="numeric"
                                  value={item.defective === '' ? '' : item.defective}
                                  onChange={e => updateItem(idx, 'defective', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                />
                              </div>
                              <span>ขายได้: {sold}</span>
                              <span className="text-right">รวม: {formatCurrency(sold * item.pricePerUnit)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>สินค้าหลัก: {categorySummary.main} ชิ้น</span>
                    <span>สินค้าทางเลือก: {categorySummary.optional} ชิ้น</span>
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-2xl font-bold text-gray-900">ยอดสุทธิ: {formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="deliveredAmount" className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงินที่ได้รับ</label>
                    <input
                      id="deliveredAmount"
                      type="number"
                      inputMode="numeric"
                      value={deliveredAmount}
                      onChange={(e) => setDeliveredAmount(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <p className="text-md font-semibold text-gray-800">คงเหลือ: {formatCurrency(remaining)}</p>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); setSelectedSale(null); setCategorySummary({ main: 0, optional: 0 }) }}
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
                        'บันทึกการเคลียบิล'
                      )}
                    </button>
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


