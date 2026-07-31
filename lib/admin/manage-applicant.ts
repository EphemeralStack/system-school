import {
  account,
} from '@/lib/appwrite/config'

export type ApplicantStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'

export interface UpdateApplicantInput {
  applicantId: string
  levelOrFormApplied: string
  status: string
}

interface ApplicantMutationResponse {
  applicantId: string
  userId: string
  message: string
}

interface ErrorResponse {
  error?: string
  details?: string
}

async function readResponse(
  response: Response
): Promise<
  ApplicantMutationResponse | ErrorResponse
> {
  const contentType =
    response.headers.get('content-type') || ''

  if (
    !contentType.includes(
      'application/json'
    )
  ) {
    return {
      error:
        'The server returned an invalid response.',
    }
  }

  return response.json() as Promise<
    ApplicantMutationResponse | ErrorResponse
  >
}

async function requestAsAdmin(
  method: 'PATCH' | 'DELETE',
  body: Record<string, unknown>
): Promise<ApplicantMutationResponse> {
  const jwtResponse =
    await account.createJWT()

  const response = await fetch(
    '/api/admin/applicants',
    {
      method,
      headers: {
        Authorization:
          `Bearer ${jwtResponse.jwt}`,
        'Content-Type':
          'application/json',
      },
      body:
        JSON.stringify(body),
    }
  )

  const payload =
    await readResponse(response)

  if (!response.ok) {
    const errorPayload =
      payload as ErrorResponse

    throw new Error(
      errorPayload.error ||
        errorPayload.details ||
        'Unable to complete the applicant operation.'
    )
  }

  return payload as ApplicantMutationResponse
}

export async function updateApplicantAsAdmin(
  input: UpdateApplicantInput
): Promise<ApplicantMutationResponse> {
  return requestAsAdmin(
    'PATCH',
    {
      applicantId:
        input.applicantId,
      levelOrFormApplied:
        input.levelOrFormApplied,
      status:
        input.status,
    }
  )
}

export async function deleteApplicantAsAdmin(
  applicantId: string
): Promise<ApplicantMutationResponse> {
  return requestAsAdmin(
    'DELETE',
    {
      applicantId,
    }
  )
}
