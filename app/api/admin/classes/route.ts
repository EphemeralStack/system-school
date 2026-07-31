import {
  ID,
  Permission,
  Query,
  Role,
} from 'node-appwrite'
import { NextResponse } from 'next/server'

import {
  createAdminAppwriteServices,
  createJwtAppwriteAccount,
} from '@/lib/appwrite/server'
import { ZIMBABWE_PRIMARY_GRADES } from '@/lib/school/primary-school-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MutationBody {
  classId?: unknown
  name?: unknown
  levelOrForm?: unknown
  room?: unknown
  teacherId?: unknown
}

interface AppwriteErrorLike {
  code?: number
  message?: string
}

type RowData = Record<string, unknown>

const LEVELS = new Set<string>(ZIMBABWE_PRIMARY_GRADES)

const BLOCKED_STATUSES = new Set([
  'inactive',
  'suspended',
  'withdrawn',
  'resigned',
  'rejected',
  'retired',
  'on_leave',
])

class ValidationError extends Error {}
class AuthenticationError extends Error {}
class AuthorizationError extends Error {}
class NotFoundError extends Error {}
class ConflictError extends Error {}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function requiredText(value: unknown, label: string): string {
  const result = text(value)

  if (!result) {
    throw new ValidationError(`${label} is required.`)
  }

  return result
}

function envValue(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }

  return ''
}

function ids() {
  return {
    classes:
      envValue(
        'SCHOOL_APPWRITE_CLASSES_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID'
      ) || '6a46954400004dcdad0a',

    teachers:
      envValue(
        'SCHOOL_APPWRITE_TEACHERS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID'
      ) || '6a468fef0015ef8b6700',

    students:
      envValue(
        'SCHOOL_APPWRITE_STUDENTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID'
      ) || '6a468f3d0024a2d9e1f5',

    teacherSubjects:
      envValue(
        'SCHOOL_APPWRITE_TEACHER_SUBJECTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID',
        'NEXT_PUBLIC_APPWRITE_TEACHERSUBJECTS_COLLECTION_ID'
      ) || '6a4695d10013da52558d',

    attendance:
      envValue(
        'SCHOOL_APPWRITE_ATTENDANCE_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID'
      ) || '6a4696a700063845d75a',

    timetable:
      envValue(
        'SCHOOL_APPWRITE_TIMETABLE_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_TIMETABLE_COLLECTION_ID'
      ) || '6a469733002461daf27d',
  }
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  return (error as AppwriteErrorLike).code
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const message = (error as AppwriteErrorLike).message
    if (typeof message === 'string') return message
  }

  return error instanceof Error
    ? error.message
    : 'Unexpected class operation failure.'
}

function bearerJwt(request: Request): string {
  const authorization = request.headers.get('authorization')

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    throw new AuthenticationError('A valid Appwrite JWT is required.')
  }

  const jwt = authorization.slice(7).trim()

  if (!jwt) {
    throw new AuthenticationError('A valid Appwrite JWT is required.')
  }

  return jwt
}

async function body(request: Request): Promise<MutationBody> {
  try {
    return (await request.json()) as MutationBody
  } catch {
    throw new ValidationError('A valid JSON request body is required.')
  }
}

async function assertAdmin(request: Request): Promise<void> {
  const account = createJwtAppwriteAccount(bearerJwt(request))

  let caller

  try {
    caller = await account.get()
  } catch {
    throw new AuthenticationError('Your session is invalid or has expired.')
  }

  const labels = Array.isArray(caller.labels)
    ? caller.labels.map((label) => String(label).trim().toLowerCase())
    : []

  if (!labels.includes('admin')) {
    throw new AuthorizationError('Administrator access is required.')
  }

  const { configuration, tablesDB } = createAdminAppwriteServices()

  const result = await tablesDB.listRows({
    databaseId: configuration.databaseId,
    tableId: configuration.tables.admins,
    queries: [
      Query.equal('userId', [caller.$id]),
      Query.limit(2),
    ],
    total: true,
    ttl: 0,
  })

  if (result.rows.length !== 1) {
    throw new AuthorizationError(
      'Your administrator profile is missing or ambiguous.'
    )
  }

  const status = text((result.rows[0] as unknown as RowData).Status).toLowerCase()

  if (BLOCKED_STATUSES.has(status)) {
    throw new AuthorizationError(`Your administrator account is ${status}.`)
  }
}

function classData(input: MutationBody) {
  const name = requiredText(input.name, 'Class name')
  const levelOrForm = requiredText(input.levelOrForm, 'Grade')
  const room = requiredText(input.room, 'Room').toUpperCase()
  const teacherId = text(input.teacherId)

  if (!LEVELS.has(levelOrForm)) {
    throw new ValidationError('Grade is invalid. Select ECD A, ECD B or Grade 1 to Grade 7.')
  }

  if (name.length > 200) {
    throw new ValidationError('Class name is too long.')
  }

  if (room.length > 100) {
    throw new ValidationError('Room is too long.')
  }

  return { name, levelOrForm, room, teacherId }
}

async function requireClass(classId: string): Promise<void> {
  const { configuration, tablesDB } = createAdminAppwriteServices()

  try {
    await tablesDB.getRow({
      databaseId: configuration.databaseId,
      tableId: ids().classes,
      rowId: classId,
    })
  } catch (error) {
    if (errorCode(error) === 404) {
      throw new NotFoundError('Class was not found.')
    }

    throw error
  }
}

async function validateTeacher(
  teacherId: string,
  currentClassId?: string
): Promise<void> {
  if (!teacherId) return

  const { configuration, tablesDB } = createAdminAppwriteServices()
  const tableIds = ids()

  let teacher: RowData

  try {
    teacher = (await tablesDB.getRow({
      databaseId: configuration.databaseId,
      tableId: tableIds.teachers,
      rowId: teacherId,
    })) as unknown as RowData
  } catch (error) {
    if (errorCode(error) === 404) {
      throw new ValidationError('The selected teacher does not exist.')
    }

    throw error
  }

  const status = text(teacher.Status).toLowerCase()

  if (status !== 'active') {
    throw new ConflictError('Only active teachers can be assigned to classes.')
  }

  const existing = await tablesDB.listRows({
    databaseId: configuration.databaseId,
    tableId: tableIds.classes,
    queries: [
      Query.equal('teacherId', [teacherId]),
      Query.limit(10),
    ],
    total: true,
    ttl: 0,
  })

  if (existing.rows.some((row) => row.$id !== currentClassId)) {
    throw new ConflictError(
      'This teacher is already assigned to another class.'
    )
  }
}

function permissions(): string[] {
  return [
    Permission.read(Role.label('admin')),
    Permission.update(Role.label('admin')),
    Permission.delete(Role.label('admin')),
    Permission.read(Role.label('teacher')),
    Permission.read(Role.label('student')),
  ]
}

async function referenceCounts(classId: string) {
  const { configuration, tablesDB } = createAdminAppwriteServices()
  const tableIds = ids()

  const definitions = [
    ['students', tableIds.students],
    ['teacher subject assignments', tableIds.teacherSubjects],
    ['attendance records', tableIds.attendance],
    ['timetable entries', tableIds.timetable],
  ] as const

  const results = await Promise.all(
    definitions.map(async ([name, tableId]) => {
      const response = await tablesDB.listRows({
        databaseId: configuration.databaseId,
        tableId,
        queries: [
          Query.equal('classId', [classId]),
          Query.limit(1),
        ],
        total: true,
        ttl: 0,
      })

      return { name, count: response.total }
    })
  )

  return results.filter((item) => item.count > 0)
}

function respondToError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  console.error('Secure class operation failed:', error)

  return NextResponse.json(
    {
      error: 'The class operation could not be completed.',
      details:
        process.env.NODE_ENV === 'development'
          ? errorMessage(error)
          : undefined,
    },
    { status: 500 }
  )
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await assertAdmin(request)

    const input = await body(request)
    const data = classData(input)

    await validateTeacher(data.teacherId)

    const { configuration, tablesDB } = createAdminAppwriteServices()
    const classId = ID.unique()

    await tablesDB.createRow({
      databaseId: configuration.databaseId,
      tableId: ids().classes,
      rowId: classId,
      data: {
        name: data.name,
        LevelOrForm: data.levelOrForm,
        Room: data.room,
        ...(data.teacherId ? { teacherId: data.teacherId } : {}),
      },
      permissions: permissions(),
    })

    return NextResponse.json(
      { classId, message: 'Class created successfully.' },
      { status: 201 }
    )
  } catch (error) {
    return respondToError(error)
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    await assertAdmin(request)

    const input = await body(request)
    const classId = requiredText(input.classId, 'Class ID')
    const data = classData(input)

    await requireClass(classId)
    await validateTeacher(data.teacherId, classId)

    const { configuration, tablesDB } = createAdminAppwriteServices()

    await tablesDB.updateRow({
      databaseId: configuration.databaseId,
      tableId: ids().classes,
      rowId: classId,
      data: {
        name: data.name,
        LevelOrForm: data.levelOrForm,
        Room: data.room,
        teacherId: data.teacherId || null,
      },
    })

    return NextResponse.json({
      classId,
      message: 'Class updated successfully.',
    })
  } catch (error) {
    return respondToError(error)
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    await assertAdmin(request)

    const input = await body(request)
    const classId = requiredText(input.classId, 'Class ID')

    await requireClass(classId)

    const references = await referenceCounts(classId)

    if (references.length > 0) {
      const summary = references
        .map((item) => `${item.count} ${item.name}`)
        .join(', ')

      throw new ConflictError(
        `This class cannot be deleted because it is referenced by ${summary}. Reassign or remove those records first.`
      )
    }

    const { configuration, tablesDB } = createAdminAppwriteServices()

    await tablesDB.deleteRow({
      databaseId: configuration.databaseId,
      tableId: ids().classes,
      rowId: classId,
    })

    return NextResponse.json({
      classId,
      message: 'Class deleted successfully.',
    })
  } catch (error) {
    return respondToError(error)
  }
}
