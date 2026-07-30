'use client'

import Link from 'next/link'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  School,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import {
  type UserRole,
  useAuth,
} from '@/contexts/auth-context'

interface DashboardItem {
  title: string
  description: string
  Icon: LucideIcon
}

interface DashboardConfig {
  title: string
  subtitle: string
  accentClassName: string
  badgeClassName: string
  items: DashboardItem[]
}

const DASHBOARD_CONFIG: Record<
  'teacher' | 'student',
  DashboardConfig
> = {
  teacher: {
    title: 'Teacher Dashboard',
    subtitle:
      'Manage your classes, subjects, attendance and academic work.',
    accentClassName: 'text-emerald-400',
    badgeClassName:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    items: [
      {
        title: 'My Classes',
        description:
          'View the classes assigned to your teacher profile.',
        Icon: Users,
      },
      {
        title: 'Subjects',
        description:
          'Open your assigned subjects and teaching allocations.',
        Icon: BookOpen,
      },
      {
        title: 'Attendance',
        description:
          'Record and review learner attendance.',
        Icon: ClipboardCheck,
      },
      {
        title: 'Timetable',
        description:
          'Review your current teaching timetable.',
        Icon: CalendarDays,
      },
    ],
  },

  student: {
    title: 'Student Dashboard',
    subtitle:
      'Access your classes, subjects, timetable and academic records.',
    accentClassName: 'text-orange-400',
    badgeClassName:
      'bg-orange-500/15 text-orange-300 border-orange-500/20',
    items: [
      {
        title: 'My Class',
        description:
          'View your assigned class and current level.',
        Icon: School,
      },
      {
        title: 'My Subjects',
        description:
          'Open the subjects registered to your profile.',
        Icon: BookOpen,
      },
      {
        title: 'Attendance',
        description:
          'Review your attendance history and summaries.',
        Icon: ClipboardCheck,
      },
      {
        title: 'Timetable',
        description:
          'Check your current lesson timetable.',
        Icon: CalendarDays,
      },
    ],
  },
}

function getInitials(
  firstName: string,
  lastName: string
): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`
    .toUpperCase()
}

export default function RoleDashboardShell({
  role,
}: {
  role: Extract<UserRole, 'teacher' | 'student'>
}) {
  const { user, logout } = useAuth()

  const [menuOpen, setMenuOpen] =
    useState(false)

  const config = DASHBOARD_CONFIG[role]
  const RoleIcon =
    role === 'teacher'
      ? GraduationCap
      : School

  const fullName = user
    ? `${user.FirstName} ${user.LastName}`.trim()
    : ''

  const initials = user
    ? getInitials(
        user.FirstName,
        user.LastName
      )
    : ''

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <header className="sticky top-0 z-40 bg-[#232A42] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (current) => !current
                )
              }
              className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              aria-label="Toggle navigation"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <img
              src="/Logo.png"
              alt="StarLight Logo"
              className="h-10 w-auto object-contain"
            />

            <div className="hidden sm:block">
              <h1 className="font-bold text-sm sm:text-base">
                StarLight Management Suite
              </h1>

              <p className="text-xs text-gray-400 capitalize">
                {role} portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#C75712] flex items-center justify-center font-bold text-sm overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="leading-tight">
                <p className="text-sm font-semibold">
                  {fullName}
                </p>

                <p className="text-xs text-gray-400 capitalize">
                  {role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void logout('/')
              }
              className="p-2 rounded-lg text-gray-300 hover:text-red-300 hover:bg-white/10"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        <aside
          className={`
            fixed lg:sticky top-[65px] left-0 z-30
            w-64 h-[calc(100vh-65px)]
            bg-[#232A42] text-white
            px-4 py-6
            transition-transform duration-300
            ${
              menuOpen
                ? 'translate-x-0'
                : '-translate-x-full'
            }
            lg:translate-x-0
          `}
        >
          <nav className="space-y-2">
            <Link
              href={`/${role}/dashboard`}
              onClick={() =>
                setMenuOpen(false)
              }
              className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#C75712] text-white"
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Link>

            {config.items.map(
              ({ title, Icon }) => (
                <button
                  key={title}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-left"
                >
                  <Icon className="w-5 h-5" />
                  {title}
                </button>
              )
            )}
          </nav>
        </aside>

        {menuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setMenuOpen(false)
            }
            className="fixed inset-0 top-[65px] bg-black/40 z-20 lg:hidden"
          />
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <section className="bg-[#232A42] text-white rounded-2xl p-6 sm:p-8 shadow-lg overflow-hidden relative">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#C75712]/20 rounded-full blur-2xl" />

            <div className="relative">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${config.badgeClassName}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                Authenticated {role} account
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-4">
                Welcome,{' '}
                <span
                  className={
                    config.accentClassName
                  }
                >
                  {user?.FirstName ||
                    role}
                </span>
              </h2>

              <p className="text-gray-300 mt-2 max-w-2xl">
                {config.subtitle}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            {config.items.map(
              ({
                title,
                description,
                Icon,
              }) => (
                <article
                  key={title}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="w-11 h-11 rounded-lg bg-[#232A42] text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="font-bold text-gray-900 mt-4">
                    {title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {description}
                  </p>
                </article>
              )
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
            <h3 className="font-bold text-gray-900">
              Account information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">
                  Full name
                </p>

                <p className="font-semibold text-gray-900 mt-1">
                  {fullName || 'Not available'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">
                  Email
                </p>

                <p className="font-semibold text-gray-900 mt-1 break-all">
                  {user?.Email ||
                    'Not available'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">
                  Role
                </p>

                <p className="font-semibold text-gray-900 mt-1 capitalize">
                  {user?.Role || role}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">
                  Account status
                </p>

                <p className="font-semibold text-green-700 mt-1 capitalize">
                  {user?.Status ||
                    'active'}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
