'use client'

declare global {
  interface Navigator {
    vibrate?: (pattern: number | number[]) => boolean
  }
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

class HapticManager {
  private isSupported: boolean
  private isEnabled: boolean

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator
    this.isEnabled = this.isSupported && this.getUserPreference()
  }

  private getUserPreference(): boolean {
    if (typeof localStorage === 'undefined') return true
    const preference = localStorage.getItem('haptics-enabled')
    return preference !== 'false' // Default to enabled
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('haptics-enabled', String(enabled))
    }
  }

  isHapticSupported(): boolean {
    return this.isSupported
  }

  isHapticEnabled(): boolean {
    return this.isEnabled && this.isSupported
  }

  trigger(type: HapticType): void {
    if (!this.isHapticEnabled()) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 50, 10],
      warning: [25, 25, 25],
      error: [50, 100, 50],
      selection: [5]
    }

    const pattern = patterns[type]
    if (pattern && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

  // Convenience methods
  light(): void {
    this.trigger('light')
  }

  medium(): void {
    this.trigger('medium')
  }

  heavy(): void {
    this.trigger('heavy')
  }

  success(): void {
    this.trigger('success')
  }

  warning(): void {
    this.trigger('warning')
  }

  error(): void {
    this.trigger('error')
  }

  selection(): void {
    this.trigger('selection')
  }
}

const haptics = new HapticManager()
export default haptics

// React hook for haptic feedback
export function useHaptics() {
  return {
    haptics,
    isSupported: haptics.isHapticSupported(),
    isEnabled: haptics.isHapticEnabled(),
    setEnabled: (enabled: boolean) => haptics.setEnabled(enabled),
    trigger: (type: HapticType) => haptics.trigger(type)
  }
}

// Enhanced button click handler with haptic feedback
export function withHapticFeedback<T extends (...args: any[]) => any>(
  handler: T,
  hapticType: HapticType = 'light'
): T {
  return ((...args: any[]) => {
    haptics.trigger(hapticType)
    return handler(...args)
  }) as T
}