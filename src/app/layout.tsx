import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'
import PWAManager from '@/components/PWAManager'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import locale from 'antd/locale/th_TH'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

// Set dayjs locale to Thai
dayjs.locale('th')

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sales Management System",
    template: "%s | Sales System"
  },
  description: "ระบบจัดการการขายและสต็อกสินค้าสำหรับพนักงาน - Complete sales management with inventory tracking, employee management, and analytics",
  keywords: ["sales", "management", "inventory", "POS", "business", "ขาย", "จัดการสินค้า", "พนักงาน"],
  authors: [{ name: "Sales System Team" }],
  creator: "Sales Management System",
  publisher: "Sales System",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sales System",
  },
  openGraph: {
    type: "website",
    siteName: "Sales Management System",
    title: "Sales Management System",
    description: "Complete sales management system with mobile support",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Sales System Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Sales Management System",
    description: "Complete sales management system with mobile support",
    images: ["/icons/icon-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sales System" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/sw.js" as="script" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <ConfigProvider 
            locale={locale}
            theme={{
              token: {
                colorPrimary: '#2563eb',
                borderRadius: 6,
                fontFamily: 'var(--font-geist-sans)',
              },
            }}
          >
            <AuthProvider>
              <ThemeProvider>
                <PWAManager />
                <Toaster
                  position="top-center"
                  reverseOrder={false}
                  toastOptions={{
                    className:
                      'shadow-lg rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 animate-toast-slide',
                    success: {
                      className:
                        'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800',
                      iconTheme: {
                        primary: '#10B981',
                        secondary: '#ffffff'
                      }
                    },
                    error: {
                      className:
                        'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800',
                      iconTheme: {
                        primary: '#EF4444',
                        secondary: '#ffffff'
                      }
                    }
                  }}
                />
                {children}
              </ThemeProvider>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
