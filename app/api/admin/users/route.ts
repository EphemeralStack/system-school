import crypto from 'node:crypto'

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
import {
  isZimbabwePrimaryGrade,
  isZimbabwePrimaryStage,
  isZimbabweTeacherQualification,
} from '@/lib/school/primary-school-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ProvisionableRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'applicant'

interface ProvisionUserRequest {
  role?: unknown
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  phone?: unknown
  avatar?: unknown
  temporaryPassword?: unknown
  status?: unknown

  position?: unknown
  assignedArea?: unknown

  departmentId?: unknown
  hireDate?: unknown
  qualification?: unknown
  subjectSpecialization?: unknown

  classId?: unknown
  level?: unknown
  form?: unknown
  enrollmentDate?: unknown

  levelOrFormApplied?: unknown
}

interface AppwriteErrorLike {
  code?: number
  type?: string
  message?: string
}

const VALID_ROLES = new Set<ProvisionableRole>([
  'admin',
  'teacher',
  'student',
  'applicant',
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

function text(
  value: unknown
): string {
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
    throw new RequestValidationError(
      `${label} is required.`
    )
  }

  return result
}

function optionalText(
  value: unknown
): string {
  return text(value)
}


function normalizePrimaryGrade(
  value: unknown,
  label = 'Grade'
): string {
  const grade =
    requiredText(
      value,
      label
    )

  if (
    !isZimbabwePrimaryGrade(
      grade
    )
  ) {
    throw new RequestValidationError(
      `${label} must be ECD A, ECD B or Grade 1 to Grade 7.`
    )
  }

  return grade
}

function normalizePrimaryStage(
  value: unknown
): string {
  const stage =
    requiredText(
      value,
      'Primary stage'
    )

  if (
    !isZimbabwePrimaryStage(
      stage
    )
  ) {
    throw new RequestValidationError(
      'Primary stage must be Infant Level or Junior Level.'
    )
  }

  return stage
}

function normalizeTeacherQualification(
  value: unknown
): string {
  const qualification =
    requiredText(
      value,
      'Qualification'
    )

  if (
    !isZimbabweTeacherQualification(
      qualification
    )
  ) {
    throw new RequestValidationError(
      'Select a recognised teaching qualification from the list.'
    )
  }

  return qualification
}

function getDepartmentsTableId(): string {
  const tableId =
    process.env
      .APPWRITE_DEPARTMENTS_TABLE_ID
      ?.trim() ||
    process.env
      .NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID
      ?.trim()

  if (!tableId) {
    throw new Error(
      'Missing departments table environment variable.'
    )
  }

  return tableId
}

function addOptionalString(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  const normalized = optionalText(value)

  if (normalized) {
    target[key] = normalized
  }
}

function normalizeEmail(
  value: unknown
): string {
  const email = requiredText(
    value,
    'Email address'
  ).toLowerCase()

  const basicEmailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!basicEmailPattern.test(email)) {
    throw new RequestValidationError(
      'Enter a valid email address.'
    )
  }

  return email
}

function normalizeRole(
  value: unknown
): ProvisionableRole {
  const role =
    text(value).toLowerCase() as
      ProvisionableRole

  if (!VALID_ROLES.has(role)) {
    throw new RequestValidationError(
      'A valid user role is required.'
    )
  }

  return role
}

function generateTemporaryPassword(
  length = 24
): string {
  const uppercase =
    'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase =
    'abcdefghijkmnopqrstuvwxyz'
  const digits =
    '23456789'
  const symbols =
    '!@#$%^&*_-+='

  const all =
    uppercase +
    lowercase +
    digits +
    symbols

  const randomCharacter = (
    characters: string
  ): string => {
    return characters[
      crypto.randomInt(
        0,
        characters.length
      )
    ]
  }

  const characters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(digits),
    randomCharacter(symbols),
  ]

  while (characters.length < length) {
    characters.push(
      randomCharacter(all)
    )
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      crypto.randomInt(
        0,
        index + 1
      )

    const current =
      characters[index]

    characters[index] =
      characters[swapIndex]

    characters[swapIndex] =
      current
  }

  return characters.join('')
}

function normalizeTemporaryPassword(
  value: unknown
): string {
  const supplied =
    optionalText(value)

  if (!supplied) {
    return generateTemporaryPassword()
  }

  if (supplied.length < 12) {
    throw new RequestValidationError(
      'Temporary passwords must contain at least 12 characters.'
    )
  }

  if (supplied.length > 256) {
    throw new RequestValidationError(
      'Temporary password is too long.'
    )
  }

  return supplied
}

function createApplicationNumber():
  string {
  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase()

  const random =
    crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()

  return `APP-${timestamp}-${random}`
}

function ownerAndAdminPermissions(
  userId: string
): string[] {
  const owner =
    Role.user(userId)

  const administrators =
    Role.label('admin')

  return [
    Permission.read(owner),
    Permission.update(owner),

    Permission.read(administrators),
    Permission.update(administrators),
    Permission.delete(administrators),
  ]
}

function getBearerJwt(
  request: Request
): string {
  const authorization =
    request.headers.get(
      'authorization'
    )

  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith('bearer ')
  ) {
    throw new AuthenticationError(
      'A valid Appwrite JWT is required.'
    )
  }

  const jwt =
    authorization.slice(7).trim()

  if (!jwt) {
    throw new AuthenticationError(
      'A valid Appwrite JWT is required.'
    )
  }

  return jwt
}

async function assertActiveAdministrator(
  request: Request
): Promise<{
  administratorId: string
}> {
  const jwt =
    getBearerJwt(request)

  const account =
    createJwtAppwriteAccount(jwt)

  let caller

  try {
    caller = await account.get()
  } catch {
    throw new AuthenticationError(
      'Your session is invalid or has expired.'
    )
  }

  const labels = Array.isArray(
    caller.labels
  )
    ? caller.labels.map((label) =>
        String(label).toLowerCase()
      )
    : []

  if (!labels.includes('admin')) {
    throw new AuthorizationError(
      'Administrator access is required.'
    )
  }

  const {
    configuration,
    tablesDB,
  } = createAdminAppwriteServices()

  const response =
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

  if (response.rows.length !== 1) {
    throw new AuthorizationError(
      'Your administrator profile is missing or ambiguous.'
    )
  }

  const status =
    text(
      response.rows[0].Status
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

  return {
    administratorId:
      caller.$id,
  }
}

function roleTableData(
  role: ProvisionableRole,
  input: ProvisionUserRequest,
  userId: string
): Record<string, unknown> {
  const status =
    optionalText(input.status) ||
    (
      role === 'applicant'
        ? 'pending'
        : 'active'
    )

  switch (role) {
    case 'admin': {
      const adminData:
        Record<string, unknown> = {
          userId,
          Position: requiredText(
            input.position,
            'Position'
          ),
          Status: status,
          AssignedArea: requiredText(
            input.assignedArea,
            'Assigned area'
          ),
        }

      addOptionalString(
        adminData,
        'avatar',
        input.avatar
      )

      return adminData
    }

    case 'teacher':
      return {
        userId,
        departmentId:
          requiredText(
            input.departmentId,
            'Department'
          ),
        HireDate:
          optionalText(
            input.hireDate
          ) ||
          new Date()
            .toISOString()
            .slice(0, 10),
        Qualification:
          normalizeTeacherQualification(
            input.qualification
          ),
        SubjectSpecialization:
          requiredText(
            input.subjectSpecialization,
            'Subject specialization'
          ),
        Status: status,
      }

    case 'student':
      return {
        userId,
        classId:
          optionalText(
            input.classId
          ),
        Level:
          normalizePrimaryStage(
            input.level
          ),
        Form:
          normalizePrimaryGrade(
            input.form
          ),
        EnrollmentDate:
          optionalText(
            input.enrollmentDate
          ) ||
          new Date()
            .toISOString()
            .slice(0, 10),
        Status: status,
      }

    case 'applicant':
      return {
        userId,
        ApplicationNo:
          createApplicationNumber(),
        LevelOrFormApplied:
          normalizePrimaryGrade(
            input.levelOrFormApplied,
            'Grade applied for'
          ),
        Status: status,
      }
  }
}

function roleTableId(
  role: ProvisionableRole,
  tables: {
    admins: string
    applicants: string
    students: string
    teachers: string
  }
): string {
  switch (role) {
    case 'admin':
      return tables.admins
    case 'teacher':
      return tables.teachers
    case 'student':
      return tables.students
    case 'applicant':
      return tables.applicants
  }
}

async function deleteRowSilently(
  databaseId: string,
  tableId: string,
  rowId: string
): Promise<string | null> {
  try {
    const { tablesDB } =
      createAdminAppwriteServices()

    await tablesDB.deleteRow({
      databaseId,
      tableId,
      rowId,
    })

    return null
  } catch (error) {
    return error instanceof Error
      ? error.message
      : String(error)
  }
}

async function deleteAuthUserSilently(
  userId: string
): Promise<string | null> {
  try {
    const { users } =
      createAdminAppwriteServices()

    await users.delete({
      userId,
    })

    return null
  } catch (error) {
    return error instanceof Error
      ? error.message
      : String(error)
  }
}


async function validateTeacherDepartmentReference(
  tablesDB:
    ReturnType<
      typeof createAdminAppwriteServices
    >['tablesDB'],
  databaseId: string,
  departmentsTableId: string,
  input: ProvisionUserRequest
): Promise<void> {
  const departmentId =
    requiredText(
      input.departmentId,
      'Department'
    )

  const specialization =
    requiredText(
      input.subjectSpecialization,
      'Subject specialization'
    )

  let department

  try {
    department =
      await tablesDB.getRow({
        databaseId,
        tableId:
          departmentsTableId,
        rowId:
          departmentId,
      })
  } catch (error) {
    if (
      appwriteErrorCode(
        error
      ) === 404
    ) {
      throw new RequestValidationError(
        'The selected department does not exist.'
      )
    }

    throw error
  }

  const departmentName =
    requiredText(
      (
        department as unknown as
          Record<string, unknown>
      ).Name,
      'Department name'
    )

  if (
    departmentName !==
    specialization
  ) {
    throw new RequestValidationError(
      'Subject specialization must match the selected department.'
    )
  }
}

class RequestValidationError
  extends Error {}

class AuthenticationError
  extends Error {}

class AuthorizationError
  extends Error {}

function appwriteErrorCode(
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

function appwriteErrorMessage(
  error: unknown
): string {
  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const candidate =
      error as AppwriteErrorLike

    if (
      typeof candidate.message ===
      'string'
    ) {
      return candidate.message
    }
  }

  return error instanceof Error
    ? error.message
    : 'Unexpected provisioning failure.'
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof
      RequestValidationError
  ) {
    return NextResponse.json(
      {
        error: error.message,
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
        error: error.message,
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
        error: error.message,
      },
      {
        status: 403,
      }
    )
  }

  const code =
    appwriteErrorCode(error)

  if (code === 409) {
    return NextResponse.json(
      {
        error:
          'A user with this email address or ID already exists.',
      },
      {
        status: 409,
      }
    )
  }

  console.error(
    'Secure user provisioning failed:',
    error
  )

  return NextResponse.json(
    {
      error:
        'The account could not be created.',
      details:
        process.env.NODE_ENV ===
        'development'
          ? appwriteErrorMessage(
              error
            )
          : undefined,
    },
    {
      status: 500,
    }
  )
}

export async function POST(
  request: Request
): Promise<NextResponse> {
  let createdAuthUserId:
    | string
    | null = null

  let createdProfileRow = false
  let createdRoleRow = false

  let databaseId = ''
  let usersTableId = ''
  let roleTable = ''

  try {
    await assertActiveAdministrator(
      request
    )

    const input =
      (await request.json()) as
        ProvisionUserRequest

    const role =
      normalizeRole(input.role)

    const firstName =
      requiredText(
        input.firstName,
        'First name'
      )

    const lastName =
      requiredText(
        input.lastName,
        'Last name'
      )

    const email =
      normalizeEmail(input.email)

    const phone =
      optionalText(input.phone)

    const avatar =
      optionalText(input.avatar)

    const temporaryPassword =
      normalizeTemporaryPassword(
        input.temporaryPassword
      )

    const userId = ID.unique()
    const fullName =
      `${firstName} ${lastName}`

    const services =
      createAdminAppwriteServices()

    const {
      configuration,
      users,
      tablesDB,
    } = services

    databaseId =
      configuration.databaseId

    usersTableId =
      configuration.tables.users

    roleTable =
      roleTableId(
        role,
        configuration.tables
      )

    if (role === 'teacher') {
      await validateTeacherDepartmentReference(
        tablesDB,
        databaseId,
        getDepartmentsTableId(),
        input
      )
    }

    const roleData =
      roleTableData(
        role,
        input,
        userId
      )

    const permissions =
      ownerAndAdminPermissions(
        userId
      )

    await users.create({
      userId,
      email,
      password:
        temporaryPassword,
      name: fullName,
    })

    createdAuthUserId = userId

    await users.updateLabels({
      userId,
      labels: [role],
    })

    const preferences:
      Record<string, unknown> = {
        Role: role,
        FirstName: firstName,
        LastName: lastName,
        phone,
        mustChangePassword: true,
      }

    addOptionalString(
      preferences,
      'avatar',
      avatar
    )

    await users.updatePrefs({
      userId,
      prefs: preferences,
    })

    const userProfileData:
      Record<string, unknown> = {
        FirstName:
          firstName,
        LastName:
          lastName,
        Email: email,
        Phone: phone,
        Role: role,
      }

    addOptionalString(
      userProfileData,
      'avatar',
      avatar
    )

    await tablesDB.createRow({
      databaseId,
      tableId:
        usersTableId,
      rowId: userId,
      data: userProfileData,
      permissions,
    })

    createdProfileRow = true

    await tablesDB.createRow({
      databaseId,
      tableId:
        roleTable,
      rowId: userId,
      data: roleData,
      permissions,
    })

    createdRoleRow = true

    return NextResponse.json(
      {
        userId,
        role,
        email,
        temporaryPassword,
        mustChangePassword: true,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    const rollbackWarnings:
      string[] = []

    if (
      createdRoleRow &&
      createdAuthUserId &&
      databaseId &&
      roleTable
    ) {
      const warning =
        await deleteRowSilently(
          databaseId,
          roleTable,
          createdAuthUserId
        )

      if (warning) {
        rollbackWarnings.push(
          `Role row rollback failed: ${warning}`
        )
      }
    }

    if (
      createdProfileRow &&
      createdAuthUserId &&
      databaseId &&
      usersTableId
    ) {
      const warning =
        await deleteRowSilently(
          databaseId,
          usersTableId,
          createdAuthUserId
        )

      if (warning) {
        rollbackWarnings.push(
          `User profile rollback failed: ${warning}`
        )
      }
    }

    if (createdAuthUserId) {
      const warning =
        await deleteAuthUserSilently(
          createdAuthUserId
        )

      if (warning) {
        rollbackWarnings.push(
          `Auth rollback failed: ${warning}`
        )
      }
    }

    if (
      rollbackWarnings.length > 0
    ) {
      console.error(
        'Provisioning rollback warnings:',
        rollbackWarnings
      )
    }

    return errorResponse(error)
  }
}
