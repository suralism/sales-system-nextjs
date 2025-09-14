
'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { Form } from '@/components/Form'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        position: user.position,
        phone: user.phone,
        email: user.email,
        password: '',
        confirmPassword: ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน')
      return
    }

    setLoading(true)
    
    try {
      const submitData: Record<string, unknown> = {
        name: formData.name,
        position: formData.position,
        phone: formData.phone,
        email: formData.email
      }

      if (formData.password) {
        submitData.password = formData.password
      }
      
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('อัปเดตข้อมูลสำเร็จ')
        setFormData({
          ...formData,
          password: '',
          confirmPassword: ''
        })
      } else {
        const error = await response.json()
        toast.error(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">👤 ข้อมูลส่วนตัว</h1>
          <p className="text-gray-600 mb-6">จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ</p>

          <Form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Personal Info Section */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลส่วนตัว</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ-นามสกุล *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                      ตำแหน่ง *
                    </label>
                    <input
                      id="position"
                      type="text"
                      required
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสผ่านใหม่
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      placeholder="เว้นว่างหากไม่ต้องการเปลี่ยน"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      ยืนยันรหัสผ่านใหม่
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3"
                      placeholder="ยืนยันรหัสผ่านใหม่"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      กำลังบันทึก...
                    </div>
                  ) : (
                    'บันทึกการเปลี่ยนแปลง'
                  )}
                </button>
              </div>
            </div>
          </Form>

          {/* Account Info Display */}
          <div className="bg-white rounded-lg shadow p-4 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลบัญชี</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ชื่อผู้ใช้:</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">สิทธิ์การใช้งาน:</span>
                <span className="font-medium">
                  {user?.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">อีเมล:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}


