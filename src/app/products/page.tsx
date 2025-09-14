
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import { CATEGORY_TYPES, CategoryType } from '../../../lib/constants'
import { Form } from '@/components/Form'

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
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
        setEditingProduct(null)
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
    const newPrices = priceLevels.map(level => {
        if (product.prices && product.prices.length > 0) {
            const price = product.prices.find(p => p.level === level);
            return { level, value: price ? price.value.toString() : '' };
        }
        if (level === 'ราคาปกติ' && product.prices) {
            const normalPrice = product.prices.find(p => p.level === 'ราคาปกติ');
            return { level, value: normalPrice ? normalPrice.value.toString() : '' };
        }
        return { level, value: '' };
    });

    setFormData({
      name: product.name,
      prices: newPrices,
      category: product.category || ''
    })
    setShowModal(true)
  }

  const cancelEdit = () => {
    setEditingProduct(null)
    resetForm()
    setShowModal(false)
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
      return 0;
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
      <Layout>
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">📦 จัดการสินค้า</h1>
          <p className="text-gray-600 mb-6">เพิ่ม แก้ไข และจัดการสินค้าในระบบ</p>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <div className="w-full sm:w-auto">
              <form onSubmit={handleSearch} className="flex w-full">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ค้นหาสินค้า..."
                  className="flex-1 border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white py-2 px-4 rounded-r-md text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  ค้นหา
                </button>
              </form>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleImportClick}
                className="bg-green-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors w-full"
              >
                นำเข้า CSV
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full"
              >
                + เพิ่มสินค้าใหม่
              </button>
            </div>
          </div>

          <div className="text-right mb-4">
            <a
              href="/sample-products.csv"
              download
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              📄 ดาวน์โหลดไฟล์ตัวอย่าง
            </a>
          </div>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              ยังไม่มีสินค้าในระบบ
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const needsUpdate = !product.prices || product.prices.length === 0
                return (
                  <div key={product._id} className={`bg-white rounded-lg shadow p-4 ${
                    needsUpdate ? 'border-l-4 border-yellow-500' : ''
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">หมวดหมู่: {product.category || '-'}</p>
                        {needsUpdate && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                            ต้องอัปเดตราคา
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <p className="text-sm font-medium text-gray-700">ราคา:</p>
                      {product.prices && product.prices.length > 0 ? (
                        product.prices.map(price => (
                          <p key={price.level} className="text-sm text-gray-600 ml-2">
                            - {price.level}: {formatCurrency(price.value)}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600 ml-2">- ราคาปกติ: {formatCurrency(getNormalPrice(product))}</p>
                      )}
                    </div>
                  </div>
                )
              })}
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

          {/* Add/Edit Product Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
                <Form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
                      <input
                        id="productName"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>

                    <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">ราคา</h3>
                    {formData.prices.map((price, index) => (
                      <div key={price.level}>
                        <label htmlFor={`price-${price.level}`} className="block text-sm font-medium text-gray-700 mb-1">{price.level} (บาท)</label>
                        <input
                          id={`price-${price.level}`}
                          type="text"
                          inputMode="decimal"
                          value={price.value}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          required
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                        />
                      </div>
                    ))}

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        <option value="">เลือกหมวดหมู่</option>
                        {CATEGORY_TYPES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
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


