import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
} from 'next/font/google'

import './globals.css'

import AuthGate from '@/components/auth/AuthGate'
import { AuthProvider } from '@/contexts/auth-context'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'StarLight Management Suite',
  description:
    'School management system for administrators, teachers, students and applicants.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
