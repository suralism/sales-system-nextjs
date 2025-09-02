'use client'

import { useEffect, useState } from 'react'
import Button from './Button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export default function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] Install prompt available')
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Save the event so it can be triggered later
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[PWA] Service Worker registered:', registration)

      // Listen for service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('[PWA] Service Worker update found')
        const newWorker = registration.installing

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Service Worker update available')
              setSwUpdateAvailable(true)
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data)
        
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          setSwUpdateAvailable(true)
        }
      })

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error)
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('[PWA] User response to install prompt:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt')
      } else {
        console.log('[PWA] User dismissed the install prompt')
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('[PWA] Install prompt error:', error)
    }
  }

  const handleDismissInstall = () => {
    setShowInstallPrompt(false)
  }

  const handleUpdateClick = () => {
    if (navigator.serviceWorker.controller) {
      // Tell the service worker to skip waiting and take control
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to get the latest version
      window.location.reload()
    }
  }

  // Don't show anything if already installed
  if (isInstalled) return null

  return (
    <>
      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">📱</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  ติดตั้งแอป Sales System
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  ติดตั้งแอปเพื่อการเข้าถึงที่เร็วขึ้นและใช้งานแบบออฟไลน์ได้
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstallClick}
                    size="sm"
                    className="flex-1"
                  >
                    ติดตั้ง
                  </Button>
                  <Button
                    onClick={handleDismissInstall}
                    variant="secondary"
                    size="sm"
                  >
                    ไม่ใช่ตอนนี้
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Worker Update Prompt */}
      {swUpdateAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🔄</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  อัปเดตใหม่พร้อมใช้งาน
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  มีฟีเจอร์และการปรับปรุงใหม่ กรุณาโหลดหน้าใหม่
                </p>
                <Button
                  onClick={handleUpdateClick}
                  size="sm"
                  className="w-full"
                >
                  อัปเดตตอนนี้
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-white text-center py-2 px-4">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <span>📡</span>
            <span>ไม่มีการเชื่อมต่ออินเทอร์เน็ต - ใช้งานแบบออฟไลน์</span>
          </div>
        </div>
      )}
    </>
  )
}

// Hook for checking PWA status
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Check if running as PWA
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
    
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    const handleBeforeInstallPrompt = () => setCanInstall(true)
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return {
    isInstalled,
    isOnline,
    canInstall,
    isPWA: isInstalled
  }
}