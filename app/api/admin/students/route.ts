import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

import {
  createAdminAppwriteServices,
  createJwtAppwriteAccount,
} from '@/lib/appwrite/server'
import {
  ZIMBABWE_PRIMARY_GRADES,
  ZIMBABWE_PRIMARY_STAGES,
  primaryStageForGrade,
} from '@/lib/school/primary-school-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MutationBody {
  studentId?: unknown
  level?: unknown
  form?: unknown
  enrollmentDate?: unknown
  status?: unknown
}

interface AppwriteErrorLike {
  code?: number
  message?: string
}

type RowData = Record<string, unknown>

const PRIMARY_GRADES = new Set<string>(
  ZIMBABWE_PRIMARY_GRADES
)

const PRIMARY_STAGES = new Set<string>(
  ZIMBABWE_PRIMARY_STAGES
)

const STUDENT_STATUSES = new Set([
  'active',
  'inactive',
  'suspended',
  'graduated',
])

const BLOCKED_ADMIN_STATUSES = new Set([
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
  return typeof value === 'string'
    ? value.trim()
    : ''
}

function requiredText(
  value: unknown,
  label: string
): string {
  const result = text(value)

  if (!result) {
    throw new ValidationError(
      `${label} is required.`
    )
  }

  return result
}

function envValue(
  ...names: string[]
): string {
  for (const name of names) {
    const value =
      process.env[name]?.trim()

    if (value) {
      return value
    }
  }

  return ''
}

function ids() {
  return {
    students:
      envValue(
        'SCHOOL_APPWRITE_STUDENTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID'
      ) ||
      '6a468f3d0024a2d9e1f5',

    attendance:
      envValue(
        'SCHOOL_APPWRITE_ATTENDANCE_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID'
      ) ||
      '6a4696a700063845d75a',

    studentSubjects:
      envValue(
        'SCHOOL_APPWRITE_STUDENT_SUBJECTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_STUDENT_SUBJECTS_COLLECTION_ID'
      ) ||
      '6a469647000e93fdffb3',

    marks:
      envValue(
        'SCHOOL_APPWRITE_MARKS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID'
      ) ||
      '6a469acd000752038ff4',

    fees:
      envValue(
        'SCHOOL_APPWRITE_FEES_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID'
      ) ||
      '6a469b760021c28997c9',

    discipline:
      envValue(
        'SCHOOL_APPWRITE_DISCIPLINE_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_DISCIPLINE_COLLECTION_ID'
      ) ||
      '6a469ede000266c9242b',

    hostelStudents:
      envValue(
        'SCHOOL_APPWRITE_HOSTEL_STUDENTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_HOSTEL_STUDENTS_COLLECTION_ID'
      ) ||
      '6a469f770004125f7662',

    studentTransport:
      envValue(
        'SCHOOL_APPWRITE_STUDENT_TRANSPORT_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_STUDENT_TRANSPORT_COLLECTION_ID'
      ) ||
      '6a46a09600152018c9c1',
  }
}

function errorCode(
  error: unknown
): number | undefined {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return undefined
  }

  return (
    error as AppwriteErrorLike
  ).code
}

function errorMessage(
  error: unknown
): string {
  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const message = (
      error as AppwriteErrorLike
    ).message

    if (
      typeof message === 'string'
    ) {
      return message
    }
  }

  return error instanceof Error
    ? error.message
    : 'Unexpected student operation failure.'
}

function bearerJwt(
  request: Request
): string {
  const authorization =
    request.headers.get(
      'authorization'
    )

  if (
    !authorization
      ?.toLowerCase()
      .startsWith('bearer ')
  ) {
    throw new AuthenticationError(
      'A valid Appwrite JWT is required.'
    )
  }

  const jwt =
    authorization
      .slice(7)
      .trim()

  if (!jwt) {
    throw new AuthenticationError(
      'A valid Appwrite JWT is required.'
    )
  }

  return jwt
}

async function requestBody(
  request: Request
): Promise<MutationBody> {
  try {
    return (
      await request.json()
    ) as MutationBody
  } catch {
    throw new ValidationError(
      'A valid JSON request body is required.'
    )
  }
}

async function assertAdmin(
  request: Request
): Promise<void> {
  const account =
    createJwtAppwriteAccount(
      bearerJwt(request)
    )

  let caller

  try {
    caller =
      await account.get()
  } catch {
    throw new AuthenticationError(
      'Your session is invalid or has expired.'
    )
  }

  const labels =
    Array.isArray(caller.labels)
      ? caller.labels.map(
          (label) =>
            String(label)
              .trim()
              .toLowerCase()
        )
      : []

  if (
    !labels.includes('admin')
  ) {
    throw new AuthorizationError(
      'Administrator access is required.'
    )
  }

  const {
    configuration,
    tablesDB,
  } =
    createAdminAppwriteServices()

  const result =
    await tablesDB.listRows({
      databaseId:
        configuration.databaseId,
      tableId:
        configuration.tables.admins,
      queries: [
        Query.equal(
          'userId',
          [caller.$id]
        ),
        Query.limit(2),
      ],
      total: true,
      ttl: 0,
    })

  if (
    result.rows.length !== 1
  ) {
    throw new AuthorizationError(
      'Your administrator profile is missing or ambiguous.'
    )
  }

  const status =
    text(
      (
        result.rows[0] as unknown as RowData
      ).Status
    ).toLowerCase()

  if (
    BLOCKED_ADMIN_STATUSES.has(
      status
    )
  ) {
    throw new AuthorizationError(
      `Your administrator account is ${status}.`
    )
  }
}

function validateEnrollmentDate(
  value: unknown
): string {
  const enrollmentDate =
    requiredText(
      value,
      'Enrollment date'
    )

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      enrollmentDate
    )
  ) {
    throw new ValidationError(
      'Enrollment date must use YYYY-MM-DD.'
    )
  }

  const parsed =
    new Date(
      `${enrollmentDate}T00:00:00.000Z`
    )

  if (
    Number.isNaN(
      parsed.getTime()
    ) ||
    parsed
      .toISOString()
      .slice(0, 10) !==
      enrollmentDate
  ) {
    throw new ValidationError(
      'Enrollment date is invalid.'
    )
  }

  const tomorrow =
    new Date()

  tomorrow.setUTCDate(
    tomorrow.getUTCDate() + 1
  )

  if (
    parsed.getTime() >
    tomorrow.getTime()
  ) {
    throw new ValidationError(
      'Enrollment date cannot be in the future.'
    )
  }

  return parsed
    .toISOString()
}

function studentData(
  input: MutationBody
) {
  const level =
    requiredText(
      input.level,
      'Primary stage'
    )

  const form =
    requiredText(
      input.form,
      'Grade'
    )

  const enrollmentDate =
    validateEnrollmentDate(
      input.enrollmentDate
    )

  const status =
    requiredText(
      input.status,
      'Status'
    ).toLowerCase()

  if (
    !PRIMARY_STAGES.has(level)
  ) {
    throw new ValidationError(
      'Primary stage is invalid.'
    )
  }

  if (
    !PRIMARY_GRADES.has(form)
  ) {
    throw new ValidationError(
      'Grade is invalid. Select ECD A, ECD B or Grade 1 to Grade 7.'
    )
  }

  const expectedStage =
    primaryStageForGrade(form)

  if (
    !expectedStage ||
    expectedStage !== level
  ) {
    throw new ValidationError(
      `${form} belongs to ${expectedStage || 'a different primary stage'}.`
    )
  }

  if (
    !STUDENT_STATUSES.has(
      status
    )
  ) {
    throw new ValidationError(
      'Status must be active, inactive, suspended or graduated.'
    )
  }

  return {
    level,
    form,
    enrollmentDate,
    status,
  }
}

async function requireStudent(
  studentId: string
): Promise<RowData> {
  const {
    configuration,
    tablesDB,
  } =
    createAdminAppwriteServices()

  try {
    return (
      await tablesDB.getRow({
        databaseId:
          configuration.databaseId,
        tableId:
          ids().students,
        rowId:
          studentId,
      })
    ) as unknown as RowData
  } catch (error) {
    if (
      errorCode(error) === 404
    ) {
      throw new NotFoundError(
        'Student was not found.'
      )
    }

    throw error
  }
}

async function referenceCounts(
  studentId: string
) {
  const {
    configuration,
    tablesDB,
  } =
    createAdminAppwriteServices()

  const tableIds = ids()

  const definitions = [
    [
      'attendance records',
      tableIds.attendance,
    ],
    [
      'subject assignments',
      tableIds.studentSubjects,
    ],
    [
      'mark records',
      tableIds.marks,
    ],
    [
      'fee records',
      tableIds.fees,
    ],
    [
      'discipline records',
      tableIds.discipline,
    ],
    [
      'hostel assignments',
      tableIds.hostelStudents,
    ],
    [
      'transport assignments',
      tableIds.studentTransport,
    ],
  ] as const

  const results =
    await Promise.all(
      definitions.map(
        async ([
          name,
          tableId,
        ]) => {
          const response =
            await tablesDB.listRows({
              databaseId:
                configuration.databaseId,
              tableId,
              queries: [
                Query.equal(
                  'studentId',
                  [studentId]
                ),
                Query.limit(1),
              ],
              total: true,
              ttl: 0,
            })

          return {
            name,
            count:
              response.total,
          }
        }
      )
    )

  return results.filter(
    (item) =>
      item.count > 0
  )
}

function respondToError(
  error: unknown
): NextResponse {
  if (
    error instanceof
    ValidationError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 400,
      }
    )
  }

  if (
    error instanceof
    AuthenticationError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 401,
      }
    )
  }

  if (
    error instanceof
    AuthorizationError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 403,
      }
    )
  }

  if (
    error instanceof
    NotFoundError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 404,
      }
    )
  }

  if (
    error instanceof
    ConflictError
  ) {
    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 409,
      }
    )
  }

  console.error(
    'Secure student operation failed:',
    error
  )

  return NextResponse.json(
    {
      error:
        'The student operation could not be completed.',
      details:
        process.env.NODE_ENV ===
        'development'
          ? errorMessage(error)
          : undefined,
    },
    {
      status: 500,
    }
  )
}

export async function PATCH(
  request: Request
): Promise<NextResponse> {
  try {
    await assertAdmin(request)

    const input =
      await requestBody(request)

    const studentId =
      requiredText(
        input.studentId,
        'Student ID'
      )

    const data =
      studentData(input)

    await requireStudent(
      studentId
    )

    const {
      configuration,
      tablesDB,
    } =
      createAdminAppwriteServices()

    await tablesDB.updateRow({
      databaseId:
        configuration.databaseId,
      tableId:
        ids().students,
      rowId:
        studentId,
      data: {
        Level:
          data.level,
        Form:
          data.form,
        EnrollmentDate:
          data.enrollmentDate,
        Status:
          data.status,
      },
    })

    return NextResponse.json({
      studentId,
      message:
        'Student updated successfully.',
    })
  } catch (error) {
    return respondToError(
      error
    )
  }
}

export async function DELETE(
  request: Request
): Promise<NextResponse> {
  try {
    await assertAdmin(request)

    const input =
      await requestBody(request)

    const studentId =
      requiredText(
        input.studentId,
        'Student ID'
      )

    await requireStudent(
      studentId
    )

    const references =
      await referenceCounts(
        studentId
      )

    if (
      references.length > 0
    ) {
      const summary =
        references
          .map(
            (item) =>
              `${item.count} ${item.name}`
          )
          .join(', ')

      throw new ConflictError(
        `This student record cannot be removed because it is referenced by ${summary}. Remove or reassign those records first.`
      )
    }

    const {
      configuration,
      tablesDB,
    } =
      createAdminAppwriteServices()

    await tablesDB.deleteRow({
      databaseId:
        configuration.databaseId,
      tableId:
        ids().students,
      rowId:
        studentId,
    })

    return NextResponse.json({
      studentId,
      message:
        'Student role record removed successfully. The linked user profile and Auth account were retained.',
    })
  } catch (error) {
    return respondToError(
      error
    )
  }
}
