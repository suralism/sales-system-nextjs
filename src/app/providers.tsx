'use client'

import { NextUIProvider } from '@nextui-org/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <NextUIProvider navigate={router.push}>
      <AuthProvider>{children}</AuthProvider>
    </NextUIProvider>
  )
}
