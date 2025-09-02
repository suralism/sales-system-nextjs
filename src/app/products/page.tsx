'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import { CATEGORY_TYPES, CategoryType } from '../../../lib/constants'
import Button from '@/components/Button'
import { Input, Select } from '@/components/Form'
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/Card'

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
  price?: number; // Keep optional for old data
  category?: CategoryType
  createdAt: string
  updatedAt: string
}

const priceLevels = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    prices: priceLevels.map(level => ({ level, value: '' as string | number })),
    category: '' as CategoryType | ''
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      const response = await fetch(`/api/products?page=${page}&limit=${limit}${searchQuery}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        setTotal(data.pagination?.total || 0)
      } else {
        toast.error('Failed to fetch products.');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to fetch products.');
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(`นำเข้าสำเร็จ ${data.imported} รายการ, ข้าม ${data.skipped} รายการ`)
        await fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Import failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const processedPrices = formData.prices.map(p => {
          if (p.value === '' || isNaN(parseFloat(p.value as string))) {
              throw new Error(`Price for level ${p.level} is invalid.`);
          }
          return {
              ...p,
              value: parseFloat(parseFloat(p.value as string).toFixed(4))
          };
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          prices: processedPrices,
          category: formData.category
        }),
        credentials: 'include'
      })

      if (response.ok) {
        toast.success(`Product ${editingProduct ? 'updated' : 'created'} successfully!`)
        await fetchProducts()
        setShowModal(false)
        setEditingProductId(null)
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'An error occurred.')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error((error as Error).message || 'An error occurred while saving the product.')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setEditingProductId(product._id)
    const newPrices = priceLevels.map(level => {
        // If new price structure exists, use it
        if (product.prices && product.prices.length > 0) {
            const price = product.prices.find(p => p.level === level);
            return { level, value: price ? price.value.toString() : '' };
        }
        // Otherwise, it's old data. Use old price for 'ราคาปกติ'
        if (level === 'ราคาปกติ' && product.price) {
            return { level, value: product.price.toString() };
        }
        return { level, value: '' };
    });

    setFormData({
      name: product.name,
      prices: newPrices,
      category: product.category || ''
    })
  }

  const cancelEdit = () => {
    setEditingProductId(null)
    resetForm()
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('Product deleted successfully');
        await fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete product.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred while deleting the product.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      prices: priceLevels.map(level => ({ level, value: '' as string | number})),
      category: '' as CategoryType | ''
    })
    setEditingProduct(null)
  }

  const handlePriceChange = (index: number, value: string) => {
      const newPrices = [...formData.prices];
      newPrices[index].value = value;
      setFormData({...formData, prices: newPrices});
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getNormalPrice = (product: Product) => {
      if (product.prices && product.prices.length > 0) {
          const price = product.prices.find(p => p.level === 'ราคาปกติ');
          return price ? price.value : 0;
      }
      return product.price || 0; // Fallback to old price field
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

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout enablePullToRefresh={true} onRefresh={fetchProducts}>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📦 จัดการสินค้า</h1>
              <p className="text-gray-600 mt-1">เพิ่ม แก้ไข และจัดการสินค้าในระบบ</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleImportClick}
                variant="success"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                }
              >
                นำเข้า CSV
              </Button>
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
                เพิ่มสินค้าใหม่
              </Button>
            </div>
          </div>

          {/* Download Sample Link */}
          <div className="text-center sm:text-right">
            <a
              href="/sample-products.csv"
              download
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              📄 ดาวน์โหลดไฟล์ตัวอย่าง
            </a>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Search Section */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSearch}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="ค้นหาสินค้า..."
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      }
                      fullWidth
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="sm:w-auto w-full"
                  >
                    ค้นหา
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Products Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">📦</span>
                </div>
                <CardTitle>รายการสินค้า</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile View - Card Layout */}
              <div className="block lg:hidden">
                <div className="space-y-3 p-4">
                  {products.map((product) => {
                    const needsUpdate = !product.prices || product.prices.length === 0
                    const isEditing = editingProductId === product._id
                    return isEditing ? (
                      <Card key={product._id} className="bg-yellow-50 border-2 border-yellow-200">
                        <CardContent className="p-4">
                          <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                              <Input
                                label="ชื่อสินค้า"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                fullWidth
                              />
                              
                              {formData.prices.map((price, index) => (
                                <Input
                                  key={price.level}
                                  label={`${price.level} (บาท)`}
                                  type="text"
                                  inputMode="decimal"
                                  value={price.value}
                                  onChange={(e) => handlePriceChange(index, e.target.value)}
                                  fullWidth
                                />
                              ))}
                              
                              <Select
                                label="หมวดหมู่"
                                value={formData.category}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                                options={CATEGORY_TYPES.map(cat => ({ value: cat, label: cat }))}
                                fullWidth
                              />
                              
                              <div className="flex gap-3 pt-2">
                                <Button
                                  type="submit"
                                  variant="success"
                                  size="lg"
                                  fullWidth
                                >
                                  บันทึก
                                </Button>
                                <Button
                                  type="button"
                                  onClick={cancelEdit}
                                  variant="secondary"
                                  size="lg"
                                  fullWidth
                                >
                                  ยกเลิก
                                </Button>
                              </div>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card key={product._id} className={`hover:shadow-md transition-shadow ${
                        needsUpdate ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header Row */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{product.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">หมวดหมู่: {product.category || '-'}</p>
                                {needsUpdate && (
                                  <div className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full mt-2">
                                    ต้องอัปเดตราคา
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Price Display */}
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(getNormalPrice(product))}
                              </p>
                              <p className="text-sm text-gray-500">ราคาปกติ</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2 border-t border-gray-200">
                              <Button
                                onClick={() => handleEdit(product)}
                                variant="secondary"
                                size="lg"
                                fullWidth
                                leftIcon={
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                }
                              >
                                แก้ไข
                              </Button>
                              <Button
                                onClick={() => handleDelete(product._id)}
                                variant="danger"
                                size="lg"
                                fullWidth
                                leftIcon={
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                }
                              >
                                ลบ
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
              
              {/* Desktop View - Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สินค้า
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ราคา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        หมวดหมู่
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => {
                      const needsUpdate = !product.prices || product.prices.length === 0
                      const isEditing = editingProductId === product._id
                      return isEditing ? (
                        <tr key={product._id} className="bg-yellow-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 space-y-1">
                            {formData.prices.map((price, index) => (
                              <div key={price.level} className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 w-24">{price.level}</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={price.value}
                                  onChange={(e) => handlePriceChange(index, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <select
                              value={formData.category}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            >
                              {CATEGORY_TYPES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleSubmit()}
                              className="text-green-600 hover:text-green-900 transform transition-all hover:scale-105 active:scale-95"
                              type="button"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-900"
                              type="button"
                            >
                              ยกเลิก
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={product._id} className={`hover:bg-gray-50 ${
                          needsUpdate ? 'bg-yellow-50' : ''
                        }`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              {needsUpdate && (
                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  ต้องอัปเดต
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(getNormalPrice(product))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.category || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDelete(product._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

          {/* Enhanced Mobile-Friendly Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50 p-4">
              <div className="relative min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle size="xl">
                        {editingProduct ? '📝 แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}
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
                  
                  <CardContent className="max-h-[70vh] overflow-y-auto p-6">
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-6">
                        {/* Product Name */}
                        <div className="space-y-4">
                          <div className="border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-medium text-gray-900">ข้อมูลสินค้า</h3>
                            <p className="text-sm text-gray-600 mt-1">ระบุชื่อและหมวดหมู่ของสินค้า</p>
                          </div>
                          <div className="space-y-4">
                            <Input
                              label="ชื่อสินค้า *"
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="กรอกชื่อสินค้า"
                              required
                              fullWidth
                            />
                            
                            <Select
                              label="หมวดหมู่ *"
                              value={formData.category}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                              options={[
                                { value: '', label: 'เลือกหมวดหมู่' },
                                ...CATEGORY_TYPES.map(cat => ({ value: cat, label: cat }))
                              ]}
                              required
                              fullWidth
                            />
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                          <div className="border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-medium text-gray-900">การกำหนดราคา</h3>
                            <p className="text-sm text-gray-600 mt-1">กำหนดราคาสำหรับแต่ละระดับลูกค้า</p>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {formData.prices.map((price, index) => (
                                <Input
                                  key={index}
                                  label={`${price.level} (บาท) *`}
                                  type="text"
                                  inputMode="decimal"
                                  value={price.value}
                                  onChange={(e) => handlePriceChange(index, e.target.value)}
                                  placeholder="0.00"
                                  required
                                  fullWidth
                                  rightIcon={
                                    <span className="text-gray-400 text-sm">บาท</span>
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                  
                  <CardFooter>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Button
                        onClick={() => setShowModal(false)}
                        variant="secondary"
                        size="lg"
                        fullWidth
                        className="sm:w-auto"
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        onClick={(e: any) => handleSubmit(e)}
                        size="lg"
                        fullWidth
                        className="sm:w-auto"
                        leftIcon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        }
                      >
                        {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

