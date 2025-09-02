'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import GestureHandler from './GestureHandler'
import Button from './Button'

interface NavItem {
  path: string
  label: string
  icon: string
  shortcut?: string
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'แดชบอร์ด', icon: '📊', shortcut: '1' },
  { path: '/sales', label: 'บันทึกการเบิก', icon: '💰', shortcut: '2' },
  { path: '/products', label: 'จัดการสินค้า', icon: '📦', shortcut: '3' },
  { path: '/employees', label: 'จัดการพนักงาน', icon: '👥', shortcut: '4' }
]

export default function EnhancedMobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Hide/show nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      
      const item = navItems.find(item => item.shortcut === e.key)
      if (item) {
        router.push(item.path)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [router])

  const handleSwipe = (direction: any) => {
    const currentIndex = navItems.findIndex(item => item.path === pathname)
    
    if (direction.direction === 'left' && currentIndex < navItems.length - 1) {
      // Swipe left - next page
      router.push(navItems[currentIndex + 1].path)
    } else if (direction.direction === 'right' && currentIndex > 0) {
      // Swipe right - previous page
      router.push(navItems[currentIndex - 1].path)
    }
  }

  const currentIndex = navItems.findIndex(item => item.path === pathname)

  return (
    <>
      {/* Gesture area for swipe navigation */}
      <GestureHandler
        onSwipe={handleSwipe}
        className="fixed inset-0 pointer-events-none z-0"
      >
        <div />
      </GestureHandler>

      {/* Bottom Navigation */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 lg:hidden
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg">
          <div className="grid grid-cols-4 px-2 py-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.path
              
              return (
                <Button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                  className={`
                    flex-col h-16 gap-1 text-xs font-medium transition-all duration-200
                    ${isActive ? 'scale-110' : 'hover:scale-105'}
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="leading-tight">{item.label}</span>
                  {item.shortcut && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-gray-400 text-white text-xs rounded-full flex items-center justify-center opacity-60">
                      {item.shortcut}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
          
          {/* Page indicator */}
          <div className="flex justify-center pb-2">
            <div className="flex gap-1">
              {navItems.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-1.5 h-1.5 rounded-full transition-colors duration-200
                    ${index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for quick actions */}
      <div className="fixed bottom-24 right-4 z-40 lg:hidden">
        <Button
          onClick={() => router.push('/sales')}
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-110 active:scale-95"
        >
          <span className="text-2xl">⚡</span>
        </Button>
      </div>

      {/* Pull to refresh indicator */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-1 text-sm font-medium opacity-0 transform -translate-y-full transition-all duration-300">
          🔄 ลากลงเพื่อรีเฟรช
        </div>
      </div>
    </>
  )
}