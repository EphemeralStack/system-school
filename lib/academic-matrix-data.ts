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
  tone: 'blue' | 'green' | 'orange' | 'red'
}

export interface ResourceMetric {
  id: string
  title: string
  chart: 'bars' | 'donut' | 'pie' | 'faculty'
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

type Document = {
  $id: string
  $createdAt?: string
  [key: string]: unknown
}

function collectionId(
  fallback: string,
  ...values: Array<string | undefined>
): string {
  return values.find((value) => value?.trim())?.trim() || fallback
}

function text(
  document: Document | undefined,
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
  keys: string[],
  fallback = 0
): number {
  if (!document) return fallback

  for (const key of keys) {
    const value = document[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return fallback
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  return `${parts[0]?.[0] || ''}${parts.at(-1)?.[0] || ''}`.toUpperCase()
}

async function listCollectionStrict(
  collection: string
): Promise<Document[]> {
  const databaseId =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim()

  if (!databaseId) {
    throw new Error(
      'Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID'
    )
  }

  const response =
    await databases.listDocuments(
      databaseId,
      collection,
      [
        Query.limit(100),
      ]
    )

  return response
    .documents as unknown as Document[]
}

function markScore(document: Document): number | null {
  const direct = numberValue(
    document,
    ['Percentage', 'Score', 'Mark', 'percentage', 'score', 'mark'],
    Number.NaN
  )

  if (Number.isFinite(direct)) {
    return Math.max(0, Math.min(100, direct))
  }

  const obtained = numberValue(
    document,
    ['MarksObtained', 'marksObtained'],
    Number.NaN
  )
  const total = numberValue(
    document,
    ['TotalMarks', 'totalMarks'],
    Number.NaN
  )

  if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
    return Math.max(0, Math.min(100, (obtained / total) * 100))
  }

  return null
}

function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function isSuccessfulPayment(document: Document): boolean {
  const status = text(document, ['Status', 'status'])
    .trim()
    .toLowerCase()

  // Preserve compatibility with historic payment rows that predate Status.
  if (!status) return true

  return [
    'approved',
    'paid',
    'completed',
    'complete',
    'successful',
    'success',
    'confirmed',
  ].some(
    (acceptedStatus) =>
      status === acceptedStatus ||
      status.includes(acceptedStatus)
  )
}

export async function loadAcademicMatrixData(): Promise<AcademicMatrixData> {
  const [
    users,
    teachers,
    subjects,
    classes,
    allocationsSource,
    departments,
    marks,
    attendanceSource,
    inventory,
    fees,
    payments,
  ] = await Promise.all([
    listCollectionStrict(
      collectionId(
        'users',
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'teachers',
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'subjects',
        process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'classes',
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'teacher_subjects',
        process.env.NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERSUBJECTS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'departments',
        process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'marks',
        process.env.NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'attendance',
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'inventory',
        process.env.NEXT_PUBLIC_APPWRITE_INVENTORY_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'fees',
        process.env.NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID
      )
    ),
    listCollectionStrict(
      collectionId(
        'payments',
        process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID
      )
    ),
  ])

  const usersById = new Map(users.map((item) => [item.$id, item]))
  const teachersById = new Map(teachers.map((item) => [item.$id, item]))
  const subjectsById = new Map(subjects.map((item) => [item.$id, item]))
  const classesById = new Map(classes.map((item) => [item.$id, item]))
  const departmentsById = new Map(departments.map((item) => [item.$id, item]))

  const allocationCount = new Map<string, number>()

  allocationsSource.forEach((allocation) => {
    const teacherId = text(allocation, ['teacherId', 'TeacherId'])
    if (!teacherId) return
    allocationCount.set(teacherId, (allocationCount.get(teacherId) || 0) + 1)
  })

  const allocations: CourseAllocationRow[] = allocationsSource.map(
    (allocation) => {
      const teacherId = text(allocation, ['teacherId', 'TeacherId'])
      const subjectId = text(allocation, ['subjectId', 'SubjectId'])
      const classId = text(allocation, ['classId', 'ClassId'])
      const teacher = teachersById.get(teacherId)
      const user = usersById.get(text(teacher, ['userId', 'UserId']))
      const subject = subjectsById.get(subjectId)
      const classDocument = classesById.get(classId)
      const department = departmentsById.get(
        text(teacher, ['departmentId', 'DepartmentId']) ||
          text(subject, ['departmentId', 'DepartmentId'])
      )

      const teacherName = `${text(user, ['FirstName'], 'Unknown')} ${text(
        user,
        ['LastName']
      )}`.trim()

      return {
        id: allocation.$id,
        teacherName,
        teacherInitials: initials(teacherName),
        avatar: text(user, ['avatar']),
        courseCode: text(subject, ['SubjectCode', 'Code'], subjectId),
        courseTitle: text(
          subject,
          ['SubjectName', 'Name'],
          'Unnamed subject'
        ),
        department: text(
          department,
          ['DepartmentName', 'Name'],
          'Unassigned'
        ),
        className: text(
          classDocument,
          ['LevelOrForm', 'Name', 'Room'],
          'Unassigned'
        ),
        credits: Math.max(0, numberValue(subject, ['Credits', 'credits'])),
        semester: text(subject, ['Semester', 'Term'], 'Not recorded'),
        workload: Math.min(100, (allocationCount.get(teacherId) || 0) * 20),
      }
    }
  )

  const subjectDepartment = new Map<string, string>()

  subjects.forEach((subject) => {
    const department = departmentsById.get(
      text(subject, ['departmentId', 'DepartmentId'])
    )

    subjectDepartment.set(
      subject.$id,
      text(department, ['DepartmentName', 'Name'], 'Unassigned')
    )
  })

  const departmentScores = new Map<string, number[]>()

  marks.forEach((mark) => {
    const score = markScore(mark)
    if (score === null) return

    const department =
      subjectDepartment.get(text(mark, ['subjectId', 'SubjectId'])) ||
      'Unassigned'

    const scores = departmentScores.get(department) || []
    scores.push(score)
    departmentScores.set(department, scores)
  })

  const departmentPerformance = Array.from(departmentScores.entries())
    .map(([label, scores]) => ({
      label,
      value: Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length
      ),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)

  const examGroups = new Map<string, number[]>()

  marks.forEach((mark) => {
    const score = markScore(mark)
    if (score === null) return

    const examId = text(mark, ['examId', 'ExamId'], 'Unassigned')
    const scores = examGroups.get(examId) || []
    scores.push(score)
    examGroups.set(examId, scores)
  })

  const gpaSeries = Array.from(examGroups.values())
    .slice(0, 6)
    .map((scores) =>
      Number(
        (
          (scores.reduce((sum, score) => sum + score, 0) /
            scores.length /
            100) *
          4
        ).toFixed(2)
      )
    )

  if (gpaSeries.length === 0) gpaSeries.push(0)

  const statuses = attendanceSource.map((entry) =>
    text(entry, ['Status']).toLowerCase()
  )

  const present = statuses.filter(
    (status) => status === 'present' || status === 'late'
  ).length
  const punctual = statuses.filter((status) => status === 'present').length
  const attendanceRate = percentage(present, statuses.length)
  const punctuality = percentage(punctual, statuses.length)

  const assignedClassIds = new Set(
    allocationsSource
      .map((allocation) => text(allocation, ['classId', 'ClassId']))
      .filter(Boolean)
  )

  const lowMarks = marks.filter((mark) => {
    const score = markScore(mark)
    return score !== null && score < 50
  }).length

  const overloadedTeachers = Array.from(allocationCount.values()).filter(
    (count) => count >= 5
  ).length

  const resourceAlerts = inventory.filter((item) => {
    const quantity = numberValue(item, ['Quantity', 'quantity', 'Stock'])
    const status = text(item, ['Status', 'Condition']).toLowerCase()

    return (
      quantity <= 3 ||
      status.includes('low') ||
      status.includes('maintenance') ||
      status.includes('service')
    )
  }).length

  const alerts: AcademicAlert[] = [
    {
      label: 'Unassigned classes',
      value: classes.filter((item) => !assignedClassIds.has(item.$id)).length,
      tone: 'orange',
    },
    {
      label: 'Low mark alerts',
      value: lowMarks,
      tone: 'red',
    },
    {
      label: 'Heavy workloads',
      value: overloadedTeachers,
      tone: 'blue',
    },
    {
      label: 'Resource alerts',
      value: resourceAlerts,
      tone: 'green',
    },
  ]

  const inventoryStatusCounts = {
    available: 0,
    inUse: 0,
    maintenance: 0,
  }

  inventory.forEach((item) => {
    const status = text(item, ['Status', 'Condition']).toLowerCase()

    if (
      status.includes('available') ||
      status.includes('excellent') ||
      status.includes('good')
    ) {
      inventoryStatusCounts.available += 1
    } else if (
      status.includes('maintenance') ||
      status.includes('service') ||
      status.includes('repair')
    ) {
      inventoryStatusCounts.maintenance += 1
    } else {
      inventoryStatusCounts.inUse += 1
    }
  })

  const inventoryTotal = inventory.length

  const classroomLabels = classes.slice(0, 6).map((item) =>
    text(item, ['Room', 'LevelOrForm', 'Name'], item.$id)
  )

  const classroomValues = classes.slice(0, 6).map((item) => {
    const capacity = numberValue(item, ['Capacity'], 0)
    return capacity
  })

  const paid = payments
    .filter(isSuccessfulPayment)
    .reduce(
      (sum, item) => sum + numberValue(item, ['Amount']),
      0
    )
  const billed = fees.reduce(
    (sum, item) => sum + numberValue(item, ['AmountDue']),
    0
  )

  const libraryItems = inventory.filter((item) =>
    text(item, ['Name', 'ItemName'])
      .toLowerCase()
      .match(/library|book|desk|chair/)
  )

  const sportItems = inventory.filter((item) =>
    text(item, ['Name', 'ItemName'])
      .toLowerCase()
      .match(/sport|football|netball|ball|athletic/)
  )

  const departmentWorkload = new Map<string, number>()

  allocations.forEach((allocation) => {
    departmentWorkload.set(
      allocation.department,
      (departmentWorkload.get(allocation.department) || 0) + 1
    )
  })

  const facultyEntries = Array.from(departmentWorkload.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  const maximumWorkload = Math.max(1, ...facultyEntries.map((entry) => entry[1]))

  const resources: ResourceMetric[] = [
    {
      id: 'classrooms',
      title: 'Classroom Capacity',
      chart: 'bars',
      values: classroomValues.length > 0 ? classroomValues : [0],
      labels: classroomLabels.length > 0 ? classroomLabels : ['No classes'],
    },
    {
      id: 'labs',
      title: 'Equipment Availability',
      chart: 'donut',
      values: [
        percentage(inventoryStatusCounts.available, inventoryTotal),
        percentage(inventoryStatusCounts.inUse, inventoryTotal),
        percentage(inventoryStatusCounts.maintenance, inventoryTotal),
      ],
      labels: ['Available', 'In use', 'Maintenance'],
    },
    {
      id: 'budget',
      title: 'Fee Collection',
      chart: 'pie',
      values: [paid, Math.max(0, billed - paid)],
      labels: ['Collected', 'Outstanding'],
    },
    {
      id: 'library',
      title: 'Library & Study Resources',
      chart: 'bars',
      values:
        libraryItems.length > 0
          ? libraryItems.slice(0, 6).map((item) =>
              numberValue(item, ['Quantity'], 0)
            )
          : [0],
      labels:
        libraryItems.length > 0
          ? libraryItems
              .slice(0, 6)
              .map((item) => text(item, ['Name', 'ItemName'], item.$id))
          : ['No library inventory'],
    },
    {
      id: 'sports',
      title: 'Sporting Resources',
      chart: 'pie',
      values:
        sportItems.length > 0
          ? sportItems.slice(0, 6).map((item) =>
              numberValue(item, ['Quantity'], 0)
            )
          : [0],
      labels:
        sportItems.length > 0
          ? sportItems
              .slice(0, 6)
              .map((item) => text(item, ['Name', 'ItemName'], item.$id))
          : ['No sports inventory'],
    },
    {
      id: 'faculty',
      title: 'Faculty Workload',
      chart: 'faculty',
      values:
        facultyEntries.length > 0
          ? facultyEntries.map(([, count]) =>
              Math.round((count / maximumWorkload) * 100)
            )
          : [0],
      labels:
        facultyEntries.length > 0
          ? facultyEntries.map(([label]) => label)
          : ['No allocations'],
    },
  ]

  return {
    allocations,
    departmentPerformance,
    gpaSeries,
    attendance: [
      attendanceRate,
      punctuality,
      Math.round((attendanceRate + punctuality) / 2),
    ],
    alerts,
    resources,
  }
}
