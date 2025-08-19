'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import Button from '@/components/Button'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(username, password)
      toast.success('เข้าสู่ระบบสำเร็จ')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
          : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              เข้าสู่ระบบ
            </h2>
            <p className="text-gray-600">
              ระบบบันทึกข้อมูลขายพนักงาน
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="กรอกรหัสผ่าน"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>บัญชีทดสอบ:</p>
            <p className="font-mono">admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

