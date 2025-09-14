'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import Button from '@/components/Button'
import { Input, Form } from '@/components/Form'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{username?: string; password?: string}>({})
  
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const validateForm = () => {
    const newErrors: {username?: string; password?: string} = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'กรุณากรอกชื่อผู้ใช้'
    }
    
    if (!formData.password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน'
    } else if (formData.password.length < 3) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 3 ตัวอักษร'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: 'username' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('กรุณาตรวจสอบข้อมูลที่กรอก')
      return
    }
    
    setLoading(true)
    setErrors({})

    try {
      await login(formData.username.trim(), formData.password)
      toast.success('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error 
        ? err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      
      // Set field-specific errors if possible
      if (message.includes('ชื่อผู้ใช้') || message.includes('username')) {
        setErrors({ username: 'ไม่พบชื่อผู้ใช้นี้' })
      } else if (message.includes('รหัสผ่าน') || message.includes('password')) {
        setErrors({ password: 'รหัสผ่านไม่ถูกต้อง' })
      }
      
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              เข้าสู่ระบบ
            </h1>
            <p className="text-gray-600 text-base">
              ระบบจัดการขายสินค้า
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <Form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange('username')}
                    placeholder="กรอกชื่อผู้ใช้"
                    className={`w-full pl-10 pr-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    placeholder="กรอกรหัสผ่าน"
                    className={`w-full pl-10 pr-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || !formData.username.trim() || !formData.password}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    กำลังเข้าสู่ระบบ...
                  </div>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </button>
            </div>
          </Form>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <h3 className="font-medium text-blue-900 mb-2 text-sm">
              ข้อมูลสำหรับทดสอบ
            </h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>ผู้จัดการ:</strong> admin / admin123</p>
              <p><strong>พนักงาน:</strong> employee1 / emp123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

