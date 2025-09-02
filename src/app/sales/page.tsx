'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import Button from '@/components/Button'
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/Card'
import { Input, Select, Textarea, Form, FormGroup } from '@/components/Form'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // New states for quantity input modal
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const quantityInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'เบิก' as 'เบิก' | 'คืน',
    items: [] as SaleItem[],
    notes: ''
  })

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e._id === formData.employeeId);
  }, [formData.employeeId, employees]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return []
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, products])

  useEffect(() => {
    setSelectedProductIndex(-1)
  }, [searchTerm])

  const detailSummary = useMemo(() => {
    if (!detailSale) return null
    const totalWithdrawn = detailSale.items.reduce(
      (sum, item) => sum + (Number(item.withdrawal) || 0),
      0
    )
    const totalAmount = detailSale.items.reduce(
      (sum, item) => sum + item.pricePerUnit * (Number(item.withdrawal) || 0),
      0
    )
    const totalReturn = detailSale.items.reduce(
      (sum, item) => sum + (Number(item.return) || 0),
      0
    )
    const totalDefective = detailSale.items.reduce(
      (sum, item) => sum + (Number(item.defective) || 0),
      0
    )
    const totalSold = detailSale.items.reduce(
      (sum, item) =>
        sum + (Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0),
      0
    )
    const totalSoldAmount = detailSale.items.reduce(
      (sum, item) =>
        sum + ((Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0)) * item.pricePerUnit,
      0
    )
    return {
      totalWithdrawn,
      totalAmount,
      totalReturn,
      totalDefective,
      totalSold,
      totalSoldAmount
    }
  }, [detailSale])

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch(`/api/sales?page=${page}&limit=${limit}`, { credentials: 'include' }),
        // Fetch all products to ensure search can find every item
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
    setSearchTerm('')
    setEditingSaleId(null)
  }

  const addProductToForm = (product: Product) => {
    if (!selectedEmployee) {
        toast.error("Please select an employee first.");
        return;
    }

    if (!product.prices || product.prices.length === 0) {
        toast.error('This product needs its price levels updated before it can be sold.');
        return;
    }

    const priceInfo = product.prices.find(p => p.level === selectedEmployee.priceLevel);
    if (!priceInfo) {
        toast.error(`Price for level ${selectedEmployee.priceLevel} not found for this product.`);
        return;
    }

    // Show quantity modal instead of directly adding to form
    setSelectedProduct(product)
    setQuantityInput('1')
    setShowQuantityModal(true)
    setSearchTerm('')
    
    // Focus on quantity input after modal opens
    setTimeout(() => {
      quantityInputRef.current?.focus()
      quantityInputRef.current?.select()
    }, 100)
  }

  const confirmQuantityAndAddProduct = () => {
    if (!selectedProduct || !selectedEmployee) return
    
    const quantity = parseInt(quantityInput, 10)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('กรุณากรอกจำนวนที่ถูกต้อง')
      quantityInputRef.current?.focus()
      return
    }

    const priceInfo = selectedProduct.prices.find(p => p.level === selectedEmployee.priceLevel);
    if (!priceInfo) {
        toast.error(`Price for level ${selectedEmployee.priceLevel} not found for this product.`);
        return;
    }

    const existingIndex = formData.items.findIndex(item => item.productId === selectedProduct._id)
    if (existingIndex >= 0) {
      const updatedItems = [...formData.items]
      updatedItems[existingIndex].withdrawal = (Number(updatedItems[existingIndex].withdrawal) || 0) + quantity
      setFormData({ ...formData, items: updatedItems })
      toast.success(`เพิ่มจำนวน ${selectedProduct.name} จำนวน ${quantity} ชิ้น`)
    } else {
      const newItem: SaleItem = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        pricePerUnit: priceInfo.value,
        withdrawal: quantity,
        return: 0,
        defective: 0
      }
      setFormData({ ...formData, items: [...formData.items, newItem] })
      toast.success(`เพิ่มสินค้า ${selectedProduct.name} จำนวน ${quantity} ชิ้น`)
    }
    
    // Close modal and reset
    setShowQuantityModal(false)
    setSelectedProduct(null)
    setQuantityInput('')
    searchInputRef.current?.focus()
  }

  const cancelQuantityInput = () => {
    setShowQuantityModal(false)
    setSelectedProduct(null)
    setQuantityInput('')
    searchInputRef.current?.focus()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredProducts.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedProductIndex(prev => {
        const next = prev + 1
        return next >= filteredProducts.length ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedProductIndex(prev => {
        if (prev === -1) return filteredProducts.length - 1
        return prev === 0 ? filteredProducts.length - 1 : prev - 1
      })
    } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
      e.preventDefault()
      addProductToForm(filteredProducts[selectedProductIndex])
    }
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = [...formData.items]
    const item = newItems[index]
    if (field === 'withdrawal' || field === 'return' || field === 'defective') {
      ;(item[field] as number | '') = value === '' ? '' : parseInt(value, 10)
    }
    setFormData({ ...formData, items: newItems })
  }

  const { totalAmount, totalItems } = useMemo(() => {
    let amount = 0
    let items = 0
    formData.items.forEach(item => {
      const w = Number(item.withdrawal) || 0
      const r = Number(item.return) || 0
      const d = Number(item.defective) || 0
      const netQuantity = w - r - d
      amount += netQuantity * item.pricePerUnit
      items += netQuantity
    })
    return { totalAmount: amount, totalItems: items }
  }, [formData.items])

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

  const getPriceForEmployee = (product: Product, employee: Employee | undefined) => {
      if (!employee || !product.prices) return 0;
      const priceInfo = product.prices.find(p => p.level === employee.priceLevel);
      return priceInfo ? priceInfo.value : 0;
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
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">บันทึกการเบิก</h1>
              <p className="text-gray-600 mt-1">บันทึกการเบิกสินค้า (คืน/เคลมใส่ตอนเคลียบิล)</p>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              size="lg"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              บันทึกการเบิกใหม่
            </Button>
          </div>

          {/* Sales History */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">📋</span>
                </div>
                <CardTitle>ประวัติการเบิก</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile View - Card Layout */}
              <div className="block lg:hidden">
                <div className="space-y-3 p-4">
                  {sales.map((sale) => (
                    <Card key={sale._id} className="bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent>
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">{sale.employeeName}</p>
                              <p className="text-sm text-gray-500">{formatDate(sale.saleDate)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                sale.type === 'เบิก' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {sale.type}
                              </span>
                            </div>
                          </div>
                          
                          {/* Amount and Status */}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                              <button
                                onClick={() => setDetailSale(sale)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                📄 ดูรายละเอียด
                              </button>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-medium ${
                                sale.settled ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                {sale.settled ? 'เคลียบิลแล้ว' : 'รอเคลียบิล'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          {((user?.role === 'admin' || user?.id === sale.employeeId) && !sale.settled) || user?.role === 'admin' ? (
                            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                              {(user?.role === 'admin' || user?.id === sale.employeeId) && !sale.settled && (
                                <Button
                                  onClick={() => handleEdit(sale)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  แก้ไข
                                </Button>
                              )}
                              {user?.role === 'admin' && (
                                <Button
                                  onClick={() => handleDelete(sale._id)}
                                  variant="danger"
                                  size="sm"
                                >
                                  ลบ
                                </Button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* Desktop View - Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จัดการ
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
                        <td className="px-6 py-4 text-sm text-blue-600">
                          <button
                            onClick={() => setDetailSale(sale)}
                            className="hover:underline"
                          >
                            รายละเอียด
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {sale.settled ? (
                            <span className="text-green-600">เคลียบิลแล้ว</span>
                          ) : (
                            <span className="text-yellow-600">รอเคลียบิล</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                          {(user?.role === 'admin' || user?.id === sale.employeeId) && !sale.settled && (
                            <button
                              onClick={() => handleEdit(sale)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(sale._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

          {/* Enhanced Mobile-Friendly Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50 p-4 pb-24 lg:pb-4">
              <div className="relative min-h-screen flex items-center justify-center py-8">
                <Card className="w-full max-w-4xl max-h-[80vh] lg:max-h-[90vh] overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle size="xl">
                        {editingSaleId ? '📝 แก้ไขการเบิก' : '📝 บันทึกการเบิกใหม่'}
                      </CardTitle>
                      <Button
                        onClick={() => setShowModal(false)}
                        variant="ghost"
                        size="sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="max-h-[45vh] lg:max-h-[60vh] overflow-y-auto">
                    <Form onSubmit={handleSubmit}>
                      <div className="space-y-6">
                        {/* Employee Selection */}
                        <FormGroup title="ข้อมูลพนักงาน" description="เลือกพนักงานที่จะทำการเบิก">
                          <Select
                            label="พนักงาน *"
                            value={formData.employeeId}
                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                            options={[
                              { value: '', label: 'เลือกพนักงาน' },
                              ...employees.map(emp => ({ value: emp._id, label: emp.name }))
                            ]}
                            disabled={!!editingSaleId || user?.role === 'employee'}
                            fullWidth
                            placeholder="เลือกพนักงาน"
                          />
                        </FormGroup>

                        {/* Product Search */}
                        <FormGroup title="เพิ่มสินค้า" description="ค้นหาและเลือกสินค้าที่ต้องการเบิก">
                          <div className="relative">
                            <Input
                              label="ค้นหาสินค้า"
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyDown={handleSearchKeyDown}
                              ref={searchInputRef}
                              placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..."
                              leftIcon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              }
                              fullWidth
                            />
                            {filteredProducts.length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {filteredProducts.map((p, index) => (
                                  <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => addProductToForm(p)}
                                    className={`w-full text-left px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 ${
                                      index === selectedProductIndex ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-900">{p.name}</span>
                                      <span className="text-sm text-gray-600">
                                        {formatCurrency(getPriceForEmployee(p, selectedEmployee))}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormGroup>

                        {/* Products List */}
                        {formData.items.length > 0 && (
                          <FormGroup title="รายการสินค้า" description="สินค้าที่เลือกไว้สำหรับการเบิก">
                            {/* Mobile Product Cards */}
                            <div className="block lg:hidden space-y-3">
                              {formData.items.map((item, index) => (
                                <Card key={item.productId} className="bg-gray-50 border border-gray-200">
                                  <CardContent>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                                          <p className="text-sm text-gray-600">ราคา: {formatCurrency(item.pricePerUnit)}</p>
                                        </div>
                                        <Button
                                          type="button"
                                          onClick={() => removeItem(index)}
                                          variant="danger"
                                          size="sm"
                                        >
                                          ลบ
                                        </Button>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          จำนวนเบิก
                                        </label>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={item.withdrawal === '' ? '' : item.withdrawal}
                                          onChange={e => updateItem(index, 'withdrawal', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ราคา</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">เบิก</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {formData.items.map((item, index) => (
                                    <tr key={item.productId}>
                                      <td className="px-4 py-2 whitespace-nowrap">{index + 1}</td>
                                      <td className="px-4 py-2 whitespace-nowrap">{item.productName}</td>
                                      <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(item.pricePerUnit)}</td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={item.withdrawal === '' ? '' : item.withdrawal}
                                          onChange={e => updateItem(index, 'withdrawal', e.target.value)}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">ลบ</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </FormGroup>
                        )}

                        {/* Notes */}
                        <FormGroup title="หมายเหตุ" description="เพิ่มข้อมูลเพิ่มเติม (เลือกได้)">
                          <Textarea
                            label="หมายเหตุ"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
                            rows={3}
                            fullWidth
                          />
                        </FormGroup>
                      </div>
                    </Form>
                  </CardContent>

                  <CardFooter className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl z-20 p-4 lg:p-6">
                    {/* Summary */}
                    <div className="w-full">
                      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 mb-4">
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-sm font-medium text-blue-700">ยอดรวม</p>
                              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-700">จำนวนชิ้นทั้งหมด</p>
                              <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 bg-white border-t border-gray-100">
                        <Button
                          type="button"
                          onClick={() => setShowModal(false)}
                          variant="secondary"
                          size="lg"
                          fullWidth
                          className="sm:w-auto min-h-[52px] touch-manipulation font-medium"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          isLoading={isSubmitting}
                          size="lg"
                          fullWidth
                          className="sm:w-auto min-h-[52px] touch-manipulation font-medium"
                          disabled={formData.items.length === 0}
                        >
                          {editingSaleId ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกการเบิก'}
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
          {/* Enhanced Mobile-Friendly Detail Modal */}
          {detailSale && detailSummary && (
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50 p-4 pb-24 lg:pb-4">
              <div className="relative min-h-screen flex items-center justify-center py-8">
                <Card className="w-full max-w-4xl max-h-[85vh] lg:max-h-[90vh] overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>📄 รายละเอียดการเบิก</CardTitle>
                        <p className="text-gray-600 mt-1">{detailSale.employeeName}</p>
                      </div>
                      <Button
                        onClick={() => setDetailSale(null)}
                        variant="ghost"
                        size="sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="max-h-[55vh] lg:max-h-[60vh] overflow-y-auto">
                    {/* Mobile Cards View */}
                    <div className="block lg:hidden space-y-3">
                      {detailSale.items.map((item, index) => {
                        const sold = detailSale.settled 
                          ? (Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0)
                          : (Number(item.withdrawal) || 0)
                        
                        return (
                          <Card key={index} className="bg-gray-50">
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                                    <p className="text-sm text-gray-600">ราคา: {formatCurrency(item.pricePerUnit)}</p>
                                  </div>
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                    #{index + 1}
                                  </span>
                                </div>
                                
                                {detailSale.settled ? (
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="text-center p-2 bg-blue-100 rounded">
                                      <p className="text-blue-700 font-medium">เบิก</p>
                                      <p className="text-blue-900 font-bold">{item.withdrawal}</p>
                                    </div>
                                    <div className="text-center p-2 bg-green-100 rounded">
                                      <p className="text-green-700 font-medium">คืน</p>
                                      <p className="text-green-900 font-bold">{item.return}</p>
                                    </div>
                                    <div className="text-center p-2 bg-red-100 rounded">
                                      <p className="text-red-700 font-medium">เสีย</p>
                                      <p className="text-red-900 font-bold">{item.defective}</p>
                                    </div>
                                    <div className="text-center p-2 bg-purple-100 rounded">
                                      <p className="text-purple-700 font-medium">ขายได้</p>
                                      <p className="text-purple-900 font-bold">{sold}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="text-center p-3 bg-blue-100 rounded">
                                      <p className="text-blue-700 font-medium">เบิก</p>
                                      <p className="text-blue-900 font-bold text-lg">{item.withdrawal}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-100 rounded">
                                      <p className="text-green-700 font-medium">รวมราคา</p>
                                      <p className="text-green-900 font-bold text-lg">
                                        {formatCurrency((Number(item.withdrawal) || 0) * item.pricePerUnit)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {detailSale.settled && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="text-center">
                                      <p className="text-sm text-gray-600">มูลค่าขายได้</p>
                                      <p className="text-lg font-bold text-gray-900">
                                        {formatCurrency(sold * item.pricePerUnit)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      {detailSale.settled ? (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-500">No.</th>
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
                            {detailSale.items.map((item, index) => {
                              const sold = (Number(item.withdrawal) || 0) - (Number(item.return) || 0) - (Number(item.defective) || 0)
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-2">{index + 1}</td>
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
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-500">No.</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-500">สินค้า</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-500">ราคา</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-500">เบิก</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-500">รวมราคา</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {detailSale.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2">{index + 1}</td>
                                <td className="px-4 py-2">{item.productName}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(item.pricePerUnit)}</td>
                                <td className="px-4 py-2 text-right">{item.withdrawal}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency((Number(item.withdrawal) || 0) * item.pricePerUnit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl z-10">
                    <div className="w-full">
                      {/* Summary Card */}
                      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 mb-4">
                        <CardContent>
                          {detailSale.settled ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-sm font-medium text-indigo-700">ยอดขายรวม</p>
                                <p className="text-lg font-bold text-indigo-900">{formatCurrency(detailSummary.totalSoldAmount)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-indigo-700">ยอดนำส่ง</p>
                                <p className="text-lg font-bold text-indigo-900">
                                  {formatCurrency((detailSale.cashAmount || 0) + (detailSale.transferAmount || 0))}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-indigo-700">ขายได้</p>
                                <p className="text-lg font-bold text-indigo-900">{detailSummary.totalSold} ชิ้น</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-indigo-700">คืน/เสีย</p>
                                <p className="text-lg font-bold text-indigo-900">
                                  {detailSummary.totalReturn + detailSummary.totalDefective} ชิ้น
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                              <div>
                                <p className="text-sm font-medium text-indigo-700">ยอดรวม</p>
                                <p className="text-2xl font-bold text-indigo-900">{formatCurrency(detailSummary.totalAmount)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-indigo-700">จำนวนชิ้น</p>
                                <p className="text-2xl font-bold text-indigo-900">{detailSummary.totalWithdrawn}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Close Button */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => setDetailSale(null)}
                          size="lg"
                          className="min-h-[48px] touch-manipulation"
                          fullWidth
                        >
                          ปิด
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
          
          {/* Quantity Input Modal */}
          {showQuantityModal && selectedProduct && (
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle size="lg">🛒 ระบุจำนวน</CardTitle>
                    <Button
                      onClick={cancelQuantityInput}
                      variant="ghost"
                      size="sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{selectedProduct.name}</h3>
                      <p className="text-sm text-gray-600">
                        ราคา: {formatCurrency(getPriceForEmployee(selectedProduct, selectedEmployee))}
                      </p>
                    </div>
                    
                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        จำนวนที่ต้องการเบิก *
                      </label>
                      <input
                        ref={quantityInputRef}
                        type="text"
                        inputMode="numeric"
                        value={quantityInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers
                          if (value === '' || /^[0-9]+$/.test(value)) {
                            setQuantityInput(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            confirmQuantityAndAddProduct();
                          } else if (e.key === 'Escape') {
                            cancelQuantityInput();
                          }
                        }}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        placeholder="จำนวน"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                      onClick={cancelQuantityInput}
                      variant="secondary"
                      size="lg"
                      fullWidth
                      className="sm:w-auto min-h-[48px] touch-manipulation"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      onClick={confirmQuantityAndAddProduct}
                      size="lg"
                      fullWidth
                      className="sm:w-auto min-h-[48px] touch-manipulation"
                      disabled={!quantityInput || parseInt(quantityInput, 10) <= 0}
                    >
                      เพิ่มสินค้า
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}