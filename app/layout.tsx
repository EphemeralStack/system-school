import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'

import './globals.css'

import AuthGate from '@/components/auth/AuthGate'
import { AuthProvider } from '@/contexts/auth-context'

const rubik = Rubik({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-rubik',
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
      className={`${rubik.variable} h-full antialiased`}
    >
      <body
        className={`${rubik.className} min-h-full flex flex-col`}
      >
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
