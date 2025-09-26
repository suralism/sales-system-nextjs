'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Alert,
  message
} from 'antd'
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{username?: string; password?: string}>({})
  const [messageApi, contextHolder] = message.useMessage()
  
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    setErrors({})

    try {
      await login(values.username.trim(), values.password)
      messageApi.success('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ')
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
      
      messageApi.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {contextHolder}
      <div style={{ 
        minHeight: '100vh', 
        background: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px' 
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Logo and Title */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                background: '#1677ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)'
              }}>
                <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>S</Text>
              </div>
              <Title level={2} style={{ margin: '0 0 8px' }}>
                เข้าสู่ระบบ
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                ระบบจัดการขายสินค้า
              </Text>
            </div>

            {/* Login Form */}
            <Card>
              <Form onFinish={handleSubmit} layout="vertical" size="large">
                <Form.Item
                  name="username"
                  label="ชื่อผู้ใช้"
                  rules={[
                    { required: true, message: 'กรุณากรอกชื่อผู้ใช้' },
                  ]}
                  validateStatus={errors.username ? 'error' : ''}
                  help={errors.username}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="กรอกชื่อผู้ใช้"
                    autoComplete="username"
                    disabled={loading}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="รหัสผ่าน"
                  rules={[
                    { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                    { min: 3, message: 'รหัสผ่านต้องมีอย่างน้อย 3 ตัวอักษร' }
                  ]}
                  validateStatus={errors.password ? 'error' : ''}
                  help={errors.password}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                  >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Info Card */}
            <Alert
              message="ข้อมูลสำหรับทดสอบ"
              description={
                <div style={{ textAlign: 'center' }}>
                  <Text strong>ผู้จัดการ:</Text> admin / admin123<br />
                  <Text strong>พนักงาน:</Text> employee1 / emp123
                </div>
              }
              type="info"
              showIcon
            />
          </Space>
        </div>
      </div>
    </>
  )
}

