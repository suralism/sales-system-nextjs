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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              เข้าสู่ระบบ
            </h1>
            <p className="text-gray-600 text-lg">
              ระบบจัดการขายสินค้า
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card shadow="xl" padding="lg" className="backdrop-blur-sm bg-white/80">
          <Form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Input
                label="ชื่อผู้ใช้"
                type="text"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={errors.username}
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                fullWidth
                autoComplete="username"
                disabled={loading}
              />

              <Input
                label="รหัสผ่าน"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                placeholder="กรอกรหัสผ่านของคุณ"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                fullWidth
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <div className="mt-8">
              <Button
                type="submit"
                isLoading={loading}
                fullWidth
                size="lg"
                disabled={loading || !formData.username.trim() || !formData.password}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </div>
          </Form>
        </Card>

        {/* Info Card */}
        <Card padding="md" className="bg-blue-50/50 border border-blue-100">
          <div className="text-center">
            <h3 className="font-semibold text-blue-900 mb-2">
              ข้อมูลสำหรับทดสอบ
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>👥 <strong>ผู้จัดการ:</strong> admin / admin123</p>
              <p>👤 <strong>พนักงาน:</strong> employee1 / emp123</p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>ลิขสิทธิ์สงวนไว้ © 2024</p>
          <p className="mt-1">ระบบจัดการขายสินค้า</p>
        </div>
      </div>
    </div>
  )
}

