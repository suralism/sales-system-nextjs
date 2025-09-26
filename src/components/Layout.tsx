'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Layout as AntLayout, 
  Menu, 
  Button, 
  Avatar, 
  Dropdown, 
  Typography, 
  Space, 
  Badge, 
  Drawer,
  theme,
  message,
  Switch
} from 'antd'
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  InboxOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  SwapOutlined,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons'
import { useTheme } from '@/contexts/ThemeContext'
import GestureHandler, { SwipeDirection } from '@/components/GestureHandler'
import PullToRefresh from '@/components/PullToRefresh'
import { useHaptics } from '@/lib/haptics'

const { Header, Sider, Content } = AntLayout
const { Title, Text } = Typography

interface LayoutProps {
  children: React.ReactNode
  showBottomNav?: boolean
  enablePullToRefresh?: boolean
  onRefresh?: () => Promise<void>
}

export default function Layout({ 
  children, 
  showBottomNav = true, 
  enablePullToRefresh = false,
  onRefresh
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { user, logout, exitImpersonation } = useAuth()
  const { theme: currentTheme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { haptics, trigger } = useHaptics()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()
  const [messageApi, contextHolder] = message.useMessage()

  const handleLogout = async () => {
    trigger('medium')
    setMobileDrawerOpen(false)
    await logout()
    messageApi.success('ออกจากระบบเรียบร้อยแล้ว')
    router.push('/login')
  }

  const handleExitImpersonation = async () => {
    try {
      trigger('light')
      setMobileDrawerOpen(false)
      await exitImpersonation()
      messageApi.success('กลับสู่บัญชีผู้จัดการเรียบร้อยแล้ว')
    } catch (error) {
      trigger('error')
      messageApi.error('ไม่สามารถกลับสู่บัญชีผู้จัดการได้')
      console.error('Exit impersonation failed:', error)
    }
  }

  const navigation = [
    { 
      key: '/dashboard', 
      icon: <DashboardOutlined />, 
      label: 'แดชบอร์ด',
      href: '/dashboard'
    },
    { 
      key: '/sales', 
      icon: <ShoppingCartOutlined />, 
      label: 'บันทึกการเบิก',
      href: '/sales'
    },
    { 
      key: '/settlement', 
      icon: <FileTextOutlined />, 
      label: 'เคลียบิล',
      href: '/settlement',
      adminOnly: true
    },
    { 
      key: '/products', 
      icon: <InboxOutlined />, 
      label: 'จัดการสินค้า',
      href: '/products',
      adminOnly: true
    },
    { 
      key: '/employees', 
      icon: <TeamOutlined />, 
      label: 'จัดการพนักงาน',
      href: '/employees',
      adminOnly: true
    },
    { 
      key: '/profile', 
      icon: <UserOutlined />, 
      label: 'ข้อมูลส่วนตัว',
      href: '/profile'
    },
  ]

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  // Handle swipe navigation gestures
  const handleSwipe = (swipeData: SwipeDirection) => {
    if (swipeData.direction === 'right' && !mobileDrawerOpen) {
      trigger('light')
      setMobileDrawerOpen(true)
    } else if (swipeData.direction === 'left' && mobileDrawerOpen) {
      trigger('light')
      setMobileDrawerOpen(false)
    }
  }

  const handleTap = () => {
    trigger('light')
  }

  const handleDoubleTap = () => {
    trigger('medium')
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const defaultRefresh = async () => {
    trigger('light')
    window.location.reload()
  }

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileDrawerOpen])

  const menuItems = filteredNavigation.map(item => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    onClick: () => {
      trigger('selection')
      router.push(item.href)
    }
  }))

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'ข้อมูลส่วนตัว',
      onClick: () => router.push('/profile')
    },
    ...(user?.isImpersonation ? [{
      key: 'exit-impersonation',
      icon: <SwapOutlined />,
      label: 'กลับสู่บัญชีผู้จัดการ',
      onClick: handleExitImpersonation
    }] : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ออกจากระบบ',
      onClick: handleLogout,
      danger: true
    }
  ]

  return (
    <>
      {contextHolder}
      <AntLayout style={{ minHeight: '100vh' }}>
        {/* Desktop Sidebar */}
        <Sider 
          breakpoint="lg"
          collapsedWidth="0"
          onBreakpoint={(broken) => {
            // Hide sidebar on mobile
          }}
          onCollapse={(collapsed, type) => {
            setCollapsed(collapsed)
          }}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
          className="hidden lg:block"
        >
          {/* Logo */}
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Title level={4} style={{ margin: 0, color: 'white' }}>
              {collapsed ? 'S' : 'ระบบขายสินค้า'}
            </Title>
          </div>

          {/* User Info */}
          {user && !collapsed && (
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Avatar size="large">
                    {user.name?.charAt(0) || 'U'}
                  </Avatar>
                  <div>
                    <Text strong style={{ color: 'white', display: 'block' }}>
                      {user.name}
                    </Text>
                    <Badge 
                      status={user.role === 'admin' ? 'processing' : 'success'} 
                      text={
                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {user.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                        </Text>
                      }
                    />
                    {user.isImpersonation && (
                      <Badge 
                        status="warning" 
                        text={
                          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                            กำลังดูข้อมูล
                          </Text>
                        }
                      />
                    )}
                  </div>
                </Space>
              </Space>
            </div>
          )}

          {/* Navigation Menu */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ border: 'none' }}
          />

          {/* Theme Toggle at Bottom */}
          {!collapsed && (
            <div style={{ 
              position: 'absolute', 
              bottom: 16, 
              left: 16, 
              right: 16 
            }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {currentTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}
                  </Text>
                  <Switch
                    checked={currentTheme === 'dark'}
                    onChange={toggleTheme}
                    checkedChildren={<MoonOutlined />}
                    unCheckedChildren={<SunOutlined />}
                  />
                </Space>
              </Space>
            </div>
          )}
        </Sider>

        {/* Mobile Drawer */}
        <Drawer
          title={
            <Space>
              <Avatar>S</Avatar>
              <Text strong>ระบบขายสินค้า</Text>
            </Space>
          }
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          className="lg:hidden"
        >
          {/* User Info */}
          {user && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Avatar size="large">
                    {user.name?.charAt(0) || 'U'}
                  </Avatar>
                  <div>
                    <Text strong style={{ display: 'block' }}>
                      {user.name}
                    </Text>
                    <Badge 
                      status={user.role === 'admin' ? 'processing' : 'success'} 
                      text={user.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                    />
                    {user.isImpersonation && (
                      <div>
                        <Badge status="warning" text="กำลังดูข้อมูล" />
                      </div>
                    )}
                  </div>
                </Space>
              </Space>
            </div>
          )}

          {/* Navigation Menu */}
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ border: 'none' }}
          />

          {/* Theme Toggle */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text>
                {currentTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}
              </Text>
              <Switch
                checked={currentTheme === 'dark'}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
            </Space>
          </div>

          {/* Logout Button */}
          <div style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              danger 
              block 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              ออกจากระบบ
            </Button>
          </div>
        </Drawer>

        {/* Main Layout */}
        <AntLayout style={{ marginLeft: window.innerWidth >= 992 ? 200 : 0 }}>
          {/* Header */}
          <Header 
            style={{ 
              padding: 0, 
              background: colorBgContainer,
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 1000
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              height: '100%'
            }}>
              <Space>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => {
                    trigger('light')
                    setMobileDrawerOpen(true)
                  }}
                  className="lg:hidden"
                />
                <Title level={4} style={{ margin: 0 }} className="hidden lg:block">
                  สวัสดี, {user?.name}
                </Title>
                <Title level={5} style={{ margin: 0 }} className="lg:hidden">
                  ระบบขายสินค้า
                </Title>
              </Space>

              <Space className="hidden lg:flex">
                {user?.isImpersonation && (
                  <Button 
                    type="default" 
                    icon={<SwapOutlined />}
                    onClick={handleExitImpersonation}
                  >
                    กลับสู่บัญชีผู้จัดการ
                  </Button>
                )}
                <Switch
                  checked={currentTheme === 'dark'}
                  onChange={toggleTheme}
                  checkedChildren={<MoonOutlined />}
                  unCheckedChildren={<SunOutlined />}
                />
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                  <Button type="text">
                    <Space>
                      <Avatar size="small">
                        {user?.name?.charAt(0) || 'U'}
                      </Avatar>
                      <Text>{user?.name}</Text>
                    </Space>
                  </Button>
                </Dropdown>
              </Space>

              <Switch
                checked={currentTheme === 'dark'}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                className="lg:hidden"
              />
            </div>
          </Header>

          {/* Content */}
          <Content style={{ 
            margin: '24px 16px',
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            padding: 24
          }}>
            <GestureHandler
              onSwipe={handleSwipe}
              onTap={handleTap}
              onDoubleTap={handleDoubleTap}
              className="min-h-full"
            >
              {enablePullToRefresh ? (
                <PullToRefresh onRefresh={onRefresh || defaultRefresh}>
                  {children}
                </PullToRefresh>
              ) : (
                children
              )}
            </GestureHandler>
          </Content>
        </AntLayout>
      </AntLayout>
    </>
  )
}