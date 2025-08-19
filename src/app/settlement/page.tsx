'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface SaleItem {
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number
  return: number
  defective: number
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
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [formData, setFormData] = useState({
    cashAmount: 0,
    transferAmount: 0,
    customerPending: 0,
    expenseAmount: 0,
    awaitingTransfer: 0
  })

  useEffect(() => {
    if (user) {
      fetchSales()
    }
  }, [user])

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSales(data.sales)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      toast.error('Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  const openSettle = (sale: Sale) => {
    setSelectedSale(sale)
    setFormData({
      cashAmount: sale.cashAmount || 0,
      transferAmount: sale.transferAmount || 0,
      customerPending: sale.customerPending || 0,
      expenseAmount: sale.expenseAmount || 0,
      awaitingTransfer: sale.awaitingTransfer || 0
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSale) return
    try {
      const response = await fetch(`/api/sales/${selectedSale._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cashAmount: formData.cashAmount,
          transferAmount: formData.transferAmount,
          customerPending: formData.customerPending,
          expenseAmount: formData.expenseAmount,
          awaitingTransfer: formData.awaitingTransfer,
          paidAmount: formData.cashAmount + formData.transferAmount,
          settled: true
        })
      })
      if (response.ok) {
        toast.success('เคลียบิลสำเร็จ')
        setShowModal(false)
        setSelectedSale(null)
        fetchSales()
      } else {
        const err = await response.json()
        toast.error(err.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Settle error:', error)
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount)
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

  const unsettledSales = sales.filter(s => !s.settled)
  const remaining = selectedSale
    ? selectedSale.totalAmount - (formData.cashAmount + formData.transferAmount)
    : 0

  return (
    <ProtectedRoute>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openSettle(sale)}
                          className="text-blue-600 hover:text-blue-900"
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

          {showModal && selectedSale && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium text-gray-900 mb-4">เคลียบิล - {selectedSale.employeeName}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">ยอดสุทธิ: {formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เงินสด</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cashAmount}
                      onChange={e => setFormData({ ...formData, cashAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">โอนเงิน</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.transferAmount}
                      onChange={e => setFormData({ ...formData, transferAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้ายังไม่จ่าย</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.customerPending}
                      onChange={e => setFormData({ ...formData, customerPending: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หักค่าใช้จ่าย</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.expenseAmount}
                      onChange={e => setFormData({ ...formData, expenseAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รอโอนเพิ่ม</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.awaitingTransfer}
                      onChange={e => setFormData({ ...formData, awaitingTransfer: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      บันทึก
                    </button>
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

