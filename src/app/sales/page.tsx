'use client'

import { useEffect, useState, useMemo } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast';

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
  stock: number
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
  withdrawal: number
  return: number
  defective: number
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
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    if(user) {
        fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch('/api/sales', { credentials: 'include' }),
        fetch('/api/products', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' })
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
        setEmployees(employeesData.users)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const processedItems = formData.items.map(item => ({
        productId: item.productId,
        withdrawal: item.withdrawal,
        return: item.return,
        defective: item.defective,
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
        toast.success(editingSaleId ? 'อัปเดตการขายสำเร็จ' : 'บันทึกการขายสำเร็จ')
      } else {
        const error = await response.json()
        toast.error(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
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

    if (formData.items.some(item => item.productId === product._id)) {
      toast.error('This product is already in the list.')
      return
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

    const newItem: SaleItem = {
      productId: product._id,
      productName: product.name,
      pricePerUnit: priceInfo.value,
      withdrawal: 1,
      return: 0,
      defective: 0
    }
    setFormData({ ...formData, items: [...formData.items, newItem] })
    setSearchTerm('')
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = [...formData.items]
    const item = newItems[index]
    if (field === 'withdrawal' || field === 'return' || field === 'defective') {
        (item[field] as number) = parseInt(value, 10) || 0;
    }
    setFormData({ ...formData, items: newItems })
  }

  const { totalAmount, totalItems } = useMemo(() => {
    let amount = 0
    let items = 0
    formData.items.forEach(item => {
      const netQuantity = item.withdrawal - item.return - item.defective;
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
      currency: 'THB'
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
                              {item.productName} - เบิก {item.withdrawal}, คืน {item.return}, เสีย {item.defective}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        {(user?.role === 'admin' || user?.id === sale.employeeId) && (
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
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingSaleId ? 'แก้ไขการขาย' : 'บันทึกการขายใหม่'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        พนักงาน *
                      </label>
                      <select
                        required
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        disabled={!!editingSaleId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">เลือกพนักงาน</option>
                        {employees.map((employee) => (
                          <option key={employee._id} value={employee._id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ค้นหาสินค้า
                      </label>
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..."
                      />
                      {filteredProducts.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                          {filteredProducts.map(p => (
                            <div 
                              key={p._id}
                              onClick={() => addProductToForm(p)}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {p.name} ({formatCurrency(getPriceForEmployee(p, selectedEmployee))})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ราคา</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">เบิก</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">คืน</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ของเสีย</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={item.productId}>
                              <td className="px-4 py-2 whitespace-nowrap">{item.productName}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(item.pricePerUnit)}</td>
                              <td className="px-4 py-2">
                                <input 
                                  type="number"
                                  min="0"
                                  value={item.withdrawal}
                                  onChange={e => updateItem(index, 'withdrawal', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input 
                                  type="number"
                                  min="0"
                                  value={item.return}
                                  onChange={e => updateItem(index, 'return', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input 
                                  type="number"
                                  min="0"
                                  value={item.defective}
                                  onChange={e => updateItem(index, 'defective', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
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

                    <div className="bg-gray-50 p-4 rounded-md flex justify-between items-center">
                      <div className="text-lg font-medium text-gray-900">
                        ยอดรวม: {formatCurrency(totalAmount)}
                      </div>
                      <div className="text-lg font-medium text-gray-900">
                        จำนวนชิ้นทั้งหมด: {totalItems}
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
                        {editingSaleId ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกการขาย'}
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