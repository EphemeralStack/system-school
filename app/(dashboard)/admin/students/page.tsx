'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  Query,
} from 'appwrite'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react'
import {
  useRouter,
} from 'next/navigation'

import {
  AddStudentModal,
} from '@/components/dashboard/AddStudentModal'
import {
  databases,
} from '@/lib/appwrite/config'
import {
  removeStudentAsAdmin,
  updateStudentAsAdmin,
  type StudentStatus,
} from '@/lib/admin/manage-student'
import {
  ZIMBABWE_PRIMARY_GRADES,
  ZIMBABWE_PRIMARY_STAGES,
  primaryStageForGrade,
} from '@/lib/school/primary-school-options'

interface StudentDocument {
  $id: string
  $createdAt: string
  $updatedAt?: string
  userId?: string
  classId?: string
  Level?: string
  Form?: string
  EnrollmentDate?: string
  Status?: string
}

interface UserDocument {
  $id: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  avatar?: string
}

interface EditStudentForm {
  level: string
  form: string
  enrollmentDate: string
  status: StudentStatus
}

const ITEMS_PER_PAGE = 10

const LEVEL_OPTIONS = [
  ...ZIMBABWE_PRIMARY_STAGES,
]

const FORM_OPTIONS = [
  ...ZIMBABWE_PRIMARY_GRADES,
]

const STATUS_OPTIONS: Array<{
  value: StudentStatus
  label: string
}> = [
  {
    value: 'active',
    label: 'Active',
  },
  {
    value: 'inactive',
    label: 'Inactive',
  },
  {
    value: 'suspended',
    label: 'Suspended',
  },
  {
    value: 'graduated',
    label: 'Graduated',
  },
]

function normalizedStatus(
  value: string | undefined
): StudentStatus {
  const status =
    value
      ?.trim()
      .toLowerCase()

  if (
    status === 'inactive' ||
    status === 'suspended' ||
    status === 'graduated'
  ) {
    return status
  }

  return 'active'
}

function statusClass(
  status: string | undefined
): string {
  const normalized =
    normalizedStatus(status)

  const classes:
    Record<
      StudentStatus,
      string
    > = {
      active:
        'bg-green-100 text-green-700',
      inactive:
        'bg-gray-100 text-gray-700',
      suspended:
        'bg-red-100 text-red-700',
      graduated:
        'bg-blue-100 text-blue-700',
    }

  return classes[normalized]
}

function dateInputValue(
  value: string | undefined
): string {
  const normalized =
    value?.trim()

  if (!normalized) {
    return ''
  }

  const datePrefix =
    normalized.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0]

  if (datePrefix) {
    return datePrefix
  }

  const parsed =
    new Date(normalized)

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return ''
  }

  return parsed
    .toISOString()
    .slice(0, 10)
}

function displayDate(
  value: string | undefined
): string {
  const dateValue =
    dateInputValue(value)

  if (!dateValue) {
    return 'N/A'
  }

  const [
    year,
    month,
    day,
  ] =
    dateValue
      .split('-')
      .map(Number)

  const parsed =
    new Date(
      year,
      month - 1,
      day
    )

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return 'N/A'
  }

  return parsed
    .toLocaleDateString()
}

function studentName(
  student: StudentDocument,
  users:
    Record<
      string,
      UserDocument
    >
): string {
  const user =
    student.userId
      ? users[
          student.userId
        ]
      : undefined

  const fullName =
    `${user?.FirstName || ''} ${user?.LastName || ''}`
      .trim()

  return fullName || 'Unknown student'
}

function studentInitials(
  student: StudentDocument,
  users:
    Record<
      string,
      UserDocument
    >
): string {
  const user =
    student.userId
      ? users[
          student.userId
        ]
      : undefined

  const initials =
    `${user?.FirstName?.[0] || ''}${user?.LastName?.[0] || ''}`
      .toUpperCase()

  return initials || 'S'
}

function csvValue(
  value: unknown
): string {
  const text =
    String(value ?? '')

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`
  }

  return text
}

export default function StudentsPage() {
  const router =
    useRouter()

  const [
    students,
    setStudents,
  ] =
    useState<
      StudentDocument[]
    >([])

  const [
    usersMap,
    setUsersMap,
  ] =
    useState<
      Record<
        string,
        UserDocument
      >
    >({})

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1)

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(1)

  const [
    totalItems,
    setTotalItems,
  ] =
    useState(0)

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState('')

  const [
    filterLevel,
    setFilterLevel,
  ] =
    useState('')

  const [
    filterForm,
    setFilterForm,
  ] =
    useState('')

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState('')

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false)

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<
      StudentDocument | null
    >(null)

  const [
    showViewModal,
    setShowViewModal,
  ] =
    useState(false)

  const [
    showEditModal,
    setShowEditModal,
  ] =
    useState(false)

  const [
    showRemoveModal,
    setShowRemoveModal,
  ] =
    useState(false)

  const [
    showAddModal,
    setShowAddModal,
  ] =
    useState(false)

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('')

  const [
    editForm,
    setEditForm,
  ] =
    useState<EditStudentForm>({
      level: '',
      form: '',
      enrollmentDate: '',
      status: 'active',
    })

  const fetchUsers =
    useCallback(
      async (
        userIds: string[]
      ) => {
        const uniqueIds = [
          ...new Set(
            userIds.filter(Boolean)
          ),
        ]

        const entries =
          await Promise.all(
            uniqueIds.map(
              async (userId) => {
                try {
                  const result =
                    await databases.listDocuments(
                      process.env
                        .NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                      process.env
                        .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
                      [
                        Query.equal(
                          '$id',
                          userId
                        ),
                        Query.limit(1),
                      ]
                    )

                  const user =
                    result.documents[0] as
                      | unknown
                      | undefined

                  return user
                    ? [
                        userId,
                        user as UserDocument,
                      ] as const
                    : null
                } catch (userError) {
                  console.error(
                    `Could not load user ${userId}:`,
                    userError
                  )

                  return null
                }
              }
            )
          )

        return Object.fromEntries(
          entries.filter(
            (
              entry
            ): entry is readonly [
              string,
              UserDocument,
            ] =>
              entry !== null
          )
        )
      },
      []
    )

  const fetchStudents =
    useCallback(
      async () => {
        setLoading(true)
        setError('')

        try {
          const response =
            await databases.listDocuments(
              process.env
                .NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env
                .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
              [
                Query.limit(
                  ITEMS_PER_PAGE
                ),
                Query.offset(
                  (
                    currentPage -
                    1
                  ) *
                    ITEMS_PER_PAGE
                ),
                Query.orderDesc(
                  '$createdAt'
                ),
              ]
            )

          const rows =
            response.documents as unknown as StudentDocument[]

          setStudents(rows)
          setTotalItems(
            response.total
          )
          setTotalPages(
            Math.max(
              1,
              Math.ceil(
                response.total /
                  ITEMS_PER_PAGE
              )
            )
          )

          const users =
            await fetchUsers(
              rows
                .map(
                  (student) =>
                    student.userId ||
                    ''
                )
                .filter(Boolean)
            )

          setUsersMap(users)
        } catch (loadError) {
          console.error(
            'Could not load students:',
            loadError
          )

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load students.'
          )
        } finally {
          setLoading(false)
        }
      },
      [
        currentPage,
        fetchUsers,
      ]
    )

  useEffect(() => {
    void fetchStudents()
  }, [fetchStudents])

  const filteredStudents =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase()

      return students.filter(
        (student) => {
          const user =
            student.userId
              ? usersMap[
                  student.userId
                ]
              : undefined

          const searchableText = [
            studentName(
              student,
              usersMap
            ),
            user?.Email,
            user?.Phone,
            student.Level,
            student.Form,
            student.Status,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            )

          const matchesLevel =
            !filterLevel ||
            student.Level ===
              filterLevel

          const matchesForm =
            !filterForm ||
            student.Form ===
              filterForm

          const matchesStatus =
            !filterStatus ||
            normalizedStatus(
              student.Status
            ) ===
              filterStatus

          return (
            matchesSearch &&
            matchesLevel &&
            matchesForm &&
            matchesStatus
          )
        }
      )
    }, [
      students,
      usersMap,
      searchTerm,
      filterLevel,
      filterForm,
      filterStatus,
    ])

  const pageStats =
    useMemo(
      () => ({
        active:
          students.filter(
            (student) =>
              normalizedStatus(
                student.Status
              ) === 'active'
          ).length,
        inactive:
          students.filter(
            (student) =>
              normalizedStatus(
                student.Status
              ) === 'inactive'
          ).length,
        graduated:
          students.filter(
            (student) =>
              normalizedStatus(
                student.Status
              ) === 'graduated'
          ).length,
      }),
      [students]
    )

  const selectedUser =
    selectedStudent?.userId
      ? usersMap[
          selectedStudent.userId
        ]
      : undefined

  const clearFilters = () => {
    setSearchTerm('')
    setFilterLevel('')
    setFilterForm('')
    setFilterStatus('')
    setShowFilters(false)
  }

  const showSuccess = (
    message: string
  ) => {
    setSuccessMessage(
      message
    )

    window.setTimeout(
      () =>
        setSuccessMessage(''),
      3500
    )
  }

  const openView = (
    student: StudentDocument
  ) => {
    setSelectedStudent(
      student
    )
    setShowViewModal(true)
  }

  const openEdit = (
    student: StudentDocument
  ) => {
    setSelectedStudent(
      student
    )
    setEditForm({
      level:
        student.Level || '',
      form:
        student.Form || '',
      enrollmentDate:
        dateInputValue(
          student.EnrollmentDate
        ) ||
        new Date()
          .toISOString()
          .slice(0, 10),
      status:
        normalizedStatus(
          student.Status
        ),
    })
    setError('')
    setShowEditModal(true)
  }

  const openRemove = (
    student: StudentDocument
  ) => {
    setSelectedStudent(
      student
    )
    setError('')
    setShowRemoveModal(true)
  }

  const handleEditSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault()

      if (!selectedStudent) {
        return
      }

      setSubmitting(true)
      setError('')

      try {
        const result =
          await updateStudentAsAdmin({
            studentId:
              selectedStudent.$id,
            level:
              editForm.level,
            form:
              editForm.form,
            enrollmentDate:
              editForm.enrollmentDate,
            status:
              editForm.status,
          })

        setShowEditModal(
          false
        )
        setSelectedStudent(
          null
        )
        showSuccess(
          result.message
        )

        await fetchStudents()
      } catch (updateError) {
        console.error(
          'Could not update student:',
          updateError
        )

        setError(
          updateError instanceof Error
            ? updateError.message
            : 'Could not update student.'
        )
      } finally {
        setSubmitting(false)
      }
    }

  const confirmRemove =
    async () => {
      if (!selectedStudent) {
        return
      }

      setSubmitting(true)
      setError('')

      try {
        const result =
          await removeStudentAsAdmin(
            selectedStudent.$id
          )

        setShowRemoveModal(
          false
        )
        setSelectedStudent(
          null
        )
        showSuccess(
          result.message
        )

        if (
          students.length === 1 &&
          currentPage > 1
        ) {
          setCurrentPage(
            (page) =>
              Math.max(
                1,
                page - 1
              )
          )
        } else {
          await fetchStudents()
        }
      } catch (removeError) {
        console.error(
          'Could not remove student:',
          removeError
        )

        setError(
          removeError instanceof Error
            ? removeError.message
            : 'Could not remove student.'
        )
      } finally {
        setSubmitting(false)
      }
    }

  const exportCsv = () => {
    const rows = [
      [
        '#',
        'Student Name',
        'Email',
        'Phone',
        'Primary Stage',
        'Grade',
        'Status',
        'Enrollment Date',
      ],
      ...filteredStudents.map(
        (
          student,
          index
        ) => {
          const user =
            student.userId
              ? usersMap[
                  student.userId
                ]
              : undefined

          return [
            (
              currentPage -
              1
            ) *
              ITEMS_PER_PAGE +
              index +
              1,
            studentName(
              student,
              usersMap
            ),
            user?.Email || '',
            user?.Phone || '',
            student.Level || '',
            student.Form || '',
            normalizedStatus(
              student.Status
            ),
            dateInputValue(
              student.EnrollmentDate
            ),
          ]
        }
      ),
    ]

    const csv =
      rows
        .map((row) =>
          row
            .map(csvValue)
            .join(',')
        )
        .join('\n')

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const link =
      document.createElement(
        'a'
      )

    link.href = url
    link.download =
      `students-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`

    document.body.appendChild(
      link
    )
    link.click()
    link.remove()

    URL.revokeObjectURL(
      url
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F2] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/admin/dashboard'
                )
              }
              className="rounded-xl bg-white p-2.5 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Students
              </h1>

              <p className="mt-0.5 text-sm text-gray-500">
                Manage enrolled primary-school students
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowAddModal(true)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#C75712] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#D96A1E] hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </header>

        {successMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-l-4 border-green-500 bg-green-50 p-4 text-sm text-green-700">
            <span className="rounded-full bg-green-100 p-1">
              <Check className="h-4 w-4 text-green-600" />
            </span>

            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
            <span className="rounded-full bg-red-100 p-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </span>

            {error}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Total Students
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {totalItems}
            </p>
          </article>

          <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Active on page
            </p>

            <p className="text-2xl font-bold text-green-600">
              {pageStats.active}
            </p>
          </article>

          <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Inactive on page
            </p>

            <p className="text-2xl font-bold text-gray-600">
              {pageStats.inactive}
            </p>
          </article>

          <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Graduated on page
            </p>

            <p className="text-2xl font-bold text-blue-600">
              {pageStats.graduated}
            </p>
          </article>
        </section>

        <section className="relative mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="search"
                value={searchTerm}
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by name, email, phone, stage or grade"
                className="w-full rounded-xl border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 outline-none transition focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
              />
            </label>

            <div className="relative flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (visible) =>
                      !visible
                  )
                }
                className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition ${
                  filterLevel ||
                  filterForm ||
                  filterStatus
                    ? 'border-[#C75712] bg-[#C75712]/10 text-[#C75712]'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border-2 border-gray-300 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">
                      Filters
                    </h2>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-[#C75712] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <label className="mb-3 block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Primary Stage
                    </span>

                    <select
                      value={filterLevel}
                      onChange={(
                        event
                      ) =>
                        setFilterLevel(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    >
                      <option value="">
                        All stages
                      </option>

                      {LEVEL_OPTIONS.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="mb-3 block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Grade
                    </span>

                    <select
                      value={filterForm}
                      onChange={(
                        event
                      ) =>
                        setFilterForm(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    >
                      <option value="">
                        All grades
                      </option>

                      {FORM_OPTIONS.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="mb-4 block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Status
                    </span>

                    <select
                      value={filterStatus}
                      onChange={(
                        event
                      ) =>
                        setFilterStatus(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    >
                      <option value="">
                        All statuses
                      </option>

                      {STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowFilters(
                        false
                      )
                    }
                    className="w-full rounded-lg bg-[#C75712] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#D96A1E]"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border-2 border-gray-300 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#C75712]" />

              <p className="text-sm text-gray-500">
                Loading students...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <User className="h-8 w-8 text-gray-400" />
              </span>

              <p className="font-medium text-gray-500">
                No students found
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Adjust the filters or add a student.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        #
                      </th>

                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Student
                      </th>

                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Primary Stage
                      </th>

                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Grade
                      </th>

                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Status
                      </th>

                      <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Enrollment Date
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map(
                      (
                        student,
                        index
                      ) => {
                        const user =
                          student.userId
                            ? usersMap[
                                student.userId
                              ]
                            : undefined

                        const name =
                          studentName(
                            student,
                            usersMap
                          )

                        return (
                          <tr
                            key={
                              student.$id
                            }
                            className="group transition hover:bg-gray-50/70"
                          >
                            <td className="border-r border-gray-200 px-6 py-4 text-sm font-medium text-gray-400">
                              {(
                                currentPage -
                                1
                              ) *
                                ITEMS_PER_PAGE +
                                index +
                                1}
                            </td>

                            <td className="border-r border-gray-200 px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gradient-to-br from-[#232A42] to-[#3a4466] text-xs font-bold text-white shadow-sm">
                                  {user?.avatar ? (
                                    <img
                                      src={
                                        user.avatar
                                      }
                                      alt={name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    studentInitials(
                                      student,
                                      usersMap
                                    )
                                  )}
                                </span>

                                <span className="min-w-0">
                                  <strong className="block truncate text-sm font-medium text-gray-800">
                                    {name}
                                  </strong>

                                  <span className="block max-w-[220px] truncate text-xs text-gray-400">
                                    {user?.Email ||
                                      'No email recorded'}
                                  </span>
                                </span>
                              </div>
                            </td>

                            <td className="border-r border-gray-200 px-6 py-4 text-sm text-gray-800">
                              {student.Level ||
                                'N/A'}
                            </td>

                            <td className="border-r border-gray-200 px-6 py-4 text-sm text-gray-800">
                              {student.Form ||
                                'N/A'}
                            </td>

                            <td className="border-r border-gray-200 px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(
                                  student.Status
                                )}`}
                              >
                                {normalizedStatus(
                                  student.Status
                                )}
                              </span>
                            </td>

                            <td className="border-r border-gray-200 px-6 py-4 text-sm text-gray-800">
                              {displayDate(
                                student.EnrollmentDate
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openView(
                                      student
                                    )
                                  }
                                  className="rounded-lg p-2 text-blue-600 opacity-70 transition hover:bg-blue-50 hover:text-blue-700 group-hover:opacity-100"
                                  title="View student"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      student
                                    )
                                  }
                                  className="rounded-lg p-2 text-green-600 opacity-70 transition hover:bg-green-50 hover:text-green-700 group-hover:opacity-100"
                                  title="Edit student"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openRemove(
                                      student
                                    )
                                  }
                                  className="rounded-lg p-2 text-red-600 opacity-70 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                                  title="Remove student role"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <footer className="flex flex-col items-center justify-between gap-4 border-t-2 border-gray-300 bg-gray-50/50 px-6 py-4 sm:flex-row">
                  <p className="text-sm text-gray-500">
                    Page{' '}
                    <strong className="text-gray-700">
                      {currentPage}
                    </strong>{' '}
                    of{' '}
                    <strong className="text-gray-700">
                      {totalPages}
                    </strong>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          (page) =>
                            Math.max(
                              1,
                              page - 1
                            )
                        )
                      }
                      disabled={
                        currentPage === 1
                      }
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          (page) =>
                            Math.min(
                              totalPages,
                              page + 1
                            )
                        )
                      }
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </footer>
              )}
            </>
          )}
        </section>
      </div>

      {showViewModal &&
        selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <article className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gray-300 bg-white shadow-2xl">
              <header className="sticky top-0 flex items-center justify-between border-b-2 border-gray-300 bg-white px-6 py-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Student Details
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowViewModal(
                      false
                    )
                  }
                  className="rounded-lg bg-red-500 p-2 text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                {[
                  [
                    'Full Name',
                    studentName(
                      selectedStudent,
                      usersMap
                    ),
                  ],
                  [
                    'Email',
                    selectedUser?.Email ||
                      'N/A',
                  ],
                  [
                    'Phone',
                    selectedUser?.Phone ||
                      'N/A',
                  ],
                  [
                    'Primary Stage',
                    selectedStudent.Level ||
                      'N/A',
                  ],
                  [
                    'Grade',
                    selectedStudent.Form ||
                      'N/A',
                  ],
                  [
                    'Status',
                    normalizedStatus(
                      selectedStudent.Status
                    ),
                  ],
                  [
                    'Enrollment Date',
                    displayDate(
                      selectedStudent.EnrollmentDate
                    ),
                  ],
                  [
                    'Created',
                    new Date(
                      selectedStudent.$createdAt
                    ).toLocaleString(),
                  ],
                ].map(
                  ([
                    label,
                    value,
                  ]) => (
                    <div
                      key={label}
                      className="space-y-1"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        {label}
                      </p>

                      <p className="rounded-lg border border-gray-300 bg-gray-50 p-3 font-semibold capitalize text-gray-800">
                        {value}
                      </p>
                    </div>
                  )
                )}
              </div>
            </article>
          </div>
        )}

      {showEditModal &&
        selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <article className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gray-300 bg-white shadow-2xl">
              <header className="sticky top-0 flex items-center justify-between border-b-2 border-gray-300 bg-white px-6 py-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Student
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowEditModal(
                      false
                    )
                  }
                  className="rounded-lg bg-red-500 p-2 text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <form
                onSubmit={
                  handleEditSubmit
                }
                className="space-y-4 p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Grade
                    </span>

                    <select
                      required
                      value={
                        editForm.form
                      }
                      onChange={(
                        event
                      ) => {
                        const form =
                          event.target
                            .value

                        setEditForm(
                          (current) => ({
                            ...current,
                            form,
                            level:
                              primaryStageForGrade(
                                form
                              ) ||
                              current.level,
                          })
                        )
                      }}
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    >
                      <option value="">
                        Select grade
                      </option>

                      {FORM_OPTIONS.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Primary Stage
                    </span>

                    <input
                      readOnly
                      value={
                        editForm.level
                      }
                      className="w-full cursor-not-allowed rounded-lg border-2 border-gray-300 bg-gray-100 px-3 py-2 text-gray-700"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Enrollment Date
                    </span>

                    <input
                      required
                      type="date"
                      value={
                        editForm.enrollmentDate
                      }
                      onChange={(
                        event
                      ) =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            enrollmentDate:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Status
                    </span>

                    <select
                      value={
                        editForm.status
                      }
                      onChange={(
                        event
                      ) =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            status:
                              event.target
                                .value as StudentStatus,
                          })
                        )
                      }
                      className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-blue-950 outline-none focus:border-[#C75712] focus:ring-2 focus:ring-[#C75712]/30"
                    >
                      {STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <footer className="flex justify-end gap-3 border-t-2 border-gray-300 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setShowEditModal(
                        false
                      )
                    }
                    className="rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-600 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting
                    }
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[#C75712] bg-[#C75712] px-6 py-2 text-white transition hover:bg-[#D96A1E] disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}

                    Update Student
                  </button>
                </footer>
              </form>
            </article>
          </div>
        )}

      {showRemoveModal &&
        selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <article className="w-full max-w-lg rounded-2xl border-2 border-gray-300 bg-white shadow-2xl">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-full border-2 border-red-300 bg-red-100 p-2">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </span>

                  <h2 className="text-xl font-bold text-gray-800">
                    Remove Student Role
                  </h2>
                </div>

                <p className="mb-3 text-gray-700">
                  Remove{' '}
                  <strong>
                    {studentName(
                      selectedStudent,
                      usersMap
                    )}
                  </strong>{' '}
                  from the students table?
                </p>

                <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Linked Appwrite Auth and user-profile records are retained for audit. Removal is blocked while attendance, subjects, marks, fees, discipline, hostel or transport records still reference this student.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowRemoveModal(
                        false
                      )
                    }
                    className="rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-600 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void confirmRemove()
                    }
                    disabled={
                      submitting
                    }
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-red-600 bg-red-600 px-6 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    Remove Role
                  </button>
                </div>
              </div>
            </article>
          </div>
        )}

      <AddStudentModal
        isOpen={showAddModal}
        onClose={() =>
          setShowAddModal(false)
        }
        onSuccess={() => {
          setShowAddModal(false)
          showSuccess(
            'Student added successfully.'
          )
          void fetchStudents()
        }}
        schoolId=""
      />
    </div>
  )
}
