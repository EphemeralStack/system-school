'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileDown,
  Filter,
  KeyRound,
  Lock,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Query,
  type Models,
} from 'appwrite'

import { databases } from '@/lib/appwrite/config'
import { usePersistentSectionData } from '@/lib/client/use-persistent-section-data'

type UserRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'applicant'

type AccountState =
  | 'active'
  | 'pending'
  | 'locked'

interface UserAccountRow {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  roleLabel: string
  status: string
  accountState: AccountState
  avatar: string
  createdAt: string
  updatedAt: string
  roleProfileId: string
}

interface UserAccountsData {
  users: UserAccountRow[]
  roleCounts: Record<UserRole, number>
  activeCount: number
  pendingCount: number
  lockedCount: number
  recentActivity: Array<{
    id: string
    title: string
    description: string
    tone:
      | 'blue'
      | 'green'
      | 'orange'
      | 'red'
  }>
}

interface AddUserCallbacks {
  onAddStudent?: () => void
  onAddTeacher?: () => void
  onAddApplicant?: () => void
}

interface AppwriteDocument
  extends Models.Document {
  [key: string]: unknown
}

const USER_ACCOUNTS_EVENTS = {
  add: 'user-accounts:add',
  role: 'user-accounts:role',
  lock: 'user-accounts:lock',
  export: 'user-accounts:export',
  refresh: 'user-accounts:refresh',
} as const

const ROLE_LABELS: Record<
  UserRole,
  string
> = {
  admin: 'Admins',
  teacher: 'Faculty',
  student: 'Students',
  applicant: 'Applicants',
}

const ROLE_COLORS: Record<
  UserRole,
  string
> = {
  admin: '#1658b5',
  teacher: '#25a85a',
  student: '#f5b516',
  applicant: '#ef4444',
}

const LOCKED_STATUSES = new Set([
  'inactive',
  'suspended',
  'withdrawn',
  'resigned',
  'retired',
  'on_leave',
  'rejected',
])

const PENDING_STATUSES = new Set([
  'pending',
  'trial',
])

function requiredEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const result = value?.trim()

  if (!result) {
    throw new Error(
      `Missing environment variable: ${name}`
    )
  }

  return result
}

function collectionId(
  fallback: string,
  ...values: Array<string | undefined>
): string {
  return (
    values.find(
      (value) => value?.trim()
    )?.trim() || fallback
  )
}

function normalizeRole(
  value: unknown
): UserRole {
  if (typeof value !== 'string') {
    return 'applicant'
  }

  const normalized =
    value.trim().toLowerCase()

  if (
    normalized === 'admin' ||
    normalized === 'teacher' ||
    normalized === 'student' ||
    normalized === 'applicant'
  ) {
    return normalized
  }

  return 'applicant'
}

function text(
  document: AppwriteDocument | undefined,
  keys: string[],
  fallback = ''
): string {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value = document[key]

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim()
    }
  }

  return fallback
}

function accountState(
  status: string
): AccountState {
  const normalized =
    status.trim().toLowerCase()

  if (LOCKED_STATUSES.has(normalized)) {
    return 'locked'
  }

  if (PENDING_STATUSES.has(normalized)) {
    return 'pending'
  }

  return 'active'
}

function lockStatusForRole(
  role: UserRole
): string {
  switch (role) {
    case 'admin':
      return 'inactive'

    case 'teacher':
      return 'on_leave'

    case 'student':
      return 'suspended'

    case 'applicant':
    default:
      return 'rejected'
  }
}

function activeStatusForRole(
  role: UserRole
): string {
  return role === 'applicant'
    ? 'accepted'
    : 'active'
}

function initials(
  firstName: string,
  lastName: string
): string {
  return `${firstName.charAt(
    0
  )}${lastName.charAt(0)}`
    .trim()
    .toUpperCase()
}

function timeAgo(
  value: string
): string {
  if (!value) {
    return 'Recently'
  }

  const timestamp =
    new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return 'Recently'
  }

  const difference =
    Date.now() - timestamp

  const minutes = Math.floor(
    difference / 60000
  )

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return `${minutes} min${
      minutes === 1 ? '' : 's'
    } ago`
  }

  const hours = Math.floor(
    minutes / 60
  )

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? '' : 's'
    } ago`
  }

  const days = Math.floor(
    hours / 24
  )

  return `${days} day${
    days === 1 ? '' : 's'
  } ago`
}

async function listCollectionStrict(
  id: string
): Promise<AppwriteDocument[]> {
  const response =
    await databases.listDocuments({
      databaseId:
        requiredEnvironmentVariable(
          'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
          process.env
            .NEXT_PUBLIC_APPWRITE_DATABASE_ID
        ),
      collectionId: id,
      queries: [
        Query.orderDesc('$updatedAt'),
        Query.limit(100),
      ],
    })

  return response
    .documents as AppwriteDocument[]
}

async function loadUserAccountsData(
  schoolId?: string
): Promise<UserAccountsData> {
  const [
    userDocuments,
    adminDocuments,
    teacherDocuments,
    studentDocuments,
    applicantDocuments,
  ] = await Promise.all([
    listCollectionStrict(
      collectionId(
        'users',
        process.env
          .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'admins',
        process.env
          .NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'teachers',
        process.env
          .NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'students',
        process.env
          .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'applicants',
        process.env
          .NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
      )
    ),
  ])

  const roleCollections: Record<
    UserRole,
    AppwriteDocument[]
  > = {
    admin: adminDocuments,
    teacher: teacherDocuments,
    student: studentDocuments,
    applicant: applicantDocuments,
  }

  const profileMaps =
    Object.fromEntries(
      Object.entries(
        roleCollections
      ).map(([role, documents]) => {
        const profileMap = new Map<
          string,
          AppwriteDocument
        >()

        documents.forEach(
          (document) => {
            const userId =
              text(
                document,
                ['userId'],
                document.$id
              )

            if (userId) {
              profileMap.set(
                userId,
                document
              )
            }
          }
        )

        return [role, profileMap]
      })
    ) as Record<
      UserRole,
      Map<string, AppwriteDocument>
    >

  const users = userDocuments
    .map(
      (
        userDocument
      ): UserAccountRow | null => {
        const role = normalizeRole(
          userDocument.Role
        )

        const roleProfile =
          profileMaps[role].get(
            userDocument.$id
          )

        const profileSchoolId =
          text(
            roleProfile,
            ['schoolId']
          )

        if (
          schoolId &&
          profileSchoolId &&
          profileSchoolId !== schoolId
        ) {
          return null
        }

        const firstName =
          text(
            userDocument,
            ['FirstName'],
            'Unknown'
          )

        const lastName =
          text(
            userDocument,
            ['LastName']
          )

        const status =
          text(
            roleProfile,
            ['Status'],
            role === 'applicant'
              ? 'pending'
              : 'active'
          )

        return {
          id: userDocument.$id,
          firstName,
          lastName,
          fullName:
            `${firstName} ${lastName}`.trim(),
          email:
            text(
              userDocument,
              ['Email'],
              'No email'
            ),
          phone:
            text(
              userDocument,
              ['Phone'],
              'No phone'
            ),
          role,
          roleLabel:
            ROLE_LABELS[role],
          status,
          accountState:
            accountState(status),
          avatar:
            text(
              userDocument,
              ['avatar']
            ),
          createdAt:
            userDocument.$createdAt,
          updatedAt:
            userDocument.$updatedAt,
          roleProfileId:
            roleProfile?.$id || '',
        }
      }
    )
    .filter(
      (
        user
      ): user is UserAccountRow =>
        user !== null
    )

  const roleCounts: Record<
    UserRole,
    number
  > = {
    admin: 0,
    teacher: 0,
    student: 0,
    applicant: 0,
  }

  users.forEach((user) => {
    roleCounts[user.role] += 1
  })

  const activityUsers = [...users]
    .sort(
      (left, right) =>
        new Date(
          right.updatedAt
        ).getTime() -
        new Date(
          left.updatedAt
        ).getTime()
    )
    .slice(0, 5)

  const recentActivity =
    activityUsers.map(
      (user, index) => {
        const isLocked =
          user.accountState ===
          'locked'

        const isPending =
          user.accountState ===
          'pending'

        return {
          id: `${user.id}-${index}`,
          title: isLocked
            ? 'Account access restricted'
            : isPending
              ? 'Pending account reviewed'
              : 'User record updated',
          description: `${
            user.fullName
          } Â· ${user.roleLabel} Â· ${timeAgo(
            user.updatedAt
          )}`,
          tone: isLocked
            ? ('red' as const)
            : isPending
              ? ('orange' as const)
              : ('blue' as const),
        }
      }
    )

  return {
    users,
    roleCounts,
    activeCount:
      users.filter(
        (user) =>
          user.accountState ===
          'active'
      ).length,
    pendingCount:
      users.filter(
        (user) =>
          user.accountState ===
          'pending'
      ).length,
    lockedCount:
      users.filter(
        (user) =>
          user.accountState ===
          'locked'
      ).length,
    recentActivity,
  }
}

function SecurityLine({
  values,
  stroke,
}: {
  values: number[]
  stroke: string
}) {
  const width = 180
  const height = 52
  const padding = 5
  const max = Math.max(
    1,
    ...values
  )

  const points = values
    .map((value, index) => {
      const x =
        padding +
        (index /
          Math.max(
            1,
            values.length - 1
          )) *
          (width - padding * 2)

      const y =
        height -
        padding -
        (value / max) *
          (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full"
      aria-hidden="true"
    >
      <line
        x1="0"
        x2={width}
        y1={height - 5}
        y2={height - 5}
        stroke="#e5e7eb"
        strokeWidth="1"
      />

      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SecurityCard({
  title,
  description,
  Icon,
  tone,
  values,
}: {
  title: string
  description: string
  Icon: typeof ShieldAlert
  tone: 'blue' | 'red'
  values: number[]
}) {
  const colors =
    tone === 'red'
      ? {
          icon:
            'bg-red-600 text-white',
          text: 'text-red-600',
          stroke: '#ef233c',
        }
      : {
          icon:
            'bg-blue-500 text-white',
          text: 'text-[#20283f]',
          stroke: '#2563eb',
        }

  return (
    <article className="min-w-0 border-r border-gray-200 p-3 last:border-r-0">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.icon}`}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <h3
            className={`truncate text-[10px] font-bold ${colors.text}`}
          >
            {title}
          </h3>

          <p className="truncate text-[7px] text-gray-400">
            {description}
          </p>
        </div>
      </div>

      <SecurityLine
        values={values}
        stroke={colors.stroke}
      />
    </article>
  )
}

function RoleDistributionChart({
  counts,
}: {
  counts: Record<UserRole, number>
}) {
  const roles: UserRole[] = [
    'admin',
    'teacher',
    'student',
    'applicant',
  ]

  const total =
    roles.reduce(
      (sum, role) =>
        sum + counts[role],
      0
    ) || 1

  let cursor = 0

  const gradient = roles
    .map((role) => {
      const start = cursor
      const size =
        (counts[role] / total) *
        100

      cursor += size

      return `${ROLE_COLORS[role]} ${start}% ${cursor}%`
    })
    .join(', ')

  return (
    <div className="grid gap-5 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
      <div
        className="mx-auto flex h-28 w-28 items-center justify-center rounded-full p-7"
        style={{
          background:
            counts.admin +
              counts.teacher +
              counts.student +
              counts.applicant >
            0
              ? `conic-gradient(${gradient})`
              : 'conic-gradient(#d1d5db 0 100%)',
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
          <span className="text-sm font-bold text-[#20283f]">
            {total === 1 &&
            Object.values(
              counts
            ).every(
              (value) => value === 0
            )
              ? 0
              : total}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role}
            className="flex items-center justify-between gap-3 text-[9px]"
          >
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-3 w-3 rounded-sm"
                style={{
                  backgroundColor:
                    ROLE_COLORS[role],
                }}
              />

              {ROLE_LABELS[role]}
            </span>

            <strong className="text-gray-900">
              {counts[role]}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function downloadUsers(
  users: UserAccountRow[]
): void {
  const escapeValue = (
    value: string | number
  ) => {
    const content = String(value)

    return /[",\n]/.test(content)
      ? `"${content.replace(
          /"/g,
          '""'
        )}"`
      : content
  }

  const csv = [
    [
      'Name',
      'Email',
      'Phone',
      'Role',
      'Status',
      'Account State',
      'Created',
      'Updated',
    ],
    ...users.map((user) => [
      user.fullName,
      user.email,
      user.phone,
      user.role,
      user.status,
      user.accountState,
      user.createdAt,
      user.updatedAt,
    ]),
  ]
    .map((row) =>
      row.map(escapeValue).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url =
    URL.createObjectURL(blob)

  const anchor =
    document.createElement('a')

  anchor.href = url
  anchor.download =
    'school-user-accounts.csv'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function ActionButton({
  label,
  Icon,
  onClick,
  danger = false,
}: {
  label: string
  Icon: typeof Plus
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-[9px] font-semibold text-white transition-colors ${
        danger
          ? 'bg-red-600 hover:bg-red-500'
          : 'bg-[#07376d] hover:bg-[#0b4789]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export default function UserAccountsDesk({
  schoolId,
  onAddStudent,
  onAddTeacher,
  onAddApplicant,
}: {
  schoolId?: string
} & AddUserCallbacks) {
  const {
    data,
    loading: initialLoading,
    refreshing,
    error,
    refresh,
  } = usePersistentSectionData<UserAccountsData>({
    cacheKey: 'admin-user-accounts',
    version: 1,
    scope:
      schoolId ||
      'single-school',
    loader: () =>
      loadUserAccountsData(
        schoolId
      ),
  })

  const loading =
    initialLoading ||
    refreshing

  const [query, setQuery] =
    useState('')

  const [roleFilter, setRoleFilter] =
    useState<'all' | UserRole>(
      'all'
    )

  const [showAddMenu, setShowAddMenu] =
    useState(false)

  const [
    showRoleEditor,
    setShowRoleEditor,
  ] = useState(false)

  const [
    showLockEditor,
    setShowLockEditor,
  ] = useState(false)

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState('')

  const [newRole, setNewRole] =
    useState<UserRole>('student')

  const [actionError, setActionError] =
    useState('')

  const reload =
    useCallback(
      async () => {
        await refresh(true)
      },
      [refresh]
    )


  const filteredUsers = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery =
      query.trim().toLowerCase()

    return data.users.filter((user) => {
      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter

      const matchesQuery =
        !normalizedQuery ||
        [
          user.fullName,
          user.email,
          user.roleLabel,
          user.status,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(normalizedQuery)
        )

      return (
        matchesRole &&
        matchesQuery
      )
    })
  }, [data, query, roleFilter])

  const selectedUser =
    data?.users.find(
      (user) =>
        user.id === selectedUserId
    ) ?? null

  const dispatch = (
    eventName: string
  ) => {
    window.dispatchEvent(
      new CustomEvent(eventName)
    )
  }

  useEffect(() => {
    const openAdd = () =>
      setShowAddMenu(true)

    const openRole = () =>
      setShowRoleEditor(true)

    const openLock = () =>
      setShowLockEditor(true)

    const exportCurrent = () => {
      if (data) {
        downloadUsers(
          filteredUsers
        )
      }
    }

    const refreshCurrent = () => {
      void reload()
    }

    window.addEventListener(
      USER_ACCOUNTS_EVENTS.add,
      openAdd
    )

    window.addEventListener(
      USER_ACCOUNTS_EVENTS.role,
      openRole
    )

    window.addEventListener(
      USER_ACCOUNTS_EVENTS.lock,
      openLock
    )

    window.addEventListener(
      USER_ACCOUNTS_EVENTS.export,
      exportCurrent
    )

    window.addEventListener(
      USER_ACCOUNTS_EVENTS.refresh,
      refreshCurrent
    )

    return () => {
      window.removeEventListener(
        USER_ACCOUNTS_EVENTS.add,
        openAdd
      )

      window.removeEventListener(
        USER_ACCOUNTS_EVENTS.role,
        openRole
      )

      window.removeEventListener(
        USER_ACCOUNTS_EVENTS.lock,
        openLock
      )

      window.removeEventListener(
        USER_ACCOUNTS_EVENTS.export,
        exportCurrent
      )

      window.removeEventListener(
        USER_ACCOUNTS_EVENTS.refresh,
        refreshCurrent
      )
    }
  }, [
    data,
    filteredUsers,
    reload,
  ])

  const updateRole = async () => {
    setActionError('')

    if (!selectedUser || !data) {
      setActionError(
        'Select a user first.'
      )
      return
    }

    if (
      selectedUser.role === newRole
    ) {
      setActionError(
        'This user already has that role.'
      )
      return
    }

    const targetRoleExists =
      data.users.some(
        (user) =>
          user.id ===
            selectedUser.id &&
          user.role === newRole &&
          Boolean(
            user.roleProfileId
          )
      )

    if (!targetRoleExists) {
      setActionError(
        'The target role profile does not exist. Create the role profile before changing this account role.'
      )
      return
    }

    try {
      await databases.updateDocument({
        databaseId:
          requiredEnvironmentVariable(
            'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
            process.env
              .NEXT_PUBLIC_APPWRITE_DATABASE_ID
          ),
        collectionId:
          collectionId(
            'users',
            process.env
              .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
          ),
        documentId:
          selectedUser.id,
        data: {
          Role: newRole,
        },
      })

      setShowRoleEditor(false)
      setSelectedUserId('')
      await reload()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Unable to update the role.'
      )
    }
  }

  const toggleLock = async () => {
    setActionError('')

    if (!selectedUser) {
      setActionError(
        'Select a user first.'
      )
      return
    }

    if (!selectedUser.roleProfileId) {
      setActionError(
        'This user does not have a matching role profile.'
      )
      return
    }

    const roleCollection =
      collectionId(
        selectedUser.role === 'admin'
          ? 'admins'
          : selectedUser.role ===
              'teacher'
            ? 'teachers'
            : selectedUser.role ===
                'student'
              ? 'students'
              : 'applicants',
        selectedUser.role === 'admin'
          ? process.env
              .NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID
          : selectedUser.role ===
              'teacher'
            ? process.env
                .NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
            : selectedUser.role ===
                'student'
              ? process.env
                  .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
              : process.env
                  .NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
      )

    const nextStatus =
      selectedUser.accountState ===
      'locked'
        ? activeStatusForRole(
            selectedUser.role
          )
        : lockStatusForRole(
            selectedUser.role
          )

    try {
      await databases.updateDocument({
        databaseId:
          requiredEnvironmentVariable(
            'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
            process.env
              .NEXT_PUBLIC_APPWRITE_DATABASE_ID
          ),
        collectionId:
          roleCollection,
        documentId:
          selectedUser.roleProfileId,
        data: {
          Status: nextStatus,
        },
      })

      setShowLockEditor(false)
      setSelectedUserId('')
      await reload()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Unable to update account access.'
      )
    }
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
        {error
          ? 'No saved user-account data is available. Check the connection and refresh.'
          : 'Loading user accounts...'}
      </div>
    )
  }

  const lockedRatio =
    data.users.length > 0
      ? (data.lockedCount /
          data.users.length) *
        100
      : 0

  const riskLabel =
    lockedRatio >= 20
      ? 'Risk: High'
      : lockedRatio >= 8
        ? 'Risk: Medium'
        : 'Risk: Low'

  return (
    <div className="space-y-10 pb-10">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing saved user-account data because the latest refresh failed.
        </div>
      )}
      {loading && !data && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading user accounts...
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold text-[#20283f] sm:text-xl">
          User Accounts
        </h2>

        <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
          <div className="grid md:grid-cols-3">
            <SecurityCard
              title="Failed Login Events"
              description="Auth audit source not connected"
              Icon={ShieldAlert}
              tone="red"
              values={[
                0,
                0,
                0,
                0,
                0,
                0,
              ]}
            />

            <SecurityCard
              title="Restricted Accounts"
              description={`${data?.lockedCount ?? 0} account access restrictions`}
              Icon={LockKeyhole}
              tone="blue"
              values={[
                0,
                1,
                0,
                data?.lockedCount ?? 0,
                1,
                data?.lockedCount ?? 0,
              ]}
            />

            <SecurityCard
              title={riskLabel}
              description="Based on current account statuses"
              Icon={AlertTriangle}
              tone={
                riskLabel ===
                'Risk: Low'
                  ? 'blue'
                  : 'red'
              }
              values={[
                1,
                2,
                1,
                3,
                Math.max(
                  1,
                  data?.lockedCount ?? 0
                ),
                Math.max(
                  1,
                  Math.round(
                    lockedRatio
                  )
                ),
              ]}
            />
          </div>

          <div className="grid border-t border-gray-200 lg:grid-cols-[minmax(0,1.5fr)_190px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold text-[#20283f]">
                  Registration
                </h3>

                <div className="flex gap-2">
                  <label className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />

                    <input
                      value={query}
                      onChange={(event) =>
                        setQuery(
                          event.target.value
                        )
                      }
                      placeholder="Search users"
                      className="h-8 w-full rounded-md border border-gray-300 pl-8 pr-2 text-[10px] outline-none focus:border-[#0867ce]"
                    />
                  </label>

                  <label className="relative">
                    <select
                      value={roleFilter}
                      onChange={(event) =>
                        setRoleFilter(
                          event.target
                            .value as
                            | 'all'
                            | UserRole
                        )
                      }
                      className="h-8 appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-8 text-[10px] outline-none focus:border-[#0867ce]"
                    >
                      <option value="all">
                        All roles
                      </option>
                      <option value="admin">
                        Admins
                      </option>
                      <option value="teacher">
                        Faculty
                      </option>
                      <option value="student">
                        Students
                      </option>
                      <option value="applicant">
                        Applicants
                      </option>
                    </select>

                    <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                  </label>
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead className="bg-gray-50 text-[8px] text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">
                        User
                      </th>
                      <th className="px-4 py-2.5">
                        Role
                      </th>
                      <th className="px-4 py-2.5">
                        Status
                      </th>
                      <th className="px-4 py-2.5">
                        Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers
                      .slice(0, 7)
                      .map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-gray-100 text-[9px]"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f5d93] text-[8px] font-bold text-white">
                                {user.avatar ? (
                                  <img
                                    src={
                                      user.avatar
                                    }
                                    alt={
                                      user.fullName
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  initials(
                                    user.firstName,
                                    user.lastName
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">
                                  {
                                    user.fullName
                                  }
                                </p>

                                <p className="truncate text-[7px] text-gray-400">
                                  {
                                    user.email
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 text-gray-600">
                            {
                              user.roleLabel
                            }
                          </td>

                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex rounded-md px-2 py-1 text-[7px] font-bold ${
                                user.accountState ===
                                'active'
                                  ? 'bg-green-100 text-green-700'
                                  : user.accountState ===
                                      'pending'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {
                                user.status
                              }
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-gray-400">
                            {timeAgo(
                              user.updatedAt
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 md:hidden">
                {filteredUsers
                  .slice(0, 7)
                  .map((user) => (
                    <article
                      key={user.id}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f5d93] text-xs font-bold text-white">
                          {user.avatar ? (
                            <img
                              src={
                                user.avatar
                              }
                              alt={
                                user.fullName
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials(
                              user.firstName,
                              user.lastName
                            )
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {
                              user.fullName
                            }
                          </p>

                          <p className="truncate text-[10px] text-gray-500">
                            {user.email}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-[9px] text-gray-500">
                              {
                                user.roleLabel
                              }
                            </span>

                            <span
                              className={`rounded-md px-2 py-1 text-[8px] font-bold ${
                                user.accountState ===
                                'active'
                                  ? 'bg-green-100 text-green-700'
                                  : user.accountState ===
                                      'pending'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {
                                user.status
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>

              {filteredUsers.length ===
                0 && (
                <div className="py-10 text-center text-sm text-gray-500">
                  No users match the current filters.
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                <ActionButton
                  label="Export Data"
                  Icon={Download}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.export
                    )
                  }
                />

                <ActionButton
                  label="Edit Role"
                  Icon={Edit3}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.role
                    )
                  }
                />

                <ActionButton
                  label="Lock / Unlock"
                  Icon={Lock}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.lock
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-[#20283f] sm:text-xl">
          User Accounts
        </h2>

        <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="flex items-center gap-2 bg-[#2f9634] px-4 py-3 text-white">
              <UserCheck className="h-4 w-4" />

              <span className="text-sm font-bold">
                {data?.activeCount ?? 0}
              </span>

              <span className="text-[9px]">
                Active Users
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#ff8517] px-4 py-3 text-white">
              <Clock3 className="h-4 w-4" />

              <span className="text-sm font-bold">
                {data?.pendingCount ??
                  0}
              </span>

              <span className="text-[9px]">
                Pending Approvals
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#ed1717] px-4 py-3 text-white">
              <Lock className="h-4 w-4" />

              <span className="text-sm font-bold">
                {data?.lockedCount ??
                  0}
              </span>

              <span className="text-[9px]">
                Locked Accounts
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.45fr)_190px]">
            <div className="p-5">
              <h3 className="mb-4 text-xs font-bold text-gray-800">
                Role Distribution
              </h3>

              <RoleDistributionChart
                counts={
                  data?.roleCounts ?? {
                    admin: 0,
                    teacher: 0,
                    student: 0,
                    applicant: 0,
                  }
                }
              />

              <div className="mt-5 border-t border-gray-200 pt-4">
                <h3 className="text-[10px] font-bold text-gray-800">
                  Recent Activity
                </h3>

                <div className="mt-3 space-y-2">
                  {(data?.recentActivity ??
                    []).map(
                    (activity) => (
                      <div
                        key={
                          activity.id
                        }
                        className="flex items-start gap-2"
                      >
                        <span
                          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                            activity.tone ===
                            'red'
                              ? 'bg-red-500'
                              : activity.tone ===
                                  'orange'
                                ? 'bg-orange-500'
                                : activity.tone ===
                                    'green'
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                          }`}
                        />

                        <div>
                          <p className="text-[8px] font-semibold text-gray-800">
                            {
                              activity.title
                            }
                          </p>

                          <p className="text-[7px] text-gray-500">
                            {
                              activity.description
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {(data?.recentActivity
                    .length ??
                    0) === 0 && (
                    <p className="text-[9px] text-gray-400">
                      No recent user activity is available.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                <ActionButton
                  label="Add User"
                  Icon={Plus}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.add
                    )
                  }
                />

                <ActionButton
                  label="Edit Role"
                  Icon={Edit3}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.role
                    )
                  }
                />

                <ActionButton
                  label="Lock / Unlock"
                  Icon={Lock}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.lock
                    )
                  }
                />

                <ActionButton
                  label="Export Users"
                  Icon={FileDown}
                  onClick={() =>
                    dispatch(
                      USER_ACCOUNTS_EVENTS.export
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {showAddMenu && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-[#20283f]">
                  Add User
                </h3>

                <p className="text-xs text-gray-500">
                  Choose the account type.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddMenu(
                    false
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {[
                {
                  label: 'Student',
                  action:
                    onAddStudent,
                },
                {
                  label: 'Teacher',
                  action:
                    onAddTeacher,
                },
                {
                  label: 'Applicant',
                  action:
                    onAddApplicant,
                },
              ].map(
                ({
                  label,
                  action,
                }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setShowAddMenu(
                        false
                      )
                      action?.()
                    }}
                    disabled={!action}
                    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 text-[#20283f] hover:border-[#0867ce] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlus className="h-6 w-6" />
                    <span className="text-xs font-semibold">
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {(showRoleEditor ||
        showLockEditor) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-[#20283f]">
                  {showRoleEditor
                    ? 'Edit User Role'
                    : 'Lock / Unlock Account'}
                </h3>

                <p className="text-xs text-gray-500">
                  Select an existing account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRoleEditor(
                    false
                  )
                  setShowLockEditor(
                    false
                  )
                  setActionError('')
                  setSelectedUserId('')
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  User
                </span>

                <select
                  value={
                    selectedUserId
                  }
                  onChange={(event) => {
                    setSelectedUserId(
                      event.target.value
                    )

                    const nextUser =
                      data?.users.find(
                        (user) =>
                          user.id ===
                          event.target
                            .value
                      )

                    if (nextUser) {
                      setNewRole(
                        nextUser.role
                      )
                    }
                  }}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#0867ce]"
                >
                  <option value="">
                    Select user
                  </option>

                  {(data?.users ??
                    []).map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.fullName} â€”{' '}
                      {user.roleLabel}
                    </option>
                  ))}
                </select>
              </label>

              {showRoleEditor && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    New role
                  </span>

                  <select
                    value={newRole}
                    onChange={(event) =>
                      setNewRole(
                        event.target
                          .value as UserRole
                      )
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#0867ce]"
                  >
                    <option value="admin">
                      Admin
                    </option>
                    <option value="teacher">
                      Teacher
                    </option>
                    <option value="student">
                      Student
                    </option>
                    <option value="applicant">
                      Applicant
                    </option>
                  </select>

                  <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
                    A matching target-role profile must already exist. This prevents broken account-role links.
                  </p>
                </label>
              )}

              {showLockEditor &&
                selectedUser && (
                  <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    Current state:{' '}
                    <strong className="capitalize text-gray-900">
                      {
                        selectedUser.accountState
                      }
                    </strong>
                  </div>
                )}

              <button
                type="button"
                onClick={() => {
                  if (
                    showRoleEditor
                  ) {
                    void updateRole()
                  } else {
                    void toggleLock()
                  }
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0867ce] text-sm font-semibold text-white hover:bg-[#075ab5]"
              >
                {showRoleEditor ? (
                  <Edit3 className="h-4 w-4" />
                ) : selectedUser?.accountState ===
                  'locked' ? (
                  <Unlock className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}

                {showRoleEditor
                  ? 'Update Role'
                  : selectedUser?.accountState ===
                      'locked'
                    ? 'Unlock Account'
                    : 'Lock Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function UserAccountsSidePanel() {
  const {
    data,
    loading,
    error,
  } = usePersistentSectionData<UserAccountsData>({
    cacheKey: 'admin-user-accounts',
    version: 1,
    loader: () =>
      loadUserAccountsData(),
  })

  if (!data) {
    return (
      <div className="pt-10 text-xs text-gray-400">
        {error
          ? 'Saved account alerts are unavailable.'
          : loading
            ? 'Loading account alerts...'
            : 'No account alerts are available.'}
      </div>
    )
  }

  const dispatch = (
    eventName: string
  ) => {
    window.dispatchEvent(
      new CustomEvent(eventName)
    )
  }

  const accountAlerts = [
    {
      title:
        'Pending approvals',
      description:
        `${data?.pendingCount ?? 0} account${
          data?.pendingCount === 1
            ? ''
            : 's'
        } currently require approval.`,
      Icon: Clock3,
    },
    {
      title:
        'Restricted accounts',
      description:
        `${data?.lockedCount ?? 0} account${
          data?.lockedCount === 1
            ? ''
            : 's'
        } currently have restricted access.`,
      Icon: LockKeyhole,
    },
    {
      title:
        'Active accounts',
      description:
        `${data?.activeCount ?? 0} account${
          data?.activeCount === 1
            ? ''
            : 's'
        } are currently active.`,
      Icon: UserCheck,
    },
  ]

  return (
    <div className="pt-2">
      <h3 className="mb-4 mt-8 text-sm font-bold text-white">
        Account Alerts
      </h3>

      <div className="space-y-4 border-t border-white/10 pt-4">
        {accountAlerts.map(
          ({
            title,
            description,
            Icon,
          }) => (
            <article
              key={title}
              className="flex gap-2.5"
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />

              <div>
                <p className="text-[10px] font-semibold text-white">
                  {title}
                </p>

                <p className="mt-1 text-[8px] leading-relaxed text-gray-400">
                  {description}
                </p>
              </div>
            </article>
          )
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-bold text-white">
          Quick Actions
        </h3>

        <div className="mt-4 space-y-4">
          <ActionButton
            label="Add User"
            Icon={Plus}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.add
              )
            }
          />

          <ActionButton
            label="Edit Role"
            Icon={Edit3}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.role
              )
            }
          />

          <ActionButton
            label="Lock / Unlock"
            Icon={Lock}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.lock
              )
            }
          />

          <ActionButton
            label="Export Users"
            Icon={Download}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.export
              )
            }
          />

          <ActionButton
            label="Refresh Accounts"
            Icon={RefreshCw}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.refresh
              )
            }
          />
        </div>
      </div>
    </div>
  )
}
