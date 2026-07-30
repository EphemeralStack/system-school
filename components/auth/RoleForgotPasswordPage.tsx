'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Mail,
  Send,
} from 'lucide-react'

import { account } from '@/lib/appwrite/config'
import type { UserRole } from '@/contexts/auth-context'

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unable to send the recovery email.'
  }

  if (
    error.message
      .toLowerCase()
      .includes('rate limit')
  ) {
    return 'Too many recovery attempts. Please wait and try again.'
  }

  return error.message
}

export default function RoleForgotPasswordPage({
  role,
}: {
  role: UserRole
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] =
    useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()
    setError('')
    setSuccess(false)

    const normalizedEmail =
      email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError(
        'Enter the email address for your account.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      await account.createRecovery({
        email: normalizedEmail,
        url: `${window.location.origin}/reset-password?role=${role}`,
      })

      setSuccess(true)
    } catch (submitError) {
      setError(formatError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/kidsBg.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/10" />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-[#232A42]/85 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
          <div className="text-center mb-7">
            <img
              src="/Logo.png"
              alt="StarLight Logo"
              className="h-16 w-auto object-contain mx-auto mb-4"
            />

            <h1 className="text-2xl font-bold text-white">
              Reset Password
            </h1>

            <p className="text-sm text-gray-400 mt-2">
              Enter your {role} account email
              and we will send a recovery link.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <AlertCircle
                size={18}
                className="mt-0.5 flex-shrink-0"
              />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border-l-4 border-green-500 rounded-lg text-green-300 text-sm flex items-start gap-2">
              <CheckCircle
                size={18}
                className="mt-0.5 flex-shrink-0"
              />
              Check your email for the password
              recovery link.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Email Address"
                autoComplete="email"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Recovery Link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={`/${role}/signIn`}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#D96A1E]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {role} sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
