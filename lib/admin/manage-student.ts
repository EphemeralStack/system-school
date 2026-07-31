import {
  account,
} from '@/lib/appwrite/config'

export type StudentStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'graduated'

export interface UpdateStudentInput {
  studentId: string
  level: string
  form: string
  enrollmentDate: string
  status: StudentStatus
}

interface RemoveStudentInput {
  studentId: string
}

type StudentMutationBody =
  | UpdateStudentInput
  | RemoveStudentInput

export interface StudentMutationResponse {
  studentId: string
  message: string
}

interface ErrorResponse {
  error?: string
  details?: string
}

async function mutateStudent(
  method:
    | 'PATCH'
    | 'DELETE',
  body:
    StudentMutationBody
): Promise<StudentMutationResponse> {
  const jwt =
    await account.createJWT()

  const response =
    await fetch(
      '/api/admin/students',
      {
        method,
        headers: {
          Authorization:
            `Bearer ${jwt.jwt}`,
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify(body),
      }
    )

  const contentType =
    response.headers.get(
      'content-type'
    ) || ''

  const payload =
    contentType.includes(
      'application/json'
    )
      ? (
          await response.json()
        ) as
          | StudentMutationResponse
          | ErrorResponse
      : {
          error:
            'The server returned an invalid response.',
        }

  if (
    !response.ok
  ) {
    const errorPayload =
      payload as ErrorResponse

    throw new Error(
      errorPayload.error ||
        errorPayload.details ||
        'Unable to complete the student operation.'
    )
  }

  return (
    payload as StudentMutationResponse
  )
}

export function updateStudentAsAdmin(
  input: UpdateStudentInput
): Promise<StudentMutationResponse> {
  return mutateStudent(
    'PATCH',
    input
  )
}

export function removeStudentAsAdmin(
  studentId: string
): Promise<StudentMutationResponse> {
  return mutateStudent(
    'DELETE',
    {
      studentId,
    }
  )
}
