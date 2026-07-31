import { account } from '@/lib/appwrite/config'

export interface ClassMutationInput {
  name: string
  levelOrForm: string
  room: string
  teacherId?: string
}

export interface UpdateClassInput
  extends ClassMutationInput {
  classId: string
}

interface DeleteClassInput {
  classId: string
}

type ClassMutationBody =
  | ClassMutationInput
  | UpdateClassInput
  | DeleteClassInput

interface ClassMutationResponse {
  classId: string
  message: string
}

interface ErrorResponse {
  error?: string
  details?: string
}

async function mutateClass(
  method: 'POST' | 'PATCH' | 'DELETE',
  body: ClassMutationBody
): Promise<ClassMutationResponse> {
  const jwt =
    await account.createJWT()

  const response =
    await fetch(
      '/api/admin/classes',
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
          | ClassMutationResponse
          | ErrorResponse
      : {
          error:
            'The server returned an invalid response.',
        }

  if (!response.ok) {
    const errorPayload =
      payload as ErrorResponse

    throw new Error(
      errorPayload.error ||
        errorPayload.details ||
        'Unable to complete the class operation.'
    )
  }

  return payload as
    ClassMutationResponse
}

export function createClassAsAdmin(
  input: ClassMutationInput
): Promise<ClassMutationResponse> {
  return mutateClass(
    'POST',
    input
  )
}

export function updateClassAsAdmin(
  input: UpdateClassInput
): Promise<ClassMutationResponse> {
  return mutateClass(
    'PATCH',
    input
  )
}

export function deleteClassAsAdmin(
  classId: string
): Promise<ClassMutationResponse> {
  return mutateClass(
    'DELETE',
    {
      classId,
    }
  )
}
