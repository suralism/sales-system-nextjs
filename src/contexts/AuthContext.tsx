'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  username: string
  email: string
  name: string
  position: string
  phone: string
  role: 'admin' | 'employee'
  priceLevel: 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ'
  creditLimit: number
  creditUsed: number
  creditRemaining: number
  // Impersonation fields
  isImpersonation?: boolean
  originalAdmin?: {
    id: string
    name: string
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  loginAs: (targetUserId: string) => Promise<void>
  exitImpersonation: () => Promise<void>
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // Check for existing session on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        // Token is in HTTP-only cookie, so we don't need to store it in state
        setToken('authenticated')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      setUser(data.user)
      setToken('authenticated')
    } catch (error) {
      throw error
    }
  }

  const loginAs = async (targetUserId: string) => {
    if (!targetUserId?.trim()) {
      throw new Error('Target user ID is required')
    }

    try {
      const response = await fetch('/api/auth/login-as', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: targetUserId.trim() }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Impersonation failed')
      }

      const data = await response.json()
      setUser(data.user)
      setToken('authenticated')
    } catch (error) {
      console.error('Login-as error:', error)
      throw error
    }
  }

  const exitImpersonation = async () => {
    try {
      const response = await fetch('/api/auth/exit-impersonation', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Exit impersonation failed')
      }

      const data = await response.json()
      setUser(data.user)
      setToken('authenticated')
    } catch (error) {
      console.error('Exit impersonation error:', error)
      throw error
    }
  }
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setToken(null)
    }
  }

  const value = {
    user,
    token,
    login,
    loginAs,
    exitImpersonation,
    logout,
    loading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

