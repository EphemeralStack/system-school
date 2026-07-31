'use client'

import {
  AlertCircle,
  Bell,
  BookOpen,
  DollarSign,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  School,
  User,
  Users,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Query,
} from 'appwrite'

import {
  databases,
} from '@/lib/appwrite/config'
import {
  FinancialLedger,
  RbacMatrix,
  StatsCard,
} from '@/components/dashboard'
import {
  readPersistentCache,
  writePersistentCache,
  type PersistentCacheSnapshot,
} from '@/lib/client/persistent-cache'

type Document = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

type DocumentList = {
  documents: Document[]
  total: number
}

type LedgerEntry = {
  date: string
  name: string
  class: string
  invoiceId: string
  amount: string
  status: string
}

type RbacEntry = {
  name: string
  role: string
  email: string
  classroom: string
}

type LiveNotification = {
  id: string
  title: string
  description: string
  time: string
  type:
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
}

type LiveDashboardData = {
  students: number
  teachers: number
  applicants: number
  classes: number
  ledger: LedgerEntry[]
  access: RbacEntry[]
  notifications:
    LiveNotification[]
}

interface LiveDashboardState {
  data:
    | LiveDashboardData
    | null
  savedAt:
    | number
    | null
  loading: boolean
  refreshing: boolean
  error: string
  refresh: () => Promise<void>
}

const CACHE_VERSION = 2

const CACHE_MAXIMUM_AGE_MS =
  7 * 24 * 60 * 60 * 1000

const CACHE_FRESH_FOR_MS =
  5 * 60 * 1000

const DATA_UPDATED_EVENT =
  'school-suite:global-dashboard-updated'

export const GLOBAL_DASHBOARD_REFRESH_EVENT =
  'school-suite:refresh-global-dashboard'

let memorySnapshot:
  PersistentCacheSnapshot<LiveDashboardData> | null =
  null

let activeRequest:
  Promise<
    PersistentCacheSnapshot<LiveDashboardData>
  > | null = null

function dashboardCacheKey(): string {
  const projectId =
    process.env
      .NEXT_PUBLIC_APPWRITE_PROJECT_ID
      ?.trim() ||
    'project'

  const databaseId =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim() ||
    'database'

  return [
    'school-suite',
    projectId,
    databaseId,
    'global-dashboard',
    `v${CACHE_VERSION}`,
  ].join(':')
}

function collectionId(
  fallback: string,
  ...values:
    Array<
      string | undefined
    >
): string {
  return (
    values
      .find(
        (value) =>
          value?.trim()
      )
      ?.trim() ||
    fallback
  )
}

function databaseId(): string {
  const value =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim()

  if (!value) {
    throw new Error(
      'Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID.'
    )
  }

  return value
}

function text(
  document:
    | Document
    | undefined,
  keys: string[],
  fallback = ''
): string {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value =
      document[key]

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim()
    }

    if (
      typeof value ===
        'number' &&
      Number.isFinite(value)
    ) {
      return String(value)
    }
  }

  return fallback
}

function numberValue(
  document:
    | Document
    | undefined,
  keys: string[],
  fallback = 0
): number {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value =
      document[key]

    if (
      typeof value ===
        'number' &&
      Number.isFinite(value)
    ) {
      return value
    }

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      const parsed =
        Number(value)

      if (
        Number.isFinite(
          parsed
        )
      ) {
        return parsed
      }
    }
  }

  return fallback
}

function dateValue(
  document:
    | Document
    | undefined,
  keys: string[]
): Date {
  const raw =
    text(
      document,
      keys,
      document?.$createdAt ||
        ''
    )

  const parsed =
    new Date(raw)

  return Number.isNaN(
    parsed.getTime()
  )
    ? new Date(0)
    : parsed
}

function timeAgo(
  value:
    | string
    | undefined
): string {
  if (!value) {
    return 'Recently'
  }

  const timestamp =
    new Date(
      value
    ).getTime()

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return 'Recently'
  }

  const minutes =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          timestamp
        ) /
          60000
      )
    )

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return `${minutes} min${
      minutes === 1
        ? ''
        : 's'
    } ago`
  }

  const hours =
    Math.floor(
      minutes / 60
    )

  if (hours < 24) {
    return `${hours} hour${
      hours === 1
        ? ''
        : 's'
    } ago`
  }

  const days =
    Math.floor(
      hours / 24
    )

  return `${days} day${
    days === 1
      ? ''
      : 's'
  } ago`
}

function money(
  value: number
): string {
  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }
  ).format(value)
}

function ledgerStatus(
  raw: string
): string {
  const status =
    raw.toLowerCase()

  if (
    status.includes(
      'overdue'
    ) ||
    status.includes(
      'late'
    ) ||
    status.includes(
      'flag'
    ) ||
    status.includes(
      'reject'
    ) ||
    status.includes(
      'failed'
    )
  ) {
    return 'Overdue'
  }

  if (
    status.includes(
      'pending'
    ) ||
    status.includes(
      'processing'
    )
  ) {
    return 'Pending'
  }

  return 'Verified'
}

async function listCollection(
  collection: string,
  queries:
    string[] = [
      Query.orderDesc(
        '$createdAt'
      ),
      Query.limit(100),
    ]
): Promise<DocumentList> {
  const response =
    await databases.listDocuments(
      databaseId(),
      collection,
      queries
    )

  return {
    documents:
      response.documents as unknown as Document[],
    total:
      response.total,
  }
}

async function loadLiveDashboardData():
  Promise<LiveDashboardData> {
  const [
    studentsResult,
    teachersResult,
    applicantsResult,
    classesResult,
    usersResult,
    feesResult,
    paymentsResult,
    teacherSubjectsResult,
    announcementsResult,
    attendanceResult,
  ] =
    await Promise.all([
      listCollection(
        collectionId(
          'students',
          process.env
            .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'teachers',
          process.env
            .NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'applicants',
          process.env
            .NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'classes',
          process.env
            .NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'users',
          process.env
            .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'fees',
          process.env
            .NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'payments',
          process.env
            .NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID
        ),
        [
          Query.orderDesc(
            '$createdAt'
          ),
          Query.limit(8),
        ]
      ),
      listCollection(
        collectionId(
          'teacher_subjects',
          process.env
            .NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID,
          process.env
            .NEXT_PUBLIC_APPWRITE_TEACHERSUBJECTS_COLLECTION_ID
        )
      ),
      listCollection(
        collectionId(
          'announcements',
          process.env
            .NEXT_PUBLIC_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID
        ),
        [
          Query.orderDesc(
            '$createdAt'
          ),
          Query.limit(1),
        ]
      ),
      listCollection(
        collectionId(
          'attendance',
          process.env
            .NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID
        )
      ),
    ])

  const students =
    studentsResult.documents

  const teachers =
    teachersResult.documents

  const applicants =
    applicantsResult.documents

  const classes =
    classesResult.documents

  const users =
    usersResult.documents

  const fees =
    feesResult.documents

  const payments =
    paymentsResult.documents

  const teacherSubjects =
    teacherSubjectsResult.documents

  const announcements =
    announcementsResult.documents

  const attendance =
    attendanceResult.documents

  const usersById =
    new Map(
      users.map(
        (document) => [
          document.$id,
          document,
        ]
      )
    )

  const studentsById =
    new Map(
      students.map(
        (document) => [
          document.$id,
          document,
        ]
      )
    )

  const feesById =
    new Map(
      fees.map(
        (document) => [
          document.$id,
          document,
        ]
      )
    )

  const classesById =
    new Map(
      classes.map(
        (document) => [
          document.$id,
          document,
        ]
      )
    )

  const ledger =
    payments.map(
      (
        payment
      ): LedgerEntry => {
        const fee =
          feesById.get(
            text(
              payment,
              [
                'feeId',
                'FeeId',
              ]
            )
          )

        const student =
          studentsById.get(
            text(
              fee,
              [
                'studentId',
                'StudentId',
              ]
            )
          )

        const user =
          usersById.get(
            text(
              student,
              [
                'userId',
                'UserId',
              ]
            )
          )

        const date =
          dateValue(
            payment,
            [
              'Date',
              'PaymentDate',
            ]
          )

        return {
          date:
            date.getTime() ===
            0
              ? 'Not recorded'
              : date.toLocaleDateString(),
          name:
            `${text(
              user,
              [
                'FirstName',
              ],
              'Unknown'
            )} ${text(
              user,
              [
                'LastName',
              ]
            )}`.trim(),
          class:
            text(
              fee,
              [
                'LevelOrForm',
              ]
            ) ||
            text(
              student,
              [
                'Form',
                'Level',
              ],
              'Not assigned'
            ),
          invoiceId:
            text(
              payment,
              [
                'Reference',
              ],
              payment.$id
            ),
          amount:
            money(
              numberValue(
                payment,
                [
                  'Amount',
                ]
              )
            ),
          status:
            ledgerStatus(
              text(
                payment,
                [
                  'Status',
                ],
                'Verified'
              )
            ),
        }
      }
    )

  const teacherAllocations =
    new Map<
      string,
      Document[]
    >()

  teacherSubjects.forEach(
    (allocation) => {
      const teacherId =
        text(
          allocation,
          [
            'teacherId',
            'TeacherId',
          ]
        )

      if (!teacherId) {
        return
      }

      const existing =
        teacherAllocations.get(
          teacherId
        ) || []

      existing.push(
        allocation
      )

      teacherAllocations.set(
        teacherId,
        existing
      )
    }
  )

  const access =
    teachers
      .slice(0, 8)
      .map(
        (
          teacher
        ): RbacEntry => {
          const user =
            usersById.get(
              text(
                teacher,
                [
                  'userId',
                  'UserId',
                ]
              )
            )

          const allocation =
            teacherAllocations.get(
              teacher.$id
            )?.[0]

          const classDocument =
            classesById.get(
              text(
                allocation,
                [
                  'classId',
                  'ClassId',
                ]
              )
            )

          return {
            name:
              `${text(
                user,
                [
                  'FirstName',
                ],
                'Unknown'
              )} ${text(
                user,
                [
                  'LastName',
                ]
              )}`.trim(),
            role:
              'TEACHER',
            email:
              text(
                user,
                [
                  'Email',
                ],
                'No email'
              ),
            classroom:
              text(
                classDocument,
                [
                  'LevelOrForm',
                  'Name',
                  'Room',
                ],
                'Unassigned'
              ),
          }
        }
      )

  const notifications:
    LiveNotification[] = []

  const latestAnnouncement =
    announcements[0]

  if (
    latestAnnouncement
  ) {
    notifications.push({
      id:
        `announcement-${latestAnnouncement.$id}`,
      title:
        text(
          latestAnnouncement,
          [
            'Title',
          ],
          'Announcement'
        ),
      description:
        text(
          latestAnnouncement,
          [
            'Message',
            'Description',
          ],
          'A new announcement was published.'
        ),
      time:
        timeAgo(
          latestAnnouncement.$createdAt
        ),
      type:
        'info',
    })
  }

  const latestApplicant =
    applicants[0]

  if (
    latestApplicant
  ) {
    const status =
      text(
        latestApplicant,
        [
          'Status',
        ],
        'pending'
      )

    notifications.push({
      id:
        `applicant-${latestApplicant.$id}`,
      title:
        `Applicant ${status}`,
      description:
        `${text(
          latestApplicant,
          [
            'ApplicationNo',
          ],
          latestApplicant.$id
        )} is currently ${status}.`,
      time:
        timeAgo(
          latestApplicant.$updatedAt ||
            latestApplicant.$createdAt
        ),
      type:
        status.toLowerCase() ===
        'accepted'
          ? 'success'
          : status.toLowerCase() ===
              'rejected'
            ? 'error'
            : 'warning',
    })
  }

  const latestPayment =
    payments[0]

  if (
    latestPayment
  ) {
    notifications.push({
      id:
        `payment-${latestPayment.$id}`,
      title:
        'Payment recorded',
      description:
        `${money(
          numberValue(
            latestPayment,
            [
              'Amount',
            ]
          )
        )} via ${text(
          latestPayment,
          [
            'Method',
          ],
          'unspecified method'
        )}.`,
      time:
        timeAgo(
          latestPayment.$createdAt
        ),
      type:
        'success',
    })
  }

  const absentCount =
    attendance.filter(
      (entry) => {
        const status =
          text(
            entry,
            [
              'Status',
            ]
          ).toLowerCase()

        return (
          status ===
            'absent' ||
          status ===
            'late'
        )
      }
    ).length

  if (
    absentCount > 0
  ) {
    notifications.push({
      id:
        'attendance-alert',
      title:
        'Attendance requires attention',
      description:
        `${absentCount} attendance records are marked absent or late.`,
      time:
        'Current database',
      type:
        'warning',
    })
  }

  return {
    students:
      studentsResult.total,
    teachers:
      teachersResult.total,
    applicants:
      applicantsResult.total,
    classes:
      classesResult.total,
    ledger,
    access,
    notifications,
  }
}

function readDashboardCache():
  PersistentCacheSnapshot<LiveDashboardData> | null {
  if (
    memorySnapshot
  ) {
    return memorySnapshot
  }

  const cached =
    readPersistentCache<LiveDashboardData>(
      dashboardCacheKey(),
      CACHE_VERSION,
      CACHE_MAXIMUM_AGE_MS
    )

  if (cached) {
    memorySnapshot =
      cached
  }

  return cached
}

async function refreshDashboardCache():
  Promise<
    PersistentCacheSnapshot<LiveDashboardData>
  > {
  if (
    activeRequest
  ) {
    return activeRequest
  }

  activeRequest =
    loadLiveDashboardData()
      .then(
        (data) => {
          const snapshot =
            writePersistentCache(
              dashboardCacheKey(),
              CACHE_VERSION,
              data
            )

          memorySnapshot =
            snapshot

          if (
            typeof window !==
            'undefined'
          ) {
            window.dispatchEvent(
              new CustomEvent(
                DATA_UPDATED_EVENT,
                {
                  detail:
                    snapshot,
                }
              )
            )
          }

          return snapshot
        }
      )
      .finally(() => {
        activeRequest =
          null
      })

  return activeRequest
}

function formatSavedTime(
  savedAt:
    | number
    | null
): string {
  if (!savedAt) {
    return ''
  }

  return new Date(
    savedAt
  ).toLocaleTimeString(
    [],
    {
      hour:
        '2-digit',
      minute:
        '2-digit',
    }
  )
}

function useLiveDashboardData():
  LiveDashboardState {
  const initialMemory =
    memorySnapshot

  const [
    data,
    setData,
  ] =
    useState<
      LiveDashboardData | null
    >(
      initialMemory?.data ||
        null
    )

  const [
    savedAt,
    setSavedAt,
  ] =
    useState<
      number | null
    >(
      initialMemory?.savedAt ||
        null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      !initialMemory
    )

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const refresh =
    useCallback(
      async () => {
        const hasData =
          Boolean(
            readDashboardCache()
          )

        if (hasData) {
          setRefreshing(
            true
          )
        } else {
          setLoading(
            true
          )
        }

        setError('')

        try {
          const snapshot =
            await refreshDashboardCache()

          setData(
            snapshot.data
          )
          setSavedAt(
            snapshot.savedAt
          )
        } catch (
          caughtError
        ) {
          console.error(
            'Could not refresh the dashboard:',
            caughtError
          )

          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : 'The dashboard could not be refreshed.'
          )
        } finally {
          setLoading(
            false
          )
          setRefreshing(
            false
          )
        }
      },
      []
    )

  useEffect(() => {
    const cached =
      readDashboardCache()

    if (cached) {
      setData(
        cached.data
      )
      setSavedAt(
        cached.savedAt
      )
      setLoading(
        false
      )
    }

    const cacheIsStale =
      !cached ||
      Date.now() -
        cached.savedAt >
        CACHE_FRESH_FOR_MS

    if (cacheIsStale) {
      void refresh()
    }

    const handleUpdated =
      (
        event: Event
      ) => {
        const customEvent =
          event as CustomEvent<
            PersistentCacheSnapshot<LiveDashboardData>
          >

        if (
          !customEvent.detail
        ) {
          return
        }

        setData(
          customEvent.detail.data
        )
        setSavedAt(
          customEvent.detail.savedAt
        )
        setLoading(
          false
        )
        setError('')
      }

    const handleRequested =
      () => {
        void refresh()
      }

    const handleOnline =
      () => {
        void refresh()
      }

    const handleFocus =
      () => {
        const latest =
          readDashboardCache()

        const stale =
          !latest ||
          Date.now() -
            latest.savedAt >
            CACHE_FRESH_FOR_MS

        if (stale) {
          void refresh()
        }
      }

    window.addEventListener(
      DATA_UPDATED_EVENT,
      handleUpdated
    )

    window.addEventListener(
      GLOBAL_DASHBOARD_REFRESH_EVENT,
      handleRequested
    )

    window.addEventListener(
      'online',
      handleOnline
    )

    window.addEventListener(
      'focus',
      handleFocus
    )

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void refresh()
          }
        },
        CACHE_FRESH_FOR_MS
      )

    return () => {
      window.removeEventListener(
        DATA_UPDATED_EVENT,
        handleUpdated
      )

      window.removeEventListener(
        GLOBAL_DASHBOARD_REFRESH_EVENT,
        handleRequested
      )

      window.removeEventListener(
        'online',
        handleOnline
      )

      window.removeEventListener(
        'focus',
        handleFocus
      )

      window.clearInterval(
        interval
      )
    }
  }, [refresh])

  return {
    data,
    savedAt,
    loading,
    refreshing,
    error,
    refresh,
  }
}

function ActionButtons({
  onAdd,
  onView,
}: {
  onAdd?: () => void
  onView?: () => void
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#C75712] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#D96A1E]"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>

      <button
        type="button"
        onClick={onView}
        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
      >
        <Eye className="h-3 w-3" />
        View
      </button>
    </div>
  )
}

function DataStatus({
  loading,
  error,
  hasData,
  savedAt,
  refresh,
}: {
  loading: boolean
  error: string
  hasData: boolean
  savedAt:
    | number
    | null
  refresh: () => Promise<void>
}) {
  if (
    loading &&
    !hasData
  ) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading dashboard data...
      </div>
    )
  }

  if (
    error &&
    !hasData
  ) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          No saved dashboard data is available. Check the connection.
        </span>

        <button
          type="button"
          onClick={() =>
            void refresh()
          }
          className="font-semibold underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (
    error &&
    hasData
  ) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Showing saved data
          {savedAt
            ? ` from ${formatSavedTime(savedAt)}`
            : ''}
          . The background refresh failed.
        </span>

        <button
          type="button"
          onClick={() =>
            void refresh()
          }
          className="font-semibold underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return null
}

export function GlobalConfigLiveWorkspace({
  onAddStudent,
  onAddTeacher,
  onAddApplicant,
  onAddClass,
  onViewStudents,
  onViewTeachers,
  onViewApplicants,
  onViewClasses,
}: {
  onAddStudent?: () => void
  onAddTeacher?: () => void
  onAddApplicant?: () => void
  onAddClass?: () => void
  onViewStudents?: () => void
  onViewTeachers?: () => void
  onViewApplicants?: () => void
  onViewClasses?: () => void
}) {
  const {
    data,
    savedAt,
    loading,
    refreshing,
    error,
    refresh,
  } =
    useLiveDashboardData()

  const hasData =
    data !== null

  return (
    <div>
      <DataStatus
        loading={loading}
        error={error}
        hasData={hasData}
        savedAt={savedAt}
        refresh={refresh}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsCard
          title="Total Enrolled Students"
          value={
            data
              ? data.students.toLocaleString()
              : '—'
          }
          icon={
            <User className="h-5 w-5 text-blue-600" />
          }
        >
          <ActionButtons
            onAdd={
              onAddStudent
            }
            onView={
              onViewStudents
            }
          />
        </StatsCard>

        <StatsCard
          title="Total Teachers"
          value={
            data
              ? data.teachers.toLocaleString()
              : '—'
          }
          icon={
            <Users className="h-5 w-5 text-green-600" />
          }
        >
          <ActionButtons
            onAdd={
              onAddTeacher
            }
            onView={
              onViewTeachers
            }
          />
        </StatsCard>

        <StatsCard
          title="Total Applicants"
          value={
            data
              ? data.applicants.toLocaleString()
              : '—'
          }
          icon={
            <FileText className="h-5 w-5 text-yellow-600" />
          }
        >
          <ActionButtons
            onAdd={
              onAddApplicant
            }
            onView={
              onViewApplicants
            }
          />
        </StatsCard>

        <StatsCard
          title="Total Classes"
          value={
            data
              ? data.classes.toLocaleString()
              : '—'
          }
          icon={
            <School className="h-5 w-5 text-purple-600" />
          }
        >
          <ActionButtons
            onAdd={
              onAddClass
            }
            onView={
              onViewClasses
            }
          />
        </StatsCard>
      </div>

      <FinancialLedger
        data={
          data?.ledger ||
          []
        }
        statusStyles={{
          Verified:
            'bg-green-100 text-green-700',
          Pending:
            'bg-yellow-100 text-yellow-700',
          Overdue:
            'bg-red-100 text-red-700',
        }}
        onShowAll={() => {
          window.location.href =
            '/admin/dashboard?section=financial-audit'
        }}
      />

      {data &&
        data.ledger.length ===
          0 && (
          <p className="-mt-6 mb-8 rounded-lg bg-white px-4 py-6 text-center text-sm text-gray-500">
            No payment records exist in Appwrite.
          </p>
        )}

      <RbacMatrix
        data={
          data?.access ||
          []
        }
        onShowAll={() => {
          window.location.href =
            '/admin/dashboard?section=user-accounts'
        }}
        onEdit={() => {
          window.location.href =
            '/admin/dashboard?section=user-accounts'
        }}
      />

      {data &&
        data.access.length ===
          0 && (
          <p className="-mt-6 mb-8 rounded-lg bg-white px-4 py-6 text-center text-sm text-gray-500">
            No teacher access records exist in Appwrite.
          </p>
        )}
    </div>
  )
}

export function GlobalConfigLiveSidePanel() {
  const {
    data,
    loading,
    error,
  } =
    useLiveDashboardData()

  const notifications =
    data?.notifications ||
    []

  const pendingApplicants =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            notification.id.startsWith(
              'applicant-'
            )
        ).length,
      [notifications]
    )

  return (
    <div className="pt-2">
      <h3 className="mb-4 mt-8 text-sm font-bold text-white">
        Notifications & Alerts
      </h3>

      <div className="space-y-3">
        {notifications.map(
          (
            notification
          ) => {
            const Icon =
              notification.type ===
              'success'
                ? DollarSign
                : notification.type ===
                    'error'
                  ? AlertCircle
                  : notification.type ===
                      'warning'
                    ? Bell
                    : BookOpen

            return (
              <article
                key={
                  notification.id
                }
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">
                      {
                        notification.title
                      }
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-gray-300">
                      {
                        notification.description
                      }
                    </p>

                    <p className="mt-1 text-[9px] text-gray-500">
                      {
                        notification.time
                      }
                    </p>
                  </div>
                </div>
              </article>
            )
          }
        )}

        {loading &&
          notifications.length ===
            0 && (
            <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-400">
              Loading alerts...
            </p>
          )}

        {!loading &&
          notifications.length ===
            0 && (
            <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-400">
              {error
                ? 'Saved alerts are unavailable while offline.'
                : 'No current database alerts.'}
            </p>
          )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300">
            Pending applicant alerts
          </span>

          <strong className="text-white">
            {data
              ? pendingApplicants
              : '—'}
          </strong>
        </div>
      </div>
    </div>
  )
}
