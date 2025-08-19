'use client'

import { useEffect, useState, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import toast from 'react-hot-toast';
import { CATEGORY_TYPES, CategoryType } from '../../../lib/constants'

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
  price?: number; // Keep optional for old data
  stock: number
  description?: string
  category?: CategoryType
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const priceLevels = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    prices: priceLevels.map(level => ({ level, value: '' as string | number })),
    stock: '',
    description: '',
    category: '' as CategoryType | ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      } else {
        toast.error('Failed to fetch products.');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to fetch products.');
    } finally {
      setLoading(false)
    }
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
          return {...p, value: parseFloat(p.value as string) };
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          prices: processedPrices,
          stock: parseInt(formData.stock),
          description: formData.description,
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
      stock: product.stock.toString(),
      description: product.description || '',
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
      stock: '',
      description: '',
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
      currency: 'THB'
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
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการสินค้า</h1>
              <p className="text-gray-600">เพิ่ม แก้ไข และจัดการสินค้าในระบบ</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="space-x-2">
                <button
                  onClick={handleImportClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  นำเข้าจาก CSV
                </button>
                <button
                  onClick={() => {
                    resetForm()
                    setShowModal(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  เพิ่มสินค้าใหม่
                </button>
              </div>
              <a
                href="/sample-products.csv"
                download
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                ดาวน์โหลดไฟล์ตัวอย่าง
              </a>
            </div>
          </div>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
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
                      สต็อก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การจัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const needsUpdate = !product.prices || product.prices.length === 0;
                    const isEditing = editingProductId === product._id;
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
                                type="number"
                                value={price.value}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {needsUpdate && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
                              รออัปเดต
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleSubmit()}
                            className="text-green-600 hover:text-green-900"
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
                      <tr key={product._id} className={`hover:bg-gray-50 ${needsUpdate ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">{product.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(getNormalPrice(product))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.stock <= 10
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock} ชิ้น
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {needsUpdate && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
                                  รออัปเดต
                              </span>
                          )}
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
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อสินค้า *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {formData.prices.map((price, index) => (
                        <div key={index}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {price.level} (บาท) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={price.value}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    ))}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำนวนสต็อก *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมวดหมู่ *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>เลือกหมวดหมู่</option>
                        {CATEGORY_TYPES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รายละเอียด
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                        {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
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

