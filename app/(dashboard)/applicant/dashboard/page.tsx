'use client'

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  School,
  User,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Query } from 'appwrite'

import { databases } from '@/lib/appwrite/config'
import { useAuth } from '@/contexts/auth-context'

type Document = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

type ApplicantData = {
  profile: Document | null
  announcements: Document[]
  events: Document[]
}

function collectionId(
  fallback: string,
  ...values: Array<string | undefined>
) {
  return values.find((value) => value?.trim())?.trim() || fallback
}

function databaseId() {
  const value = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID?.trim()
  if (!value) throw new Error('Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID')
  return value
}

function text(
  document: Document | null | undefined,
  keys: string[],
  fallback = ''
): string {
  if (!document) return fallback

  for (const key of keys) {
    const value = document[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return fallback
}

async function safeList(
  collection: string,
  queries: string[] = [Query.orderDesc('$createdAt'), Query.limit(20)]
): Promise<Document[]> {
  try {
    const response = await databases.listDocuments(
      databaseId(),
      collection,
      queries
    )
    return response.documents as unknown as Document[]
  } catch (error) {
    console.warn(`Could not load ${collection}:`, error)
    return []
  }
}

async function loadApplicantData(userId: string): Promise<ApplicantData> {
  const [profiles, announcements, events] = await Promise.all([
    safeList(
      collectionId(
        'applicants',
        process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
      ),
      [Query.equal('userId', userId), Query.limit(1)]
    ),
    safeList(
      collectionId(
        'announcements',
        process.env.NEXT_PUBLIC_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID
      )
    ),
    safeList(
      collectionId(
        'calendar',
        process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_COLLECTION_ID
      )
    ),
  ])

  return {
    profile: profiles[0] || null,
    announcements,
    events,
  }
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase()

  if (normalized === 'accepted') {
    return {
      Icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 border-green-200',
      progress: 100,
    }
  }

  if (normalized === 'rejected') {
    return {
      Icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-200',
      progress: 100,
    }
  }

  return {
    Icon: Clock3,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    progress: 45,
  }
}

export default function ApplicantDashboardPage() {
  const { user, logout } = useAuth()
  const [data, setData] = useState<ApplicantData>({
    profile: null,
    announcements: [],
    events: [],
  })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      setData(await loadApplicantData(user.$id))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const status = text(data.profile, ['Status'], 'No application')
  const presentation = statusStyle(status)
  const StatusIcon = presentation.Icon

  const upcomingEvents = useMemo(() => {
    const now = Date.now()

    return data.events
      .filter((event) => {
        const raw = text(event, ['Date'])
        const timestamp = new Date(raw).getTime()
        return Number.isFinite(timestamp) && timestamp >= now
      })
      .sort(
        (left, right) =>
          new Date(text(left, ['Date'])).getTime() -
          new Date(text(right, ['Date'])).getTime()
      )
      .slice(0, 5)
  }, [data.events])

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <header className="sticky top-0 z-40 bg-[#232A42] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-bold">Applicant Dashboard</h1>
            <p className="text-xs text-gray-400">
              Live admissions information from Appwrite
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void logout('/')}
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-[#232A42] p-6 text-white shadow-lg">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Applicant
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {user
                    ? `${user.FirstName} ${user.LastName}`.trim()
                    : 'Applicant'}
                </h2>
                <p className="mt-2 text-sm text-gray-300">{user?.Email}</p>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${presentation.className}`}
              >
                <StatusIcon className="h-5 w-5" />
                {status}
              </div>
            </div>
          </section>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl bg-white p-6 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading application record...
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#C75712]" />
                  <h3 className="font-bold text-gray-900">
                    Application Record
                  </h3>
                </div>

                {data.profile ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {[
                      [
                        'Application Number',
                        text(data.profile, ['ApplicationNo'], data.profile.$id),
                      ],
                      [
                        'Level / Form Applied',
                        text(
                          data.profile,
                          ['LevelOrFormApplied'],
                          'Not recorded'
                        ),
                      ],
                      ['Status', status],
                      [
                        'Submitted',
                        data.profile.$createdAt
                          ? new Date(
                              data.profile.$createdAt
                            ).toLocaleDateString()
                          : 'Not recorded',
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {value}
                        </p>
                      </div>
                    ))}

                    <div className="sm:col-span-2">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-gray-500">
                          Application progress
                        </span>
                        <strong>{presentation.progress}%</strong>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-[#C75712]"
                          style={{ width: `${presentation.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-gray-500">
                    No applicant profile is linked to this user account.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">
                    School Announcements
                  </h3>
                </div>

                <div className="mt-4 divide-y divide-gray-100">
                  {data.announcements.slice(0, 8).map((announcement) => (
                    <article key={announcement.$id} className="py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {text(announcement, ['Title'], 'Announcement')}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
                        {text(
                          announcement,
                          ['Message', 'Description'],
                          'No description provided.'
                        )}
                      </p>
                    </article>
                  ))}

                  {data.announcements.length === 0 && (
                    <p className="py-6 text-sm text-gray-500">
                      No announcements exist in Appwrite.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#C75712]" />
              <h3 className="font-bold text-gray-900">Profile</h3>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">
                  {user?.phone || 'Not recorded'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-medium capitalize text-gray-900">
                  {user?.Role || 'applicant'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Upcoming Events</h3>
            </div>

            <div className="mt-4 space-y-4">
              {upcomingEvents.map((event) => (
                <article key={event.$id}>
                  <p className="text-sm font-semibold text-gray-900">
                    {text(event, ['Title'], 'School event')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(text(event, ['Date'])).toLocaleDateString()}
                  </p>
                </article>
              ))}

              {upcomingEvents.length === 0 && (
                <p className="text-sm text-gray-500">
                  No upcoming calendar events.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <School className="mt-0.5 h-5 w-5 text-blue-700" />
              <p className="text-xs leading-relaxed text-blue-800">
                Interview and document-upload information is not displayed
                unless a corresponding database table exists.
              </p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
