'use client'

import {
  BarChart3,
  Bell,
  Grid3X3,
  Home,
  Menu,
  Search,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/contexts/auth-context'

import type {
  AdminWorkspaceNotification,
  AdminWorkspaceQuickAction,
  AdminWorkspaceRouteId,
} from './types'

interface AdminWorkspaceShellProps {
  title: string
  activeRoute: AdminWorkspaceRouteId
  searchValue: string
  onSearchChange: (value: string) => void
  notifications: AdminWorkspaceNotification[]
  quickActions: AdminWorkspaceQuickAction[]
  children: ReactNode
}

const NAV_ITEMS: Array<{
  id: AdminWorkspaceRouteId
  label: string
  href: string
  Icon: typeof Settings
}> = [
  {
    id: 'global',
    label: 'Global Configuration',
    href: '/admin/dashboard?section=global-config',
    Icon: Settings,
  },
  {
    id: 'financial',
    label: 'Financial Auditing Desk',
    href: '/admin/dashboard?section=financial-audit',
    Icon: Search,
  },
  {
    id: 'academic',
    label: 'Academic Matrix Setup',
    href: '/admin/academic-matrix',
    Icon: Grid3X3,
  },
  {
    id: 'users',
    label: 'User Accounts',
    href: '/admin/dashboard?section=user-accounts',
    Icon: Users,
  },
]

const TONE_DOT: Record<
  NonNullable<AdminWorkspaceNotification['tone']>,
  string
> = {
  info: 'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
}

function getInitials(
  firstName: string,
  lastName: string
): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`
    .trim()
    .toUpperCase()
}

export default function AdminWorkspaceShell({
  title,
  activeRoute,
  searchValue,
  onSearchChange,
  notifications,
  quickActions,
  children,
}: AdminWorkspaceShellProps) {
  const { user } = useAuth()

  const [leftOpen, setLeftOpen] =
    useState(false)
  const [rightOpen, setRightOpen] =
    useState(false)

  const fullName = useMemo(() => {
    if (!user) {
      return 'Administrator'
    }

    return `${user.FirstName} ${user.LastName}`.trim()
  }, [user])

  const initials = user
    ? getInitials(
        user.FirstName,
        user.LastName
      )
    : 'AD'

  const closePanels = () => {
    setLeftOpen(false)
    setRightOpen(false)
  }

  const leftPanel = (
    <aside className="h-full bg-[#232A42] text-white p-4 flex flex-col overflow-y-auto">
      <button
        type="button"
        onClick={() =>
          setLeftOpen(false)
        }
        aria-label="Close navigation menu"
        className="lg:hidden absolute top-3 right-3 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white active:bg-white/10 rounded-lg touch-manipulation"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-6 mt-1 lg:mt-6">
        <span className="font-bold text-white">
          Navigator
        </span>
      </div>

      <div className="bg-[#D9D9D9]/15 rounded-lg p-2 mb-6">
        <div className="flex justify-between items-center">
          <div className="p-2 rounded-lg bg-[#2C3553] text-white">
            <Home className="w-5 h-5" />
          </div>

          <div className="p-2 rounded-lg text-gray-400">
            <BarChart3 className="w-5 h-5" />
          </div>

          <div className="p-2 rounded-lg text-gray-400">
            <Bell className="w-5 h-5" />
          </div>

          <div className="p-2 rounded-lg text-gray-400">
            <Settings className="w-5 h-5" />
          </div>
        </div>
      </div>

      <nav className="space-y-1.5 sm:space-y-8">
        {NAV_ITEMS.map(
          ({
            id,
            label,
            href,
            Icon,
          }) => {
            const active =
              id === activeRoute

            return (
              <Link
                key={id}
                href={href}
                onClick={closePanels}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-xs sm:text-sm touch-manipulation
                  ${
                    active
                      ? 'bg-[#D9D9D9]/15 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#D9D9D9]/10 active:bg-[#D9D9D9]/20'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />

                <span className="font-medium truncate">
                  {label}
                </span>
              </Link>
            )
          }
        )}
      </nav>
    </aside>
  )

  const rightPanel = (
    <aside className="h-full bg-[#20283f] text-white flex flex-col">
      <div className="px-4 pt-7 pb-4 border-b border-white/10">
        <h2 className="font-bold text-sm">
          Notifications
        </h2>
      </div>

      <div className="px-4 py-4 space-y-5">
        {notifications.map(
          (notification) => (
            <article
              key={notification.id}
              className="flex gap-2.5"
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-sm flex-shrink-0 ${
                  TONE_DOT[
                    notification.tone ??
                      'info'
                  ]
                }`}
              />

              <div className="min-w-0">
                <h3 className="text-[11px] font-semibold text-white leading-tight">
                  {notification.title}
                </h3>

                <p className="text-[9px] leading-relaxed text-gray-400 mt-1">
                  {notification.description}
                </p>
              </div>
            </article>
          )
        )}
      </div>

      <div className="mt-1 border-t border-white/10 px-4 pt-4">
        <h2 className="font-bold text-sm">
          Quick Actions
        </h2>

        <div className="mt-4 space-y-4">
          {quickActions.map(
            ({
              id,
              label,
              Icon,
              tone = 'primary',
              onClick,
            }) => (
              <button
                key={id}
                type="button"
                onClick={onClick}
                className={`w-full rounded-lg py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] ${
                  tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#f1f1ef]">
      <div className="lg:hidden sticky top-0 z-40 h-16 bg-[#20283f] text-white px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setLeftOpen(true)
          }
          className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center"
          aria-label="Open admin navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold">
            Academic Matrix
          </p>
          <p className="text-[10px] text-gray-400">
            {title}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRightOpen(true)
          }
          className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center relative"
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5" />

          {notifications.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)_275px] xl:grid-cols-[240px_minmax(0,1fr)_275px] min-h-screen">
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          {leftPanel}
        </div>

        <main className="min-w-0 bg-[#f1f1ef]">
          <div className="flex justify-center">
            <div className="bg-[#dededc] rounded-b-lg px-6 py-2">
              <h2 className="text-[11px] sm:text-xs font-bold text-[#20283f]">
                {title}
              </h2>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-10">
            <div className="flex items-center justify-between gap-4 mb-7">
              <label className="relative flex-1 max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) =>
                    onSearchChange(
                      event.target.value
                    )
                  }
                  placeholder="Search"
                  className="w-full h-10 rounded-xl bg-[#d9d9d7] pl-12 pr-4 text-sm text-gray-800 placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-[#20283f]/20"
                />
              </label>

              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#1d4f7a] text-white overflow-hidden flex items-center justify-center font-bold text-xs border-2 border-white shadow">
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

                <button
                  type="button"
                  onClick={() =>
                    setRightOpen(true)
                  }
                  className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200"
                  aria-label="Open actions"
                >
                  <Menu className="w-5 h-5 text-[#20283f]" />
                </button>
              </div>
            </div>

            {children}
          </div>
        </main>

        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          {rightPanel}
        </div>
      </div>

      {leftOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            onClick={() =>
              setLeftOpen(false)
            }
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
          />

          <div className="relative w-[82%] max-w-[300px] h-full shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setLeftOpen(false)
              }
              className="absolute right-3 top-3 z-10 w-9 h-9 rounded-lg text-white hover:bg-white/10 flex items-center justify-center"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>

            {leftPanel}
          </div>
        </div>
      )}

      {rightOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            onClick={() =>
              setRightOpen(false)
            }
            className="absolute inset-0 bg-black/50"
            aria-label="Close notifications"
          />

          <div className="relative ml-auto w-[82%] max-w-[320px] h-full shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setRightOpen(false)
              }
              className="absolute left-3 top-3 z-10 w-9 h-9 rounded-lg text-white hover:bg-white/10 flex items-center justify-center"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>

            {rightPanel}
          </div>
        </div>
      )}
    </div>
  )
}
