'use client'

import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  GraduationCap,
  Home,
  Loader2,
  LogOut,
  Menu,
  School,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Query } from 'appwrite'

import { databases } from '@/lib/appwrite/config'
import {
  type UserRole,
  useAuth,
} from '@/contexts/auth-context'

type Document = {
  $id: string
  $createdAt?: string
  [key: string]: unknown
}

type Metric = {
  title: string
  value: string
  description: string
  Icon: LucideIcon
}

type DashboardData = {
  profile: Document | null
  school: Document | null
  metrics: Metric[]
  recent: Array<{
    id: string
    title: string
    description: string
  }>
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

function numberValue(
  document: Document | undefined,
  keys: string[]
): number {
  if (!document) return 0

  for (const key of keys) {
    const value = document[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return 0
}

async function safeList(
  collection: string,
  queries: string[] = [Query.limit(100)]
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

async function loadRoleDashboard(
  userId: string,
  role: 'teacher' | 'student'
): Promise<DashboardData> {
  const roleCollection =
    role === 'teacher'
      ? collectionId(
          'teachers',
          process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
        )
      : collectionId(
          'students',
          process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
        )

  const profiles = await safeList(roleCollection, [
    Query.equal('userId', userId),
    Query.limit(1),
  ])

  const profile = profiles[0] || null
  const schoolId = text(profile, ['schoolId'])

  const school = schoolId
    ? (
        await safeList(
          collectionId(
            'school',
            process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID
          ),
          [Query.equal('$id', schoolId), Query.limit(1)]
        )
      )[0] || null
    : null

  if (!profile) {
    return {
      profile: null,
      school,
      metrics: [],
      recent: [],
    }
  }

  if (role === 'teacher') {
    const [allocations, subjects, classes, timetable, attendance] =
      await Promise.all([
        safeList(
          collectionId(
            'teacher_subjects',
            process.env.NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID,
            process.env.NEXT_PUBLIC_APPWRITE_TEACHERSUBJECTS_COLLECTION_ID
          ),
          [Query.equal('teacherId', profile.$id), Query.limit(100)]
        ),
        safeList(
          collectionId(
            'subjects',
            process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID
          )
        ),
        safeList(
          collectionId(
            'classes',
            process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID
          )
        ),
        safeList(
          collectionId(
            'timetable',
            process.env.NEXT_PUBLIC_APPWRITE_TIMETABLE_COLLECTION_ID
          ),
          [Query.equal('teacherId', profile.$id), Query.limit(100)]
        ),
        safeList(
          collectionId(
            'attendance',
            process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID
          )
        ),
      ])

    const subjectsById = new Map(subjects.map((item) => [item.$id, item]))
    const classesById = new Map(classes.map((item) => [item.$id, item]))
    const assignedClassIds = new Set(
      allocations
        .map((item) => text(item, ['classId', 'ClassId']))
        .filter(Boolean)
    )
    const attendanceForClasses = attendance.filter((item) =>
      assignedClassIds.has(text(item, ['classId', 'ClassId']))
    )

    return {
      profile,
      school,
      metrics: [
        {
          title: 'Assigned Classes',
          value: String(assignedClassIds.size),
          description: 'Classes linked through teacher_subjects',
          Icon: Users,
        },
        {
          title: 'Assigned Subjects',
          value: String(
            new Set(
              allocations
                .map((item) => text(item, ['subjectId', 'SubjectId']))
                .filter(Boolean)
            ).size
          ),
          description: 'Current subject allocations',
          Icon: BookOpen,
        },
        {
          title: 'Timetable Slots',
          value: String(timetable.length),
          description: 'Scheduled teaching periods',
          Icon: CalendarDays,
        },
        {
          title: 'Attendance Records',
          value: String(attendanceForClasses.length),
          description: 'Records for assigned classes',
          Icon: ClipboardCheck,
        },
      ],
      recent: allocations.slice(0, 8).map((allocation) => {
        const subject = subjectsById.get(
          text(allocation, ['subjectId', 'SubjectId'])
        )
        const classDocument = classesById.get(
          text(allocation, ['classId', 'ClassId'])
        )

        return {
          id: allocation.$id,
          title: text(
            subject,
            ['SubjectName', 'Name'],
            'Unassigned subject'
          ),
          description: text(
            classDocument,
            ['LevelOrForm', 'Name', 'Room'],
            'Unassigned class'
          ),
        }
      }),
    }
  }

  const classId = text(profile, ['classId', 'ClassId'])

  const [
    studentSubjects,
    subjects,
    classDocuments,
    attendance,
    timetable,
    marks,
    fees,
  ] = await Promise.all([
    safeList(
      collectionId(
        'student_subjects',
        process.env.NEXT_PUBLIC_APPWRITE_STUDENT_SUBJECTS_COLLECTION_ID
      ),
      [Query.equal('studentId', profile.$id), Query.limit(100)]
    ),
    safeList(
      collectionId(
        'subjects',
        process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID
      )
    ),
    classId
      ? safeList(
          collectionId(
            'classes',
            process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID
          ),
          [Query.equal('$id', classId), Query.limit(1)]
        )
      : Promise.resolve([]),
    safeList(
      collectionId(
        'attendance',
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID
      ),
      [Query.equal('studentId', profile.$id), Query.limit(100)]
    ),
    classId
      ? safeList(
          collectionId(
            'timetable',
            process.env.NEXT_PUBLIC_APPWRITE_TIMETABLE_COLLECTION_ID
          ),
          [Query.equal('classId', classId), Query.limit(100)]
        )
      : Promise.resolve([]),
    safeList(
      collectionId(
        'marks',
        process.env.NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID
      ),
      [Query.equal('studentId', profile.$id), Query.limit(100)]
    ),
    safeList(
      collectionId(
        'fees',
        process.env.NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID
      ),
      [Query.equal('studentId', profile.$id), Query.limit(100)]
    ),
  ])

  const subjectsById = new Map(subjects.map((item) => [item.$id, item]))
  const scores = marks
    .map((mark) =>
      numberValue(mark, ['Percentage', 'Score', 'Mark', 'MarksObtained'])
    )
    .filter((score) => Number.isFinite(score) && score > 0)
  const average =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0

  return {
    profile,
    school,
    metrics: [
      {
        title: 'My Class',
        value: text(
          classDocuments[0],
          ['LevelOrForm', 'Name', 'Room'],
          'Not assigned'
        ),
        description: `${text(profile, ['Level'], '')} ${text(
          profile,
          ['Form'],
          ''
        )}`.trim(),
        Icon: School,
      },
      {
        title: 'Registered Subjects',
        value: String(studentSubjects.length),
        description: 'Subjects linked to your student profile',
        Icon: BookOpen,
      },
      {
        title: 'Attendance Records',
        value: String(attendance.length),
        description: 'Recorded attendance entries',
        Icon: ClipboardCheck,
      },
      {
        title: 'Average Mark',
        value: `${average.toFixed(1)}%`,
        description: `${marks.length} recorded mark entries`,
        Icon: Trophy,
      },
      {
        title: 'Timetable Slots',
        value: String(timetable.length),
        description: 'Periods assigned to your class',
        Icon: CalendarDays,
      },
      {
        title: 'Fee Records',
        value: String(fees.length),
        description: 'Billing records linked to your profile',
        Icon: DollarSign,
      },
    ],
    recent: studentSubjects.slice(0, 8).map((entry) => {
      const subject = subjectsById.get(text(entry, ['subjectId', 'SubjectId']))

      return {
        id: entry.$id,
        title: text(subject, ['SubjectName', 'Name'], 'Unknown subject'),
        description: text(subject, ['SubjectCode', 'Code'], 'No subject code'),
      }
    }),
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function RoleDashboardShell({
  role,
}: {
  role: Extract<UserRole, 'teacher' | 'student'>
}) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState<DashboardData>({
    profile: null,
    school: null,
    metrics: [],
    recent: [],
  })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      setData(await loadRoleDashboard(user.$id, role))
    } finally {
      setLoading(false)
    }
  }, [role, user])

  useEffect(() => {
    void reload()
  }, [reload])

  const fullName = user
    ? `${user.FirstName} ${user.LastName}`.trim()
    : ''

  const avatarInitials = user
    ? initials(user.FirstName, user.LastName)
    : ''

  const roleTitle = role === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'
  const RoleIcon = role === 'teacher' ? GraduationCap : School

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#232A42] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <img src="/Logo.png" alt="StarLight Logo" className="h-10 w-auto" />

            <div className="hidden sm:block">
              <h1 className="text-sm font-bold">StarLight Management Suite</h1>
              <p className="text-xs text-gray-400">
                {text(data.school, ['Name'], `${role} portal`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-300" />

            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#C75712] text-sm font-bold">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarInitials
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs capitalize text-gray-400">{role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout('/')}
              className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`fixed left-0 top-[65px] z-30 h-[calc(100vh-65px)] w-64 bg-[#232A42] px-4 py-6 text-white transition-transform lg:sticky lg:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg bg-[#C75712] px-3 py-3">
              <Home className="h-5 w-5" />
              Dashboard
            </div>

            {data.recent.slice(0, 6).map((record) => (
              <div
                key={record.id}
                className="rounded-lg px-3 py-3 text-xs text-gray-300 hover:bg-white/10"
              >
                <p className="font-semibold text-white">{record.title}</p>
                <p className="mt-1 truncate text-gray-400">
                  {record.description}
                </p>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <section className="relative overflow-hidden rounded-2xl bg-[#232A42] p-6 text-white shadow-lg sm:p-8">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                <RoleIcon className="h-4 w-4" />
                {text(data.profile, ['Status'], 'Profile status unavailable')}
              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                {roleTitle}
              </h2>

              <p className="mt-2 text-gray-300">
                Welcome, {user?.FirstName}. All figures below are loaded from
                Appwrite.
              </p>
            </div>
          </section>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading live profile records...
            </div>
          ) : (
            <>
              <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.metrics.map(({ title, value, description, Icon }) => (
                  <article
                    key={title}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#232A42] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
                    <p className="mt-2 text-2xl font-bold text-[#C75712]">
                      {value}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">{description}</p>
                  </article>
                ))}
              </section>

              <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900">Recent linked records</h3>

                <div className="mt-4 divide-y divide-gray-100">
                  {data.recent.map((record) => (
                    <div key={record.id} className="py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {record.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.description}
                      </p>
                    </div>
                  ))}

                  {data.recent.length === 0 && (
                    <p className="py-6 text-sm text-gray-500">
                      No linked records exist in Appwrite for this profile.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
