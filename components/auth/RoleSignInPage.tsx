'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  School,
  Shield,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'

import {
  getDashboardPath,
  type UserRole,
  useAuth,
} from '@/contexts/auth-context'

interface RoleCopy {
  title: string
  description: string
  badge: string
  Icon: LucideIcon
  badgeClassName: string
  iconClassName: string
}

const ROLE_COPY: Record<UserRole, RoleCopy> = {
  admin: {
    title: 'Admin Sign In',
    description:
      'Sign in to access the administration dashboard',
    badge: 'Administrator Access',
    Icon: Shield,
    badgeClassName: 'bg-blue-500/20',
    iconClassName: 'text-blue-300',
  },
  teacher: {
    title: 'Teacher Sign In',
    description:
      'Sign in to manage classes, subjects and learners',
    badge: 'Teacher Portal',
    Icon: GraduationCap,
    badgeClassName: 'bg-emerald-500/20',
    iconClassName: 'text-emerald-300',
  },
  student: {
    title: 'Student Sign In',
    description:
      'Welcome back! Sign in to access your student dashboard',
    badge: 'Student Portal',
    Icon: School,
    badgeClassName: 'bg-green-500/20',
    iconClassName: 'text-green-300',
  },
  applicant: {
    title: 'Applicant Sign In',
    description:
      'Sign in to track your application and admission status',
    badge: 'Applicant Portal',
    Icon: ClipboardList,
    badgeClassName: 'bg-purple-500/20',
    iconClassName: 'text-purple-300',
  },
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unable to sign in. Please try again.'
  }

  const message = error.message
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('invalid credentials') ||
    normalizedMessage.includes('invalid email or password')
  ) {
    return 'Invalid email or password. Please try again.'
  }

  if (
    normalizedMessage.includes('user not found') ||
    normalizedMessage.includes('could not be found')
  ) {
    return 'No account was found with those credentials.'
  }

  if (
    normalizedMessage.includes('rate limit')
  ) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return message
}

function isSafeRoleRedirect(
  path: string,
  role: UserRole
): boolean {
  return (
    path === `/${role}` ||
    path.startsWith(`/${role}/`)
  )
}

export default function RoleSignInPage({
  role,
}: {
  role: UserRole
}) {
  const router = useRouter()
  const { login, user } = useAuth()

  const copy = ROLE_COPY[role]
  const {
    Icon,
  } = copy

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] =
    useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const [redirectPath, setRedirectPath] =
    useState('')

  const otherRoles = useMemo(
    () =>
      (
        [
          'admin',
          'teacher',
          'student',
          'applicant',
        ] as UserRole[]
      ).filter((item) => item !== role),
    [role]
  )

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    if (params.get('registered') === 'true') {
      setSuccessMessage(
        'Account created successfully. Please sign in.'
      )
    }

    if (params.get('reset') === 'true') {
      setSuccessMessage(
        'Password updated successfully. Please sign in.'
      )
    }

    const requestedRedirect =
      params.get('redirect') || ''

    if (
      isSafeRoleRedirect(
        requestedRedirect,
        role
      )
    ) {
      setRedirectPath(requestedRedirect)
    }
  }, [role])

  useEffect(() => {
    if (!user) {
      return
    }

    if (
      user.Role === role &&
      redirectPath
    ) {
      router.replace(redirectPath)
      return
    }

    router.replace(
      getDashboardPath(user.Role)
    )
  }, [
    redirectPath,
    role,
    router,
    user,
  ])

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    setError('')
    setSuccessMessage('')

    if (
      !formData.email.trim() ||
      !formData.password
    ) {
      setError('Please fill in all fields.')
      return
    }

    setIsSubmitting(true)

    try {
      const authenticatedUser = await login(
        formData.email,
        formData.password,
        role
      )

      const destination =
        redirectPath &&
        isSafeRoleRedirect(
          redirectPath,
          authenticatedUser.Role
        )
          ? redirectPath
          : getDashboardPath(
              authenticatedUser.Role
            )

      router.replace(destination)
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
      </div>

      <div className="relative w-full max-w-md z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/Logo.png"
                alt="StarLight Logo"
                className="h-16 w-auto object-contain"
              />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {copy.title}
            </h2>

            <p className="text-gray-400 text-sm">
              {copy.description}
            </p>

            <div
              className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full ${copy.badgeClassName}`}
            >
              <Icon
                className={`w-3 h-3 ${copy.iconClassName}`}
              />
              <span
                className={`text-xs ${copy.iconClassName}`}
              >
                {copy.badge}
              </span>
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border-l-4 border-green-500 rounded-lg text-green-300 text-sm flex items-center gap-2 animate-slide-down">
              <CheckCircle
                size={18}
                className="flex-shrink-0"
              />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-center gap-2 animate-slide-down">
              <AlertCircle
                size={18}
                className="flex-shrink-0"
              />
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </div>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Email Address"
                autoComplete="email"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                name="password"
                value={formData.password}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    password:
                      event.target.value,
                  }))
                }
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="text-right">
              <Link
                href={`/${role}/forgot-password`}
                className="text-sm text-gray-400 hover:text-[#C75712] transition-colors hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don&apos;t have a {role} account?{' '}
              <Link
                href={`/${role}/signUp`}
                className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline"
              >
                Sign Up
              </Link>
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              {otherRoles.map(
                (otherRole, index) => (
                  <span
                    key={otherRole}
                    className="inline-flex items-center gap-2"
                  >
                    {index > 0 && (
                      <span className="text-gray-600 text-xs">
                        •
                      </span>
                    )}

                    <Link
                      href={`/${otherRole}/signIn`}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors hover:underline capitalize"
                    >
                      {otherRole} Login
                    </Link>
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
