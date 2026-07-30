'use client'

import {
  useEffect,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'

import { account } from '@/lib/appwrite/config'
import type { UserRole } from '@/contexts/auth-context'

const VALID_ROLES: UserRole[] = [
  'admin',
  'teacher',
  'student',
  'applicant',
]

function normalizeRole(
  value: string | null
): UserRole {
  if (
    value &&
    VALID_ROLES.includes(value as UserRole)
  ) {
    return value as UserRole
  }

  return 'applicant'
}

export default function ResetPasswordPage() {
  const router = useRouter()

  const [userId, setUserId] = useState('')
  const [secret, setSecret] = useState('')
  const [role, setRole] =
    useState<UserRole>('applicant')

  const [password, setPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] =
    useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    setUserId(params.get('userId') || '')
    setSecret(params.get('secret') || '')
    setRole(normalizeRole(params.get('role')))
  }, [])

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    setError('')
    setSuccess(false)

    if (!userId || !secret) {
      setError(
        'This password recovery link is incomplete or invalid.'
      )
      return
    }

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await account.updateRecovery({
        userId,
        secret,
        password,
      })

      setSuccess(true)

      window.setTimeout(() => {
        router.replace(
          `/${role}/signIn?reset=true`
        )
      }, 1200)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to reset your password.'
      )
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
              Choose a New Password
            </h1>

            <p className="text-sm text-gray-400 mt-2">
              Enter a secure password for your
              account.
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
              Password updated. Redirecting to
              sign in...
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="New Password"
                autoComplete="new-password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm New Password"
                autoComplete="new-password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting || success
              }
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Updating Password...'
                : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={`/${role}/signIn`}
              className="text-sm text-gray-400 hover:text-[#D96A1E]"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
