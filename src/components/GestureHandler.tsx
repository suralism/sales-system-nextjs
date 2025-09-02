'use client'

import { useEffect, useRef, useState } from 'react'

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
}

interface GestureHandlerProps {
  onSwipe?: (direction: SwipeDirection) => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  children: React.ReactNode
  className?: string
  swipeThreshold?: number
  longPressDelay?: number
}

export default function GestureHandler({
  onSwipe,
  onTap,
  onDoubleTap,
  onLongPress,
  children,
  className = '',
  swipeThreshold = 50,
  longPressDelay = 500
}: GestureHandlerProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [lastTap, setLastTap] = useState<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })

      // Start long press timer
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          onLongPress()
        }, longPressDelay)
      }
    }

    const handleTouchMove = () => {
      // Cancel long press on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      if (!touchStart) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y
      const deltaTime = Date.now() - touchStart.time
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Handle swipe gestures
      if (distance > swipeThreshold && onSwipe) {
        const velocity = distance / deltaTime
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          const direction = deltaX > 0 ? 'right' : 'left'
          onSwipe({ direction, distance, velocity })
        } else {
          // Vertical swipe
          const direction = deltaY > 0 ? 'down' : 'up'
          onSwipe({ direction, distance, velocity })
        }
      } else if (distance < 10 && deltaTime < 300) {
        // Handle tap gestures
        const now = Date.now()
        const timeSinceLastTap = now - lastTap

        if (timeSinceLastTap < 300 && onDoubleTap) {
          // Double tap
          onDoubleTap()
          setLastTap(0) // Reset to prevent triple tap
        } else {
          // Single tap
          setLastTap(now)
          if (onTap) {
            setTimeout(() => {
              // Only trigger single tap if no double tap occurred
              if (now === lastTap) {
                onTap()
              }
            }, 300)
          }
        }
      }

      setTouchStart(null)
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [touchStart, lastTap, onSwipe, onTap, onDoubleTap, onLongPress, swipeThreshold, longPressDelay])

  return (
    <div ref={elementRef} className={className} style={{ touchAction: 'pan-y pinch-zoom' }}>
      {children}
    </div>
  )
}