'use client'

import {
  useEffect,
  type ReactNode,
} from 'react'
import {
  usePathname,
  useRouter,
} from 'next/navigation'

import {
  getDashboardPath,
  getSignInPath,
  type UserRole,
  useAuth,
} from '@/contexts/auth-context'

const ROLES: UserRole[] = [
  'admin',
  'teacher',
  'student',
  'applicant',
]

const PUBLIC_ROLE_ROUTES = new Set([
  'signIn',
  'signUp',
  'forgot-password',
])

function getPathRole(
  pathname: string
): UserRole | null {
  return (
    ROLES.find(
      (role) =>
        pathname === `/${role}` ||
        pathname.startsWith(`/${role}/`)
    ) ?? null
  )
}

function isPublicRoleRoute(
  pathname: string,
  role: UserRole
): boolean {
  const remainder = pathname
    .slice(`/${role}`.length)
    .replace(/^\/+|\/+$/g, '')

  return PUBLIC_ROLE_ROUTES.has(remainder)
}

function LoadingScreen() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/kidsBg.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/10" />

      <div className="relative z-10 text-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold">
          Checking your account...
        </p>
      </div>
    </div>
  )
}

export default function AuthGate({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  const pathRole = getPathRole(pathname)
  const publicRoleRoute =
    pathRole !== null &&
    isPublicRoleRoute(pathname, pathRole)

  const protectedRoleRoute =
    pathRole !== null && !publicRoleRoute

  useEffect(() => {
    if (loading) {
      return
    }

    if (protectedRoleRoute && pathRole) {
      if (!user) {
        const redirect = encodeURIComponent(pathname)

        router.replace(
          `${getSignInPath(pathRole)}?redirect=${redirect}`
        )

        return
      }

      if (user.Role !== pathRole) {
        router.replace(
          getDashboardPath(user.Role)
        )
      }

      return
    }

    if (publicRoleRoute && user) {
      router.replace(
        getDashboardPath(user.Role)
      )
    }
  }, [
    loading,
    pathRole,
    pathname,
    protectedRoleRoute,
    publicRoleRoute,
    router,
    user,
  ])

  if (
    protectedRoleRoute &&
    (
      loading ||
      !user ||
      user.Role !== pathRole
    )
  ) {
    return <LoadingScreen />
  }

  if (publicRoleRoute && loading) {
    return <LoadingScreen />
  }

  return children
}
