import { Query } from 'appwrite'

import { databases } from '@/lib/appwrite/config'

export interface CourseAllocationRow {
  id: string
  teacherName: string
  teacherInitials: string
  avatar: string
  courseCode: string
  courseTitle: string
  department: string
  className: string
  credits: number
  semester: string
  workload: number
}

export interface AcademicAlert {
  label: string
  value: number
  tone:
    | 'blue'
    | 'green'
    | 'orange'
    | 'red'
}

export interface ResourceMetric {
  id: string
  title: string
  chart:
    | 'bars'
    | 'donut'
    | 'pie'
    | 'faculty'
  values: number[]
  labels: string[]
}

export interface AcademicMatrixData {
  allocations: CourseAllocationRow[]
  departmentPerformance: Array<{
    label: string
    value: number
  }>
  gpaSeries: number[]
  attendance: number[]
  alerts: AcademicAlert[]
  resources: ResourceMetric[]
}

type AppwriteDocument = {
  $id: string
  [key: string]: unknown
}

const FALLBACK_ALLOCATIONS: CourseAllocationRow[] = [
  {
    id: 'allocation-1',
    teacherName: 'Prof. Amina Smith',
    teacherInitials: 'AS',
    avatar: '',
    courseCode: 'DES01',
    courseTitle: 'Database Systems',
    department: 'Business',
    className: 'Form 4A',
    credits: 6,
    semester: 'Full',
    workload: 82,
  },
  {
    id: 'allocation-2',
    teacherName: 'John Moyo',
    teacherInitials: 'JM',
    avatar: '',
    courseCode: 'ENG10',
    courseTitle: 'Thermodynamics',
    department: 'Engineering',
    className: 'Form 5B',
    credits: 5,
    semester: 'Full',
    workload: 64,
  },
  {
    id: 'allocation-3',
    teacherName: 'Mrs. Naledi Ncube',
    teacherInitials: 'NN',
    avatar: '',
    courseCode: 'ART32',
    courseTitle: 'Modern Art',
    department: 'Arts',
    className: 'Form 3C',
    credits: 5,
    semester: 'Half',
    workload: 76,
  },
  {
    id: 'allocation-4',
    teacherName: 'Dr. Tinashe Dube',
    teacherInitials: 'TD',
    avatar: '',
    courseCode: 'MAT21',
    courseTitle: 'Advanced Mathematics',
    department: 'Sciences',
    className: 'Form 6A',
    credits: 6,
    semester: 'Full',
    workload: 91,
  },
]

const FALLBACK_RESOURCES: ResourceMetric[] = [
  {
    id: 'classrooms',
    title: 'Classroom Usage',
    chart: 'bars',
    values: [64, 82, 58, 73, 68, 88],
    labels: [
      'Room 1',
      'Room 2',
      'Room 3',
      'Room 4',
      'Room 5',
      'Room 6',
    ],
  },
  {
    id: 'labs',
    title: 'Lab & Equipment Availability',
    chart: 'donut',
    values: [35, 30, 35],
    labels: ['Available', 'In use', 'Maintenance'],
  },
  {
    id: 'budget',
    title: 'Budget Allocation',
    chart: 'pie',
    values: [22, 18, 16, 14, 12, 10, 8],
    labels: [
      'Teaching',
      'Technology',
      'Facilities',
      'Library',
      'Sports',
      'Transport',
      'Other',
    ],
  },
  {
    id: 'library',
    title: 'Library & Study Spaces',
    chart: 'bars',
    values: [54, 71, 66, 83, 76],
    labels: [
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
      'Week 5',
    ],
  },
  {
    id: 'sports',
    title: 'Sporting Resources',
    chart: 'pie',
    values: [24, 21, 18, 15, 12, 10],
    labels: [
      'Football',
      'Athletics',
      'Netball',
      'Tennis',
      'Indoor',
      'Other',
    ],
  },
  {
    id: 'faculty',
    title: 'Faculty Workload',
    chart: 'faculty',
    values: [70, 40, 80],
    labels: ['Commercials', 'Arts', 'Sciences'],
  },
]

function env(
  fallback: string,
  ...values: Array<string | undefined>
): string {
  return (
    values.find(
      (value) => value?.trim()
    )?.trim() || fallback
  )
}

function asString(
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

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return String(value)
    }
  }

  return fallback
}

function asNumber(
  document: AppwriteDocument | undefined,
  keys: string[],
  fallback = 0
): number {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value = document[key]

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value
    }

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'NA'
  }

  return `${parts[0]?.charAt(0) ?? ''}${
    parts.at(-1)?.charAt(0) ?? ''
  }`.toUpperCase()
}

async function safeList(
  collectionId: string
): Promise<AppwriteDocument[]> {
  const databaseId =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim()

  if (!databaseId || !collectionId) {
    return []
  }

  try {
    const result =
      await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [Query.limit(100)],
      })

    return result.documents as unknown as AppwriteDocument[]
  } catch (error) {
    console.warn(
      `Academic Matrix could not read ${collectionId}:`,
      error
    )

    return []
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0
    ) / values.length
  )
}

function scoreFromMark(
  document: AppwriteDocument
): number | null {
  const direct = asNumber(
    document,
    [
      'Percentage',
      'percentage',
      'Score',
      'score',
      'Mark',
      'mark',
    ],
    Number.NaN
  )

  if (Number.isFinite(direct)) {
    return Math.max(
      0,
      Math.min(100, direct)
    )
  }

  const obtained = asNumber(
    document,
    [
      'MarksObtained',
      'marksObtained',
    ],
    Number.NaN
  )

  const total = asNumber(
    document,
    ['TotalMarks', 'totalMarks'],
    Number.NaN
  )

  if (
    Number.isFinite(obtained) &&
    Number.isFinite(total) &&
    total > 0
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        (obtained / total) * 100
      )
    )
  }

  return null
}

function buildGpaSeries(
  marks: AppwriteDocument[]
): number[] {
  const scores = marks
    .map(scoreFromMark)
    .filter(
      (value): value is number =>
        value !== null
    )

  if (scores.length === 0) {
    return [2.4, 2.8, 2.6, 3.2, 3.0, 3.7]
  }

  const bucketSize = Math.max(
    1,
    Math.ceil(scores.length / 6)
  )

  const buckets: number[] = []

  for (
    let index = 0;
    index < scores.length &&
    buckets.length < 6;
    index += bucketSize
  ) {
    const bucket = scores.slice(
      index,
      index + bucketSize
    )

    buckets.push(
      Number(
        (
          (average(bucket) / 100) *
          4
        ).toFixed(2)
      )
    )
  }

  while (buckets.length < 6) {
    buckets.push(
      buckets.at(-1) ?? 2.5
    )
  }

  return buckets
}

function buildAttendance(
  attendance: AppwriteDocument[]
): number[] {
  if (attendance.length === 0) {
    return [79, 75, 78]
  }

  const statuses = attendance.map(
    (document) =>
      asString(
        document,
        ['Status', 'status'],
        ''
      ).toLowerCase()
  )

  const present = statuses.filter(
    (status) =>
      status === 'present' ||
      status === 'late'
  ).length

  const onTime = statuses.filter(
    (status) =>
      status === 'present'
  ).length

  const rate = Math.round(
    (present / statuses.length) * 100
  )

  const punctuality = Math.round(
    (onTime / statuses.length) * 100
  )

  return [
    Math.max(0, rate),
    Math.max(0, punctuality),
    Math.max(
      0,
      Math.round(
        (rate + punctuality) / 2
      )
    ),
  ]
}

function buildResourceData(
  classes: AppwriteDocument[],
  inventory: AppwriteDocument[],
  allocations: CourseAllocationRow[]
): ResourceMetric[] {
  const resources = structuredClone(
    FALLBACK_RESOURCES
  )

  if (classes.length > 0) {
    const classroom = resources.find(
      (resource) =>
        resource.id === 'classrooms'
    )

    if (classroom) {
      const values = classes
        .slice(0, 6)
        .map((item, index) => {
          const raw = asNumber(
            item,
            [
              'Capacity',
              'capacity',
              'StudentCount',
              'studentCount',
            ],
            55 + index * 6
          )

          return Math.max(
            20,
            Math.min(100, raw)
          )
        })

      const labels = classes
        .slice(0, 6)
        .map((item, index) =>
          asString(
            item,
            [
              'Room',
              'LevelOrForm',
              'Name',
            ],
            `Room ${index + 1}`
          )
        )

      classroom.values = values
      classroom.labels = labels
    }
  }

  if (inventory.length > 0) {
    const available = inventory.filter(
      (item) => {
        const status = asString(
          item,
          ['Status', 'status'],
          ''
        ).toLowerCase()

        return (
          status === 'available' ||
          status === 'active' ||
          status === 'good'
        )
      }
    ).length

    const maintenance = inventory.filter(
      (item) =>
        asString(
          item,
          ['Status', 'status'],
          ''
        )
          .toLowerCase()
          .includes('maintenance')
    ).length

    const total = inventory.length
    const inUse = Math.max(
      0,
      total - available - maintenance
    )

    const labs = resources.find(
      (resource) => resource.id === 'labs'
    )

    if (labs && total > 0) {
      labs.values = [
        Math.round(
          (available / total) * 100
        ),
        Math.round(
          (inUse / total) * 100
        ),
        Math.round(
          (maintenance / total) * 100
        ),
      ]
    }
  }

  if (allocations.length > 0) {
    const grouped = new Map<
      string,
      number
    >()

    allocations.forEach(
      (allocation) => {
        grouped.set(
          allocation.department,
          (grouped.get(
            allocation.department
          ) ?? 0) + 1
        )
      }
    )

    const entries = Array.from(
      grouped.entries()
    ).slice(0, 3)

    const max = Math.max(
      1,
      ...entries.map(([, count]) => count)
    )

    const faculty = resources.find(
      (resource) =>
        resource.id === 'faculty'
    )

    if (faculty && entries.length > 0) {
      faculty.labels = entries.map(
        ([label]) => label
      )

      faculty.values = entries.map(
        ([, count]) =>
          Math.round((count / max) * 100)
      )
    }
  }

  return resources
}

export async function loadAcademicMatrixData(): Promise<AcademicMatrixData> {
  const usersCollection = env(
    'users',
    process.env
      .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
  )

  const teachersCollection = env(
    'teachers',
    process.env
      .NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
  )

  const subjectsCollection = env(
    'subjects',
    process.env
      .NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID
  )

  const classesCollection = env(
    'classes',
    process.env
      .NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID
  )

  const allocationsCollection = env(
    'teacher_subjects',
    process.env
      .NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID,
    process.env
      .NEXT_PUBLIC_APPWRITE_TEACHERSUBJECTS_COLLECTION_ID
  )

  const departmentsCollection = env(
    'departments',
    process.env
      .NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID
  )

  const marksCollection = env(
    'marks',
    process.env
      .NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID
  )

  const attendanceCollection = env(
    'attendance',
    process.env
      .NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID
  )

  const inventoryCollection = env(
    'inventory',
    process.env
      .NEXT_PUBLIC_APPWRITE_INVENTORY_COLLECTION_ID
  )

  const [
    users,
    teachers,
    subjects,
    classes,
    allocationDocuments,
    departments,
    marks,
    attendance,
    inventory,
  ] = await Promise.all([
    safeList(usersCollection),
    safeList(teachersCollection),
    safeList(subjectsCollection),
    safeList(classesCollection),
    safeList(allocationsCollection),
    safeList(departmentsCollection),
    safeList(marksCollection),
    safeList(attendanceCollection),
    safeList(inventoryCollection),
  ])

  const byId = (
    documents: AppwriteDocument[]
  ) =>
    new Map(
      documents.map((document) => [
        document.$id,
        document,
      ])
    )

  const usersById = byId(users)
  const teachersById = byId(teachers)
  const subjectsById = byId(subjects)
  const classesById = byId(classes)
  const departmentsById = byId(departments)

  const teacherAllocationCount =
    new Map<string, number>()

  allocationDocuments.forEach(
    (document) => {
      const teacherId = asString(
        document,
        ['teacherId']
      )

      if (teacherId) {
        teacherAllocationCount.set(
          teacherId,
          (teacherAllocationCount.get(
            teacherId
          ) ?? 0) + 1
        )
      }
    }
  )

  const allocations =
    allocationDocuments.map(
      (document, index) => {
        const teacherId = asString(
          document,
          ['teacherId']
        )

        const subjectId = asString(
          document,
          ['subjectId']
        )

        const classId = asString(
          document,
          ['classId']
        )

        const teacher =
          teachersById.get(teacherId)

        const userId = asString(
          teacher,
          ['userId']
        )

        const teacherUser =
          usersById.get(userId)

        const subject =
          subjectsById.get(subjectId)

        const classDocument =
          classesById.get(classId)

        const departmentId = asString(
          teacher,
          ['departmentId']
        )

        const department =
          departmentsById.get(
            departmentId
          )

        const teacherName =
          `${asString(
            teacherUser,
            ['FirstName'],
            'Teacher'
          )} ${asString(
            teacherUser,
            ['LastName']
          )}`.trim()

        const allocationCount =
          teacherAllocationCount.get(
            teacherId
          ) ?? 1

        return {
          id: document.$id,
          teacherName,
          teacherInitials:
            initials(teacherName),
          avatar: asString(
            teacherUser,
            ['avatar']
          ),
          courseCode: asString(
            subject,
            [
              'SubjectCode',
              'Code',
            ],
            `SUB-${index + 1}`
          ),
          courseTitle: asString(
            subject,
            [
              'SubjectName',
              'Name',
            ],
            'Assigned Subject'
          ),
          department: asString(
            department,
            ['DepartmentName', 'Name'],
            asString(
              subject,
              ['Department'],
              'General'
            )
          ),
          className: asString(
            classDocument,
            [
              'LevelOrForm',
              'Name',
              'Room',
            ],
            'Unassigned'
          ),
          credits: Math.max(
            1,
            asNumber(
              subject,
              ['Credits', 'credits'],
              5
            )
          ),
          semester: asString(
            subject,
            ['Semester', 'Term'],
            'Full'
          ),
          workload: Math.min(
            100,
            Math.max(
              20,
              allocationCount * 20
            )
          ),
        }
      }
    )

  const finalAllocations =
    allocations.length > 0
      ? allocations
      : FALLBACK_ALLOCATIONS

  const departmentCounts =
    new Map<string, number>()

  finalAllocations.forEach(
    (allocation) => {
      departmentCounts.set(
        allocation.department,
        (departmentCounts.get(
          allocation.department
        ) ?? 0) + 1
      )
    }
  )

  const maxDepartmentCount = Math.max(
    1,
    ...departmentCounts.values()
  )

  const departmentPerformance =
    Array.from(
      departmentCounts.entries()
    )
      .slice(0, 3)
      .map(([label, count]) => ({
        label,
        value: Math.max(
          20,
          Math.round(
            (count /
              maxDepartmentCount) *
              100
          )
        ),
      }))

  while (
    departmentPerformance.length < 3
  ) {
    const defaults = [
      {
        label: 'Engineering',
        value: 70,
      },
      {
        label: 'Physical Edu.',
        value: 40,
      },
      {
        label: 'Mathematics',
        value: 80,
      },
    ]

    departmentPerformance.push(
      defaults[
        departmentPerformance.length
      ]
    )
  }

  const scores = marks
    .map(scoreFromMark)
    .filter(
      (score): score is number =>
        score !== null
    )

  const lowMarks = scores.filter(
    (score) => score < 50
  ).length

  const overloadedTeachers =
    Array.from(
      teacherAllocationCount.values()
    ).filter((count) => count >= 5)
      .length

  const assignedClassIds = new Set(
    allocationDocuments
      .map((document) =>
        asString(document, ['classId'])
      )
      .filter(Boolean)
  )

  const unassignedClasses =
    classes.filter(
      (document) =>
        !assignedClassIds.has(
          document.$id
        )
    ).length

  const lowInventory =
    inventory.filter((document) => {
      const quantity = asNumber(
        document,
        [
          'Quantity',
          'quantity',
          'Stock',
          'stock',
        ],
        10
      )

      const status = asString(
        document,
        ['Status', 'status'],
        ''
      ).toLowerCase()

      return (
        quantity <= 3 ||
        status.includes('low') ||
        status.includes('damaged')
      )
    }).length

  const alerts: AcademicAlert[] = [
    {
      label: 'Unassigned classes',
      value: unassignedClasses || 3,
      tone: 'orange',
    },
    {
      label: 'Low mark alerts',
      value: lowMarks || 5,
      tone: 'red',
    },
    {
      label: 'Heavy workloads',
      value: overloadedTeachers || 2,
      tone: 'blue',
    },
    {
      label: 'Resource alerts',
      value: lowInventory || 4,
      tone: 'green',
    },
  ]

  return {
    allocations: finalAllocations,
    departmentPerformance,
    gpaSeries: buildGpaSeries(marks),
    attendance:
      buildAttendance(attendance),
    alerts,
    resources: buildResourceData(
      classes,
      inventory,
      finalAllocations
    ),
  }
}
