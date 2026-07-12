// components/dashboard/SeedButton.tsx
'use client'

import { useState } from 'react'
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react'

export const SeedButton = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSeed = async () => {
    if (!confirm('This will seed test data into your database. Continue?')) {
      return
    }

    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Data seeded successfully!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to seed data')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while seeding data')
    } finally {
      setLoading(false)
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSeed}
        disabled={loading}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
          ${loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : status === 'success'
            ? 'bg-green-600 hover:bg-green-700'
            : status === 'error'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-[#232A42] hover:bg-[#2C3553]'
          }
          text-white
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle className="w-4 h-4" />
        ) : status === 'error' ? (
          <XCircle className="w-4 h-4" />
        ) : (
          <Database className="w-4 h-4" />
        )}
        {loading ? 'Seeding...' : status === 'success' ? 'Seeded!' : status === 'error' ? 'Failed' : 'Seed Data'}
      </button>
      
      {message && (
        <div className={`
          absolute top-full mt-2 left-0 right-0 text-xs p-2 rounded-lg
          ${status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        `}>
          {message}
        </div>
      )}
    </div>
  )
}