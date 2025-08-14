'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'

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
      alert('รหัสผ่านไม่ตรงกัน')
      return
    }

    setLoading(true)
    
    try {
      const submitData: any = {
        name: formData.name,
        position: formData.position,
        phone: formData.phone,
        email: formData.email
      }

      // Only include password if it's provided
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
        alert('อัปเดตข้อมูลสำเร็จ')
        // Clear password fields
        setFormData({
          ...formData,
          password: '',
          confirmPassword: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ข้อมูลส่วนตัว</h1>
            <p className="text-gray-600">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลบัญชี</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อผู้ใช้
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">ไม่สามารถเปลี่ยนแปลงได้</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      สิทธิ์การใช้งาน
                    </label>
                    <input
                      type="text"
                      value={user?.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Info Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลส่วนตัว</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ-นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ตำแหน่ง *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสผ่านใหม่
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="เว้นว่างหากไม่ต้องการเปลี่ยน"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ยืนยันรหัสผ่านใหม่
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ยืนยันรหัสผ่านใหม่"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg shadow p-6">
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

