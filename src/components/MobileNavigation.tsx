'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface NavigationItem {
  name: string
  href: string
  icon: string
  adminOnly?: boolean
  badge?: string | number
}

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  navigation: NavigationItem[]
  currentPath?: string
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  navigation,
  currentPath = ''
}) => {
  const { user } = useAuth()
  
  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-gray-600 dark:bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">ระบบขายสินค้า</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sales Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
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
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = currentPath === item.href
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200
                  touch-manipulation min-h-[48px]
                  ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 border-2 border-transparent'
                  }
                `}
              >
                <span className="text-2xl mr-4">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <svg className="w-5 h-5 text-blue-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </a>
            )
          })}
        </nav>
      </div>
    </>
  )
}

// Bottom navigation for mobile (alternative navigation pattern)
interface BottomNavigationProps {
  navigation: NavigationItem[]
  currentPath?: string
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  navigation,
  currentPath = ''
}) => {
  const { user } = useAuth()
  
  const filteredNavigation = navigation
    .filter(item => !item.adminOnly || user?.role === 'admin')
    .slice(0, 5) // Limit to 5 items for mobile bottom nav

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 lg:hidden">
      <div className="flex justify-around items-center">
        {filteredNavigation.map((item) => {
          const isActive = currentPath === item.href
          return (
            <a
              key={item.name}
              href={item.href}
              className={`
                flex flex-col items-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
                touch-manipulation relative
                ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className={`text-xs font-medium truncate w-full text-center ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.name}
              </span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}