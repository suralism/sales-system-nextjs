
'use client'

import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import { Form } from '@/components/Form'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface Employee {
  _id: string
  username: string
  email: string
  name: string
  position: string
  phone: string
  role: 'admin' | 'employee'
  priceLevel: 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ';
  creditLimit: number
  creditUsed: number
  creditRemaining: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const priceLevels = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'];

export default function EmployeesPage() {
  const { loginAs } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    position: '',
    phone: '',
    role: 'employee' as 'admin' | 'employee',
    priceLevel: 'ราคาปกติ' as Employee['priceLevel'],
    creditLimit: '0'
  })

  const fetchEmployees = useCallback(async () => {
    try {
      console.log('Fetching employees data...')
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Employee data received:', data.users)
        setEmployees(data.users)
        setTotal(data.pagination?.total || 0)
      } else {
        console.error('Failed to fetch employees, status:', response.status)
        toast.error('Failed to fetch employees.');
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      toast.error('Failed to fetch employees.');
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingEmployee ? `/api/users/${editingEmployee._id}` : '/api/users'
      const method = editingEmployee ? 'PUT' : 'POST'

      const submitData: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        name: formData.name,
        position: formData.position,
        phone: formData.phone,
        role: formData.role,
        priceLevel: formData.priceLevel,
        creditLimit: Math.max(0, Number(formData.creditLimit) || 0)
      }

      if (formData.password) {
        submitData.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
        credentials: 'include'
      })

      if (response.ok) {
        toast.success(`Employee ${editingEmployee ? 'updated' : 'created'} successfully!`)
        await fetchEmployees()
        setShowModal(false)
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'An error occurred.')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('An error occurred while saving employee data.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      username: employee.username,
      email: employee.email,
      password: '',
      name: employee.name,
      position: employee.position,
      phone: employee.phone,
      role: employee.role,
      priceLevel: employee.priceLevel || 'ราคาปกติ',
      creditLimit: String(employee.creditLimit ?? 0)
    })
    setShowModal(true)
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('Employee deleted successfully');
        await fetchEmployees()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete employee.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred while deleting employee.')
    }
  }

  const handleLoginAs = async (employee: Employee) => {
    if (!confirm(`คุณต้องการเข้าดูข้อมูลในฐานะ ${employee.name} หรือไม่?`)) return

    try {
      await loginAs(employee._id)
      toast.success(`เข้าดูข้อมูลในฐานะ ${employee.name} สำเร็จ`)
      // Optionally redirect to dashboard or stay on current page
      // window.location.href = '/dashboard'
    } catch (error) {
      console.error('Login as error:', error)
      toast.error('ไม่สามารถเข้าดูข้อมูลได้')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      position: '',
      phone: '',
      role: 'employee',
      priceLevel: 'ราคาปกติ',
      creditLimit: '0'
    })
    setEditingEmployee(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
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
      <Layout enablePullToRefresh={true} onRefresh={fetchEmployees}>
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">👥 จัดการพนักงาน</h1>
          <p className="text-gray-600 mb-6">เพิ่ม แก้ไข และจัดการข้อมูลพนักงาน</p>

          <div className="flex justify-between items-center mb-4">
            <button
              onClick={fetchEmployees}
              className="bg-green-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              🔄 รีเฟรช
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              + เพิ่มพนักงานใหม่
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              ยังไม่มีพนักงานในระบบ
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">@{employee.username}</p>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {employee.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-sm font-medium text-gray-700">ระดับราคา: <span className="font-normal">{employee.priceLevel}</span></p>
                    <p className="text-sm font-medium text-gray-700">เบอร์ติดต่อ: <span className="font-normal">{employee.phone}</span></p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-blue-600">เครดิตทั้งหมด</p>
                        <p className="text-sm font-semibold text-blue-900">{formatCurrency(employee.creditLimit)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-xs text-orange-600">ใช้ไปแล้ว</p>
                        <p className="text-sm font-semibold text-orange-900">{formatCurrency(employee.creditUsed)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-green-600">คงเหลือ</p>
                        <p className="text-sm font-semibold text-green-900">{formatCurrency(employee.creditRemaining)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    {employee.role === 'employee' && (
                      <button
                        onClick={() => handleLoginAs(employee)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        ดูข้อมูล
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(employee)}
                      className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(employee._id)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      ลบ
                    </button>
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

          {/* Add/Edit Employee Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{editingEmployee ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
                <Form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้</label>
                      <input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน {editingEmployee && '(เว้นว่างหากไม่ต้องการเปลี่ยน)'}</label>
                      <input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        {...(!editingEmployee && { required: true })}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                      <input
                        id="position"
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">สิทธิ์การใช้งาน</label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        <option value="employee">พนักงาน</option>
                        <option value="admin">ผู้จัดการ</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="priceLevel" className="block text-sm font-medium text-gray-700 mb-1">ระดับราคา</label>
                      <select
                        id="priceLevel"
                        value={formData.priceLevel}
                        onChange={(e) => setFormData({ ...formData, priceLevel: e.target.value as Employee['priceLevel'] })}
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      >
                        {priceLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700 mb-1">เครดิต (บาท)</label>
                      <input
                        id="creditLimit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      />
                      <p className="text-xs text-gray-500 mt-1">กำหนดวงเงินที่พนักงานสามารถเบิกได้</p>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetForm() }}
                        className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-base font-medium hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            กำลังบันทึก...
                          </div>
                        ) : (
                          editingEmployee ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'
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
