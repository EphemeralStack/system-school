'use client'

import { account } from '@/lib/appwrite/config'

export type ProvisionableRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'applicant'

export interface ProvisionUserInput {
  role: ProvisionableRole
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatar?: string
  temporaryPassword?: string
  status?: string

  position?: string
  assignedArea?: string

  departmentId?: string
  hireDate?: string
  qualification?: string
  subjectSpecialization?: string

  classId?: string
  level?: string
  form?: string
  enrollmentDate?: string

  levelOrFormApplied?: string
}

export interface ProvisionUserResult {
  userId: string
  role: ProvisionableRole
  email: string
  temporaryPassword: string
  mustChangePassword: true
}

interface ErrorResponse {
  error?: string
  details?: string
}

export async function provisionUserAsAdmin(
  input: ProvisionUserInput
): Promise<ProvisionUserResult> {
  const jwtResponse =
    await account.createJWT()

  const response = await fetch(
    '/api/admin/users',
    {
      method: 'POST',
      headers: {
        Authorization:
          `Bearer ${jwtResponse.jwt}`,
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(input),
    }
  )

  const payload =
    (await response.json()) as
      | ProvisionUserResult
      | ErrorResponse

  if (!response.ok) {
    const errorPayload =
      payload as ErrorResponse

    throw new Error(
      errorPayload.error ||
        errorPayload.details ||
        'Unable to create the user account.'
    )
  }

  return payload as ProvisionUserResult
}
