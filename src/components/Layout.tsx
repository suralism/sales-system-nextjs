'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Button from '@/components/Button'
import ThemeToggle from '@/components/ThemeToggle'
import { MobileNavigation, BottomNavigation } from '@/components/MobileNavigation'
import GestureHandler, { SwipeDirection } from '@/components/GestureHandler'
import PullToRefresh from '@/components/PullToRefresh'
import { useHaptics } from '@/lib/haptics'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, exitImpersonation } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { haptics, trigger } = useHaptics()

  const handleLogout = async () => {
    trigger('medium')
    setSidebarOpen(false)
    await logout()
    router.push('/login')
  }

  const handleExitImpersonation = async () => {
    try {
      trigger('light')
      setSidebarOpen(false)
      await exitImpersonation()
    } catch (error) {
      trigger('error')
      console.error('Exit impersonation failed:', error)
    }
  }

  const navigation = [
    { name: 'แดชบอร์ด', href: '/dashboard', icon: '📊' },
    { name: 'บันทึกการเบิก', href: '/sales', icon: '💰' },
    { name: 'เคลียบิล', href: '/settlement', icon: '🧾', adminOnly: true },
    { name: 'จัดการสินค้า', href: '/products', icon: '📦', adminOnly: true },
    { name: 'จัดการพนักงาน', href: '/employees', icon: '👥', adminOnly: true },
    { name: 'ข้อมูลส่วนตัว', href: '/profile', icon: '👤' },
  ]

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  // Handle swipe navigation gestures
  const handleSwipe = (swipeData: SwipeDirection) => {
    if (swipeData.direction === 'right' && !sidebarOpen) {
      // Swipe right to open sidebar on mobile
      trigger('light')
      setSidebarOpen(true)
    } else if (swipeData.direction === 'left' && sidebarOpen) {
      // Swipe left to close sidebar
      trigger('light')
      setSidebarOpen(false)
    } else if (swipeData.direction === 'left' || swipeData.direction === 'right') {
      // Navigate between pages with swipe
      const currentIndex = filteredNavigation.findIndex(item => pathname === item.href)
      
      if (swipeData.direction === 'left' && currentIndex < filteredNavigation.length - 1) {
        trigger('selection')
        router.push(filteredNavigation[currentIndex + 1].href)
      } else if (swipeData.direction === 'right' && currentIndex > 0) {
        trigger('selection')
        router.push(filteredNavigation[currentIndex - 1].href)
      }
    }
  }

  // Handle tap gestures with haptic feedback
  const handleTap = () => {
    // Light haptic feedback on tap
    trigger('light')
  }

  // Handle double tap to toggle sidebar
  const handleDoubleTap = () => {
    trigger('medium')
    setSidebarOpen(!sidebarOpen)
  }

  // Default refresh function
  const defaultRefresh = async () => {
    trigger('light')
    // Refresh current page
    window.location.reload()
  }

  // Close mobile menu when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen])

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${showBottomNav ? 'pb-20 lg:pb-0' : ''}`}>
      {/* Mobile Navigation Sidebar */}
      <MobileNavigation
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
        currentPath={pathname}
      />

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30">
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700">
          {/* Desktop Header */}
          <div className="flex items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ระบบขายสินค้า</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sales Management</p>
              </div>
            </div>
          </div>

          {/* Desktop User Info */}
          {user && (
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' 
                        : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                    }`}>
                      {user.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}
                    </span>
                    {user.isImpersonation && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200">
                        กำลังดูข้อมูล
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {user.isImpersonation && (
                <div className="mt-4">
                  <Button
                    onClick={handleExitImpersonation}
                    variant="secondary"
                    size="sm"
                    fullWidth
                  >
                    กลับสู่บัญชีผู้จัดการ
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 border-2 border-transparent'
                    }
                  `}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </a>
              )
            })}
          </nav>

          {/* Desktop Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <Button
              onClick={handleLogout}
              variant="danger"
              size="sm"
              fullWidth
            >
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 flex flex-col flex-1">
        {/* Mobile Top Bar */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              onClick={() => {
                trigger('light')
                setSidebarOpen(true)
              }}
            >
              <span className="sr-only">เปิดเมนู</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="font-semibold text-gray-900 dark:text-white">ระบบขายสินค้า</h1>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    สวัสดี, {user?.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ยินดีต้อนรับสู่ระบบจัดการขายสินค้า
                    {user?.isImpersonation && (
                      <span className="text-orange-600 dark:text-orange-400 font-medium ml-2">
                        (กำลังดูข้อมูลในฐานะ {user.originalAdmin?.name})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                {user?.isImpersonation && (
                  <Button
                    onClick={handleExitImpersonation}
                    variant="secondary"
                    size="sm"
                  >
                    กลับสู่บัญชีผู้จัดการ
                  </Button>
                )}
                <Button
                  onClick={handleLogout}
                  variant="danger"
                  size="sm"
                >
                  ออกจากระบบ
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content with gesture handling */}
        <main className="flex-1">
          <GestureHandler
            onSwipe={handleSwipe}
            onTap={handleTap}
            onDoubleTap={handleDoubleTap}
            className="min-h-full"
          >
            {enablePullToRefresh ? (
              <PullToRefresh onRefresh={onRefresh || defaultRefresh}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
                  {children}
                </div>
              </PullToRefresh>
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
                {children}
              </div>
            )}
          </GestureHandler>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      {showBottomNav && (
        <BottomNavigation
          navigation={navigation}
          currentPath={pathname}
        />
      )}
    </div>
  )
}

