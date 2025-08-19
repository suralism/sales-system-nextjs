'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  Input, 
  Button, 
  Link 
} from '@nextui-org/react'
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false);
  
  const { login } = useAuth()
  const router = useRouter()

  const toggleVisibility = () => setIsVisible(!isVisible);

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
      <Card className="max-w-md w-full p-6">
        <CardHeader className="flex flex-col items-center pb-4">
          <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-default-500">ระบบบันทึกข้อมูลขายพนักงาน</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              isRequired
              label="ชื่อผู้ใช้"
              placeholder="กรอกชื่อผู้ใช้ของคุณ"
              value={username}
              onValueChange={setUsername}
              isInvalid={!username && username.length > 0}
              errorMessage="กรุณากรอกชื่อผู้ใช้"
            />
            <Input
              isRequired
              label="รหัสผ่าน"
              placeholder="กรอกรหัสผ่านของคุณ"
              value={password}
              onValueChange={setPassword}
              endContent={
                <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                  {isVisible ? (
                    <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <Eye className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              type={isVisible ? "text" : "password"}
              isInvalid={!password && password.length > 0}
              errorMessage="กรุณากรอกรหัสผ่าน"
            />
            <Button type="submit" color="primary" isLoading={loading} fullWidth>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>
        </CardBody>
        <CardFooter className="flex flex-col items-center pt-4">
            <p className="text-sm text-default-500">บัญชีทดสอบ:</p>
            <p className="font-mono text-sm">admin / admin123</p>
        </CardFooter>
      </Card>
    </div>
  )
}

