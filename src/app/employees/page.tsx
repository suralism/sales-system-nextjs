'use client'

import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Pagination from '@/components/Pagination'
import Button from '@/components/Button'
import { Input, Select } from '@/components/Form'
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/Card'
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
    priceLevel: 'ราคาปกติ' as Employee['priceLevel']
  })

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.users)
        setTotal(data.pagination?.total || 0)
      } else {
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
        priceLevel: formData.priceLevel
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
      priceLevel: employee.priceLevel || 'ราคาปกติ'
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
      priceLevel: 'ราคาปกติ'
    })
    setEditingEmployee(null)
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
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 จัดการพนักงาน</h1>
              <p className="text-gray-600 mt-1">เพิ่ม แก้ไข และจัดการข้อมูลพนักงาน</p>
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
              เพิ่มพนักงานใหม่
            </Button>
          </div>

          {/* Employees Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">👥</span>
                </div>
                <CardTitle>รายการพนักงาน</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile View - Card Layout */}
              <div className="block lg:hidden">
                <div className="space-y-3 p-4">
                  {employees.map((employee) => (
                    <Card key={employee._id} className="bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">@{employee.username}</p>
                              <p className="text-sm text-gray-600 mt-1">{employee.position}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                employee.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {employee.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Price Level & Contact */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-sm text-gray-500">ระดับราคา</p>
                              <p className="font-medium text-gray-900">{employee.priceLevel}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-sm text-gray-500">เบอร์ติดต่อ</p>
                              <p className="font-medium text-gray-900">{employee.phone}</p>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2 border-t border-gray-200">
                            {employee.role === 'employee' && (
                              <Button
                                onClick={() => handleLoginAs(employee)}
                                variant="success"
                                size="sm"
                                fullWidth
                                leftIcon={
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                }
                              >
                                ดูข้อมูล
                              </Button>
                            )}
                            <Button
                              onClick={() => handleEdit(employee)}
                              variant="secondary"
                              size="sm"
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
                              onClick={() => handleDelete(employee._id)}
                              variant="danger"
                              size="sm"
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
                  ))}
                </div>
              </div>
              
              {/* Desktop View - Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ข้อมูลพนักงาน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ตำแหน่ง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ระดับราคา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สิทธิ์
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">@{employee.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.priceLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {employee.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          {employee.role === 'employee' && (
                            <button
                              onClick={() => handleLoginAs(employee)}
                              className="text-green-600 hover:text-green-900"
                              title="เข้าดูข้อมูลในฐานะพนักงาน"
                            >
                              ดูข้อมูล
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(employee._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            ลบ
                          </button>
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
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50 p-4">
              <div className="relative min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle size="xl">
                        {editingEmployee ? '📝 แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานใหม่'}
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
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <div className="border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-medium text-gray-900">ข้อมูลพื้นฐาน</h3>
                            <p className="text-sm text-gray-600 mt-1">ข้อมูลติดต่อและผู้ใช้งาน</p>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Input
                                label="ชื่อผู้ใช้ *"
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="กรอกชื่อผู้ใช้"
                                disabled={!!editingEmployee}
                                required
                                fullWidth
                              />
                              
                              <Input
                                label="อีเมล *"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="example@company.com"
                                required
                                fullWidth
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Input
                                label="ชื่อ-นามสกุล *"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="กรอกชื่อและนามสกุล"
                                required
                                fullWidth
                              />
                              
                              <Input
                                label="ตำแหน่ง *"
                                type="text"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                placeholder="เช่น พนักงานขาย"
                                required
                                fullWidth
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Input
                                label="เบอร์โทรศัพท์ *"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="08x-xxx-xxxx"
                                required
                                fullWidth
                              />
                              
                              <Input
                                label={`รหัสผ่าน ${editingEmployee ? '(เว้นว่างหากไม่ต้องการเปลี่ยน)' : '*'}`}
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="กรอกรหัสผ่าน"
                                required={!editingEmployee}
                                fullWidth
                              />
                            </div>
                          </div>
                        </div>

                        {/* Permissions & Settings */}
                        <div className="space-y-4">
                          <div className="border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-medium text-gray-900">สิทธิ์และการตั้งค่า</h3>
                            <p className="text-sm text-gray-600 mt-1">กำหนดสิทธิ์การใช้งานและระดับราคา</p>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Select
                                label="สิทธิ์การใช้งาน *"
                                value={formData.role}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                                options={[
                                  { value: 'employee', label: 'พนักงาน' },
                                  { value: 'admin', label: 'ผู้จัดการ' }
                                ]}
                                required
                                fullWidth
                              />
                              
                              <Select
                                label="ระดับราคา *"
                                value={formData.priceLevel}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priceLevel: e.target.value as Employee['priceLevel'] })}
                                options={priceLevels.map(level => ({ value: level, label: level }))}
                                required
                                fullWidth
                              />
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
                        type="submit"
                        onClick={(e: any) => handleSubmit(e)}
                        isLoading={submitting}
                        size="lg"
                        fullWidth
                        className="sm:w-auto"
                        leftIcon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        }
                      >
                        {editingEmployee ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
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

