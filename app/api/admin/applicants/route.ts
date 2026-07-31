import {
  Query,
} from 'node-appwrite'
import {
  NextResponse,
} from 'next/server'

import {
  createAdminAppwriteServices,
  createJwtAppwriteAccount,
} from '@/lib/appwrite/server'
import { isZimbabwePrimaryGrade } from '@/lib/school/primary-school-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ApplicantMutationRequest {
  applicantId?: unknown
  levelOrFormApplied?: unknown
  status?: unknown
}

interface AppwriteErrorLike {
  code?: number
  type?: string
  message?: string
}

type UnknownRow =
  Record<string, unknown>

const VALID_STATUSES =
  new Set([
    'pending',
    'accepted',
    'rejected',
  ])

const BLOCKED_ADMIN_STATUSES =
  new Set([
    'inactive',
    'suspended',
    'withdrawn',
    'resigned',
    'rejected',
    'retired',
    'on_leave',
  ])

class RequestValidationError
  extends Error {}

class AuthenticationError
  extends Error {}

class AuthorizationError
  extends Error {}

class ResourceNotFoundError
  extends Error {}

function text(
  value: unknown
): string {
  return typeof value ===
    'string'
    ? value.trim()
    : ''
}

function requiredText(
  value: unknown,
  label: string
): string {
  const result =
    text(value)

  if (!result) {
    throw new RequestValidationError(
      `${label} is required.`
    )
  }

  return result
}

function normalizePrimaryGrade(
  value: unknown
): string {
  const grade =
    requiredText(
      value,
      'Grade applied for'
    )

  if (
    !isZimbabwePrimaryGrade(
      grade
    )
  ) {
    throw new RequestValidationError(
      'Grade must be ECD A, ECD B or Grade 1 to Grade 7.'
    )
  }

  return grade
}

function normalizeStatus(
  value: unknown
): string {
  const status =
    requiredText(
      value,
      'Applicant status'
    ).toLowerCase()

  if (
    !VALID_STATUSES.has(
      status
    )
  ) {
    throw new RequestValidationError(
      'Applicant status is invalid.'
    )
  }

  return status
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

async function readJson(
  request: Request
): Promise<
  ApplicantMutationRequest
> {
  try {
    return (
      await request.json()
    ) as ApplicantMutationRequest
  } catch {
    throw new RequestValidationError(
      'A valid JSON request body is required.'
    )
  }
}

async function assertActiveAdministrator(
  request: Request
): Promise<string> {
  const jwt =
    getBearerJwt(request)

  const account =
    createJwtAppwriteAccount(jwt)

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
    Array.isArray(
      caller.labels
    )
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

  if (
    response.rows.length !== 1
  ) {
    throw new AuthorizationError(
      'Your administrator profile is missing or ambiguous.'
    )
  }

  const administrator =
    response.rows[0] as unknown as
      UnknownRow

  const status =
    text(
      administrator.Status
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

  return caller.$id
}

function getErrorCode(
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

function getErrorMessage(
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
    : 'Unexpected applicant operation failure.'
}

function isNotFound(
  error: unknown
): boolean {
  return getErrorCode(error) === 404
}

async function getRequiredRow(
  databaseId: string,
  tableId: string,
  rowId: string,
  label: string
): Promise<UnknownRow> {
  const {
    tablesDB,
  } =
    createAdminAppwriteServices()

  try {
    const row =
      await tablesDB.getRow({
        databaseId,
        tableId,
        rowId,
      })

    return row as unknown as
      UnknownRow
  } catch (error) {
    if (isNotFound(error)) {
      throw new ResourceNotFoundError(
        `${label} was not found.`
      )
    }

    throw error
  }
}

function permissionsFromRow(
  row: UnknownRow
): string[] {
  const permissions =
    row.$permissions

  return Array.isArray(
    permissions
  )
    ? permissions.map(String)
    : []
}

function applicantDataFromRow(
  row: UnknownRow
): Record<string, unknown> {
  return {
    userId:
      requiredText(
        row.userId,
        'Applicant user ID'
      ),
    ApplicationNo:
      text(
        row.ApplicationNo
      ),
    LevelOrFormApplied:
      text(
        row.LevelOrFormApplied
      ),
    Status:
      text(
        row.Status
      ) || 'pending',
  }
}

function userDataFromRow(
  row: UnknownRow
): Record<string, unknown> {
  const data:
    Record<string, unknown> = {
      FirstName:
        text(
          row.FirstName
        ),
      LastName:
        text(
          row.LastName
        ),
      Email:
        requiredText(
          row.Email,
          'User email'
        ),
      Phone:
        text(
          row.Phone
        ),
      Role:
        text(
          row.Role
        ) || 'applicant',
    }

  const avatar =
    text(row.avatar)

  if (avatar) {
    data.avatar = avatar
  }

  return data
}

async function restoreRow(
  databaseId: string,
  tableId: string,
  rowId: string,
  data: Record<string, unknown>,
  permissions: string[]
): Promise<string | null> {
  const {
    tablesDB,
  } =
    createAdminAppwriteServices()

  try {
    await tablesDB.createRow({
      databaseId,
      tableId,
      rowId,
      data,
      permissions,
    })

    return null
  } catch (error) {
    return getErrorMessage(
      error
    )
  }
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
      ResourceNotFoundError
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

  console.error(
    'Secure applicant operation failed:',
    error
  )

  return NextResponse.json(
    {
      error:
        'The applicant operation could not be completed.',
      details:
        process.env.NODE_ENV ===
        'development'
          ? getErrorMessage(
              error
            )
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
    await assertActiveAdministrator(
      request
    )

    const input =
      await readJson(request)

    const applicantId =
      requiredText(
        input.applicantId,
        'Applicant ID'
      )

    const levelOrFormApplied =
      normalizePrimaryGrade(
        input.levelOrFormApplied
      )

    const status =
      normalizeStatus(
        input.status
      )

    const {
      configuration,
      tablesDB,
    } =
      createAdminAppwriteServices()

    const applicant =
      await getRequiredRow(
        configuration.databaseId,
        configuration.tables.applicants,
        applicantId,
        'Applicant'
      )

    const userId =
      requiredText(
        applicant.userId,
        'Applicant user ID'
      )

    await tablesDB.updateRow({
      databaseId:
        configuration.databaseId,
      tableId:
        configuration.tables.applicants,
      rowId:
        applicantId,
      data: {
        LevelOrFormApplied:
          levelOrFormApplied,
        Status:
          status,
      },
    })

    return NextResponse.json(
      {
        applicantId,
        userId,
        message:
          'Applicant updated successfully.',
      }
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(
  request: Request
): Promise<NextResponse> {
  let applicantDeleted = false
  let profileDeleted = false
  let authUserDeleted = false

  let databaseId = ''
  let applicantsTableId = ''
  let usersTableId = ''

  let applicantId = ''
  let userId = ''

  let applicantData:
    Record<string, unknown> | null = null

  let userData:
    Record<string, unknown> | null = null

  let applicantPermissions:
    string[] = []

  let userPermissions:
    string[] = []

  try {
    await assertActiveAdministrator(
      request
    )

    const input =
      await readJson(request)

    applicantId =
      requiredText(
        input.applicantId,
        'Applicant ID'
      )

    const services =
      createAdminAppwriteServices()

    const {
      configuration,
      tablesDB,
      users,
    } = services

    databaseId =
      configuration.databaseId

    applicantsTableId =
      configuration.tables.applicants

    usersTableId =
      configuration.tables.users

    const applicant =
      await getRequiredRow(
        databaseId,
        applicantsTableId,
        applicantId,
        'Applicant'
      )

    userId =
      requiredText(
        applicant.userId,
        'Applicant user ID'
      )

    const profile =
      await getRequiredRow(
        databaseId,
        usersTableId,
        userId,
        'Applicant user profile'
      )

    const profileRole =
      text(
        profile.Role
      ).toLowerCase()

    if (
      profileRole !==
      'applicant'
    ) {
      throw new RequestValidationError(
        'The linked user profile is not an applicant account.'
      )
    }

    let authUser

    try {
      authUser =
        await users.get({
          userId,
        })
    } catch (error) {
      if (isNotFound(error)) {
        throw new ResourceNotFoundError(
          'The linked Appwrite Auth account was not found.'
        )
      }

      throw error
    }

    const authRoles =
      Array.isArray(
        authUser.labels
      )
        ? authUser.labels
            .map(
              (label) =>
                String(label)
                  .trim()
                  .toLowerCase()
            )
            .filter(
              (label) =>
                [
                  'admin',
                  'teacher',
                  'student',
                  'applicant',
                ].includes(
                  label
                )
            )
        : []

    if (
      authRoles.length !== 1 ||
      authRoles[0] !==
        'applicant'
    ) {
      throw new RequestValidationError(
        'The linked Auth account does not have exactly one applicant role label.'
      )
    }

    applicantData =
      applicantDataFromRow(
        applicant
      )

    userData =
      userDataFromRow(
        profile
      )

    applicantPermissions =
      permissionsFromRow(
        applicant
      )

    userPermissions =
      permissionsFromRow(
        profile
      )

    await tablesDB.deleteRow({
      databaseId,
      tableId:
        applicantsTableId,
      rowId:
        applicantId,
    })

    applicantDeleted = true

    await tablesDB.deleteRow({
      databaseId,
      tableId:
        usersTableId,
      rowId:
        userId,
    })

    profileDeleted = true

    await users.delete({
      userId,
    })

    authUserDeleted = true

    return NextResponse.json(
      {
        applicantId,
        userId,
        message:
          'Applicant account deleted successfully.',
      }
    )
  } catch (error) {
    const rollbackWarnings:
      string[] = []

    if (
      !authUserDeleted &&
      profileDeleted &&
      userData &&
      databaseId &&
      usersTableId &&
      userId
    ) {
      const warning =
        await restoreRow(
          databaseId,
          usersTableId,
          userId,
          userData,
          userPermissions
        )

      if (warning) {
        rollbackWarnings.push(
          `User profile rollback failed: ${warning}`
        )
      } else {
        profileDeleted = false
      }
    }

    if (
      !authUserDeleted &&
      applicantDeleted &&
      applicantData &&
      databaseId &&
      applicantsTableId &&
      applicantId
    ) {
      const warning =
        await restoreRow(
          databaseId,
          applicantsTableId,
          applicantId,
          applicantData,
          applicantPermissions
        )

      if (warning) {
        rollbackWarnings.push(
          `Applicant row rollback failed: ${warning}`
        )
      } else {
        applicantDeleted = false
      }
    }

    if (
      rollbackWarnings.length > 0
    ) {
      console.error(
        'Applicant deletion rollback warnings:',
        rollbackWarnings
      )
    }

    return errorResponse(error)
  }
}
