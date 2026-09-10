'use client'

import {
  Bell,
  Grid3X3,
  Home,
  Menu,
  Search,
  Settings,
  School,
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
  description: string
  href: string
  Icon: typeof Settings
}> = [
  {
    id: 'global',
    label: 'Dashboard',
    description: 'Overview & configuration',
    href: '/admin/dashboard?section=global-config',
    Icon: Home,
  },
  {
    id: 'financial',
    label: 'Financial Audit',
    description: 'Fees, payments & records',
    href: '/admin/dashboard?section=financial-audit',
    Icon: Search,
  },
  {
    id: 'academic',
    label: 'Academic Matrix',
    description: 'Courses & performance',
    href: '/admin/academic-matrix',
    Icon: Grid3X3,
  },
  {
    id: 'users',
    label: 'User Accounts',
    description: 'Students, staff & access',
    href: '/admin/dashboard?section=user-accounts',
    Icon: Users,
  },
]

const TONE_DOT: Record<
  NonNullable<AdminWorkspaceNotification['tone']>,
  string
> = {
  info: 'bg-sky-400',
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

  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const fullName = useMemo(() => {
    if (!user) {
      return 'Administrator'
    }

    return `${user.FirstName} ${user.LastName}`.trim() || 'Administrator'
  }, [user])

  const roleName = useMemo(() => {
    const role = user?.Role || 'admin'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }, [user])

  const initials = user
    ? getInitials(
        user.FirstName || '',
        user.LastName || ''
      ) || 'AD'
    : 'AD'

  const closePanels = () => {
    setLeftOpen(false)
    setRightOpen(false)
  }


  const leftPanel = (
    <aside className="h-full bg-[#20283f] text-white p-4 flex flex-col overflow-y-auto">
      <button
        type="button"
        onClick={() => setLeftOpen(false)}
        aria-label="Close navigation menu"
        className="lg:hidden absolute top-3 right-3 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white active:bg-white/10 rounded-lg touch-manipulation"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-7 mt-1 lg:mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C75712] flex items-center justify-center shadow-lg shadow-black/10">
            <School className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <div className="text-[15px] font-bold tracking-tight text-white">
              StarLight
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Admin Workspace
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500">
        Workspace
      </div>

      <nav className="space-y-1.5">
        {NAV_ITEMS.map(
          ({
            id,
            label,
            href,
            Icon,
          }) => {
            const active = id === activeRoute

            return (
              <Link
                key={id}
                href={href}
                onClick={closePanels}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-xs sm:text-sm touch-manipulation
                  ${
                    active
                      ? 'bg-white/[0.10] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.10]'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />

                <span className="font-semibold truncate">
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
    <aside className="h-full bg-[#20283f] text-white flex flex-col overflow-y-auto">
      <div className="px-5 pt-7 pb-5 border-b border-white/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
              Activity
            </p>

            <h2 className="mt-1 text-sm font-bold">
              Notifications
            </h2>
          </div>

          <div className="relative w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Bell className="w-4 h-4 text-slate-300" />

            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#C75712] text-[8px] font-bold flex items-center justify-center border-2 border-[#20283f]">
                {notifications.length > 9
                  ? '9+'
                  : notifications.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="space-y-2.5">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-3.5 hover:bg-white/[0.055] transition"
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      TONE_DOT[
                        notification.tone ?? 'info'
                      ]
                    }`}
                  />

                  <div className="min-w-0">
                    <h3 className="text-[11px] font-semibold text-white leading-tight">
                      {notification.title}
                    </h3>

                    <p className="text-[9px] leading-relaxed text-slate-400 mt-1.5">
                      {notification.description}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
              <Bell className="w-5 h-5 text-slate-600 mx-auto mb-2" />

              <p className="text-[10px] font-medium text-slate-400">
                No new notifications
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-white/[0.07] px-4 py-5">
        <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
          Quick Actions
        </p>

        <div className="mt-3 space-y-2">
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
                className={`
                  w-full rounded-xl py-2.5 px-3 text-[10px] font-semibold flex items-center gap-2.5 transition-all
                  ${
                    tone === 'danger'
                      ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                      : 'bg-white/[0.055] text-slate-200 hover:bg-white/[0.09]'
                  }
                `}
              >
                <div
                  className={`
                    w-7 h-7 rounded-lg flex items-center justify-center
                    ${
                      tone === 'danger'
                        ? 'bg-red-500/15'
                        : 'bg-[#315b80]/50'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <span>{label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#f3f4f2]">
      <div className="lg:hidden sticky top-0 z-40 h-16 bg-[#20283f] text-white px-4 flex items-center justify-between border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => setLeftOpen(true)}
          className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
          aria-label="Open admin navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 text-center px-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
            Administration
          </p>

          <p className="text-sm font-semibold truncate">
            {title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRightOpen(true)}
          className="relative w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5" />

          {notifications.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C75712]" />
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)_285px] min-h-screen">
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          {leftPanel}
        </div>

        <main className="min-w-0 bg-[#f3f4f2]">
          <header className="hidden lg:flex h-[76px] items-center justify-between gap-6 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl px-6 xl:px-8 sticky top-0 z-30">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-slate-400">
                Administration
              </p>

              <h1 className="mt-1 text-lg font-bold tracking-tight text-[#20283f] truncate">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative w-[260px] xl:w-[320px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) =>
                    onSearchChange(event.target.value)
                  }
                  placeholder="Search workspace..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-[#f6f7f5] pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#C75712]/50 focus:ring-4 focus:ring-[#C75712]/10"
                />
              </label>

              <div className="w-px h-7 bg-slate-200" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#315b80] text-white overflow-hidden flex items-center justify-center font-bold text-[11px] shadow-sm">
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

                <div className="hidden xl:block">
                  <p className="text-[11px] font-semibold text-[#20283f] leading-tight">
                    {fullName}
                  </p>

                  <p className="text-[9px] text-slate-400 mt-1">
                    {roleName}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 sm:px-6 lg:px-7 xl:px-8 pt-5 sm:pt-6 lg:pt-7 pb-12">
            <div className="lg:hidden mb-5">
              <label className="relative block">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) =>
                    onSearchChange(event.target.value)
                  }
                  placeholder="Search workspace..."
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#C75712]/50 focus:ring-4 focus:ring-[#C75712]/10"
                />
              </label>
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
            onClick={() => setLeftOpen(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close navigation"
          />

          <div className="relative w-[84%] max-w-[310px] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setLeftOpen(false)}
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
            onClick={() => setRightOpen(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close notifications"
          />

          <div className="relative ml-auto w-[84%] max-w-[330px] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setRightOpen(false)}
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
