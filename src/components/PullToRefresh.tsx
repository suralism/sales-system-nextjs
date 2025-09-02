'use client'

import { useState, useRef, useEffect } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className = ''
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || window.scrollY > 0) return

      const touchY = e.touches[0].clientY
      const pullDist = Math.max(0, (touchY - touchStartY.current) * 0.5)
      
      if (pullDist > 0 && window.scrollY === 0) {
        e.preventDefault()
        setPullDistance(pullDist)
        setIsPulling(pullDist > threshold)
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(threshold)
        
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
          setIsPulling(false)
        }
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return (
    <div ref={containerRef} className={className}>
      {/* Pull indicator */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-50 flex items-center justify-center
          bg-gradient-to-r from-blue-500 to-indigo-600 text-white
          transition-all duration-200 ease-out
          ${pullDistance > 0 ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          height: Math.min(pullDistance, threshold * 1.2),
          transform: `translateY(${Math.min(pullDistance - threshold * 1.2, 0)}px)`
        }}
      >
        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              <span className="text-sm font-medium">กำลังรีเฟรช...</span>
            </>
          ) : isPulling ? (
            <>
              <span className="text-lg">🔄</span>
              <span className="text-sm font-medium">ปล่อยเพื่อรีเฟรช</span>
            </>
          ) : (
            <>
              <span className="text-lg">↓</span>
              <span className="text-sm font-medium">ลากลงเพื่อรีเฟรช</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}