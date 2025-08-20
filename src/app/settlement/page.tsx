'use client'

import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { CATEGORY_TYPES, CategoryType } from '../../../lib/constants'
import Button from '@/components/Button'

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

  const unsettledSales = sales
  const totalAmount = itemsForm.reduce(
    (sum, item) =>
      sum +
      item.pricePerUnit * ((Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0)),
    0
  )
  const remaining = selectedSale ? totalAmount - (Number(deliveredAmount) || 0) : 0

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">เคลียบิล</h1>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">รายการที่รอเคลียบิล</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      พนักงาน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ยอดรวม
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unsettledSales.map(sale => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                        <button
                          onClick={() => openDetails(sale)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          รายละเอียด
                        </button>
                        <button
                          onClick={() => openSettle(sale)}
                          className="text-green-600 hover:text-green-900"
                        >
                          เคลียบิล
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          </div>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

          {showDetails && selectedSale && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-xl md:max-w-3xl shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium text-gray-900 mb-4">รายละเอียดสินค้า - {selectedSale.employeeName}</h3>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500">สินค้า</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">ราคา</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">เบิก</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">คืน</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">เสีย</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">ขายได้</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">รวมราคา</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.items.map((item, idx) => {
                        const sold =
                          (Number(item.withdrawal) || 0) -
                          (Number(item.return) || 0) -
                          (Number(item.defective) || 0)
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                            <td className="px-4 py-2 text-right">{item.withdrawal}</td>
                            <td className="px-4 py-2 text-right">{item.return}</td>
                            <td className="px-4 py-2 text-right">{item.defective}</td>
                            <td className="px-4 py-2 text-right">{sold}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(sold * item.pricePerUnit)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between mt-4 text-sm text-gray-700">
                  <span>สินค้าหลัก: {categorySummary.main} ชิ้น</span>
                  <span>สินค้าทางเลือก: {categorySummary.optional} ชิ้น</span>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                      onClick={() => { setShowDetails(false); setSelectedSale(null); setCategorySummary({ main: 0, optional: 0 }) }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          )}

          {showModal && selectedSale && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-xl md:max-w-3xl shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium text-gray-900 mb-4">เคลียบิล - {selectedSale.employeeName}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">สินค้า</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">ราคา</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">เบิก</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">คืน</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">เสีย</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">ขายได้</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">รวมราคา</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {itemsForm.map((item, idx) => {
                          const sold =
                            (Number(item.withdrawal) || 0) -
                            (Number(item.return) || 0) -
                            (Number(item.defective) || 0)
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-2">{item.productName}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                              <td className="px-4 py-2 text-right">{item.withdrawal}</td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.return === '' ? '' : item.return}
                                  onChange={e => updateItem(idx, 'return', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.defective === '' ? '' : item.defective}
                                  onChange={e => updateItem(idx, 'defective', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">{sold}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(sold * item.pricePerUnit)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>สินค้าหลัก: {categorySummary.main} ชิ้น</span>
                    <span>สินค้าทางเลือก: {categorySummary.optional} ชิ้น</span>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">ยอดสุทธิ: {formatCurrency(totalAmount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ยอดที่นำส่ง</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={deliveredAmount}
                      onChange={e => setDeliveredAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-sm text-gray-700">
                    {remaining > 0 ? (
                      <p>ค้างชำระ: {formatCurrency(remaining)}</p>
                    ) : (
                      <p>ชำระครบแล้ว</p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); setCategorySummary({ main: 0, optional: 0 }) }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      ยกเลิก
                    </button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transform transition-all hover:scale-105 active:scale-95"
                    >
                      บันทึก
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

