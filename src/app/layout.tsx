import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบบันทึกข้อมูลขายพนักงาน",
  description: "ระบบจัดการการขายและสต็อกสินค้าสำหรับพนักงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              className:
                'shadow-lg rounded-lg px-4 py-3 bg-white text-gray-800 animate-toast-slide',
              success: {
                className:
                  'bg-green-50 text-green-800 border border-green-200',
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#ffffff'
                }
              },
              error: {
                className:
                  'bg-red-50 text-red-800 border border-red-200',
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#ffffff'
                }
              }
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
