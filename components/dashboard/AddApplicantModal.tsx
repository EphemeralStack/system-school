// components/dashboard/AddApplicantModal.tsx
'use client'

import {
  useMemo,
  useState,
} from 'react'
import {
  ID,
} from 'appwrite'
import {
  AlertCircle,
  BookOpen,
  Check,
  Clipboard,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  UserLock,
  X,
} from 'lucide-react'

import {
  storage,
} from '@/lib/appwrite/config'
import {
  provisionUserAsAdmin,
  type ProvisionUserResult,
} from '@/lib/admin/provision-user'
import { ZIMBABWE_PRIMARY_GRADES } from '@/lib/school/primary-school-options'

interface AddApplicantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void

  /**
   * Retained temporarily so existing parent components keep compiling.
   * This application is now single-school, so this value is not used.
   */
  schoolId?: string
}

interface ApplicantFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  temporaryPassword: string
  confirmPassword: string
  levelOrFormApplied: string
  avatar: string
  avatarFileId: string
}

const INITIAL_FORM_DATA: ApplicantFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  temporaryPassword: '',
  confirmPassword: '',
  levelOrFormApplied: '',
  avatar: '',
  avatarFileId: '',
}

function requireEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const normalized = value?.trim()

  if (!normalized) {
    throw new Error(
      `Missing environment variable: ${name}`
    )
  }

  return normalized
}

function getBucketId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_BUCKET_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_BUCKET_ID
  )
}

function getInitials(
  firstName: string,
  lastName: string
): string {
  return (
    firstName.charAt(0) +
    lastName.charAt(0)
  ).toUpperCase()
}

function getInitialsColor(
  firstName: string,
  lastName: string
): string {
  const colors = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316',
  ]

  const name =
    `${firstName}${lastName}`

  let hash = 0

  for (
    let index = 0;
    index < name.length;
    index += 1
  ) {
    hash =
      name.charCodeAt(index) +
      ((hash << 5) - hash)
  }

  return colors[
    Math.abs(hash) %
      colors.length
  ]
}

export const AddApplicantModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddApplicantModalProps) => {
  const [loading, setLoading] =
    useState(false)

  const [
    uploadingAvatar,
    setUploadingAvatar,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    avatarPreview,
    setAvatarPreview,
  ] = useState<string | null>(
    null
  )

  const [
    formData,
    setFormData,
  ] =
    useState<ApplicantFormData>(
      INITIAL_FORM_DATA
    )

  const [
    createdCredentials,
    setCreatedCredentials,
  ] =
    useState<ProvisionUserResult | null>(
      null
    )

  const displayInitials =
    useMemo(() => {
      if (
        !formData.firstName ||
        !formData.lastName
      ) {
        return ''
      }

      return getInitials(
        formData.firstName,
        formData.lastName
      )
    }, [
      formData.firstName,
      formData.lastName,
    ])

  const initialsColor =
    useMemo(() => {
      if (
        !formData.firstName ||
        !formData.lastName
      ) {
        return '#F97316'
      }

      return getInitialsColor(
        formData.firstName,
        formData.lastName
      )
    }, [
      formData.firstName,
      formData.lastName,
    ])

  const resetModal =
    (): void => {
      setFormData(
        INITIAL_FORM_DATA
      )
      setAvatarPreview(null)
      setCreatedCredentials(null)
      setError('')
      setLoading(false)
      setUploadingAvatar(false)
    }

  const closeModal =
    (): void => {
      if (
        loading ||
        uploadingAvatar
      ) {
        return
      }

      resetModal()
      onClose()
    }

  const deleteAvatarSilently =
    async (
      avatarFileId: string
    ): Promise<void> => {
      if (!avatarFileId) {
        return
      }

      try {
        await storage.deleteFile({
          bucketId: getBucketId(),
          fileId: avatarFileId,
        })
      } catch (caughtError) {
        console.warn(
          'Unable to remove uploaded avatar:',
          caughtError
        )
      }
    }

  const handleAvatarUpload =
    (): void => {
      const input =
        document.createElement(
          'input'
        )

      input.type = 'file'
      input.accept =
        'image/png,image/jpeg,image/jpg,image/webp'

      input.onchange =
        async (
          event: Event
        ): Promise<void> => {
          const file =
            (
              event.target as
                HTMLInputElement
            ).files?.[0]

          if (!file) {
            return
          }

          try {
            setUploadingAvatar(true)
            setError('')

            const allowedTypes =
              new Set([
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/webp',
              ])

            if (
              !allowedTypes.has(
                file.type
              )
            ) {
              throw new Error(
                'Only JPG, PNG and WEBP images are allowed.'
              )
            }

            if (
              file.size >
              5 * 1024 * 1024
            ) {
              throw new Error(
                'Avatar must be smaller than 5MB.'
              )
            }

            if (
              formData.avatarFileId
            ) {
              await deleteAvatarSilently(
                formData.avatarFileId
              )
            }

            const uploadedFile =
              await storage.createFile({
                bucketId:
                  getBucketId(),
                fileId:
                  ID.unique(),
                file,
              })

            const previewUrl =
              storage
                .getFileView({
                  bucketId:
                    getBucketId(),
                  fileId:
                    uploadedFile.$id,
                })
                .toString()

            setFormData(
              (previous) => ({
                ...previous,
                avatar:
                  previewUrl,
                avatarFileId:
                  uploadedFile.$id,
              })
            )

            setAvatarPreview(
              previewUrl
            )
          } catch (caughtError) {
            setError(
              caughtError instanceof
                Error
                ? caughtError.message
                : 'Failed to upload avatar.'
            )
          } finally {
            setUploadingAvatar(
              false
            )
          }
        }

      input.click()
    }

  const removeAvatar =
    async (): Promise<void> => {
      const avatarFileId =
        formData.avatarFileId

      setFormData(
        (previous) => ({
          ...previous,
          avatar: '',
          avatarFileId: '',
        })
      )

      setAvatarPreview(null)

      await deleteAvatarSilently(
        avatarFileId
      )
    }

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>
    ): Promise<void> => {
      event.preventDefault()
      setError('')

      if (
        !formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !formData.email.trim() ||
        !formData.levelOrFormApplied.trim()
      ) {
        setError(
          'Complete all required fields.'
        )
        return
      }

      if (
        formData.temporaryPassword &&
        formData.temporaryPassword
          .length < 12
      ) {
        setError(
          'Temporary password must contain at least 12 characters.'
        )
        return
      }

      if (
        formData.temporaryPassword !==
        formData.confirmPassword
      ) {
        setError(
          'Passwords do not match.'
        )
        return
      }

      setLoading(true)

      try {
        const result =
          await provisionUserAsAdmin({
            role: 'applicant',
            firstName:
              formData.firstName.trim(),
            lastName:
              formData.lastName.trim(),
            email:
              formData.email
                .trim()
                .toLowerCase(),
            phone:
              formData.phone.trim(),
            avatar:
              formData.avatar,
            temporaryPassword:
              formData
                .temporaryPassword ||
              undefined,
            levelOrFormApplied:
              formData.levelOrFormApplied.trim(),
            status: 'pending',
          })

        setCreatedCredentials(
          result
        )

        onSuccess()
      } catch (caughtError) {
        console.error(
          'Error adding applicant:',
          caughtError
        )

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to add applicant.'
        )
      } finally {
        setLoading(false)
      }
    }

  const copyCredentials =
    async (): Promise<void> => {
      if (!createdCredentials) {
        return
      }

      const credentialText = [
        `Email: ${createdCredentials.email}`,
        `Temporary password: ${createdCredentials.temporaryPassword}`,
      ].join('\n')

      try {
        await navigator.clipboard.writeText(
          credentialText
        )
      } catch {
        setError(
          'Clipboard access failed. Copy the credentials manually.'
        )
      }
    }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gray-300 bg-white sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-gray-300 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">
            {createdCredentials
              ? 'Applicant Account Created'
              : 'Add New Applicant'}
          </h2>

          <button
            type="button"
            onClick={closeModal}
            disabled={
              loading ||
              uploadingAvatar
            }
            aria-label="Close"
            className="rounded-lg border-2 border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5 text-red-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border-2 border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {createdCredentials ? (
          <div className="space-y-5 p-6">
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
              <div className="mb-3 flex items-center gap-2 text-green-800">
                <Check className="h-5 w-5" />
                <p className="font-semibold">
                  The Auth account and applicant profile were created successfully.
                </p>
              </div>

              <p className="mb-4 text-sm text-green-700">
                The application number was generated securely on the server.
              </p>

              <div className="space-y-3 rounded-lg border border-green-200 bg-white p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="break-all font-medium text-gray-900">
                    {createdCredentials.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Temporary password
                  </p>
                  <p className="break-all font-mono font-semibold text-gray-900">
                    {
                      createdCredentials.temporaryPassword
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t-2 border-gray-300 pt-4">
              <button
                type="button"
                onClick={() => {
                  void copyCredentials()
                }}
                className="flex items-center gap-2 rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Clipboard className="h-4 w-4" />
                Copy Credentials
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border-2 border-[#C75712] bg-[#C75712] px-6 py-2 text-white transition-colors hover:bg-[#D96A1E]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 p-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  First Name *
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          firstName:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                    placeholder="First name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Last Name *
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          lastName:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email *
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          email:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          phone:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Temporary Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="password"
                    minLength={12}
                    value={formData.temporaryPassword}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          temporaryPassword:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                    placeholder="Leave blank to generate"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>

                <div className="relative">
                  <UserLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="password"
                    minLength={12}
                    value={formData.confirmPassword}
                    disabled={
                      !formData.temporaryPassword
                    }
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          confirmPassword:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712] disabled:bg-gray-100"
                    placeholder="Repeat temporary password"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Grade Applied For *
                </label>

                <div className="relative">
                  <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    required
                    value={formData.levelOrFormApplied}
                    onChange={(event) =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          levelOrFormApplied:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                  >
                    <option value="">
                      Select grade
                    </option>

                    {ZIMBABWE_PRIMARY_GRADES.map(
                      (grade) => (
                        <option
                          key={grade}
                          value={grade}
                        >
                          {grade}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Avatar
                </label>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    >
                      <div className="group flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#C75712]">
                        {uploadingAvatar ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C75712] border-t-transparent" />
                        ) : avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-full w-full object-cover"
                          />
                        ) : formData.firstName &&
                          formData.lastName ? (
                          <div
                            className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                            style={{
                              backgroundColor:
                                initialsColor,
                            }}
                          >
                            {displayInitials}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[#C75712]" />
                            <span className="mt-0.5 block text-center text-[6px] text-gray-400">
                              Photo
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          void removeAvatar()
                        }}
                        aria-label="Remove avatar"
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 shadow-sm transition hover:bg-red-600"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      Upload photo
                    </p>
                    <p className="text-[10px] text-gray-400">
                      PNG, JPG or WEBP
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Leave the password fields blank to let the server generate a strong temporary password.
            </p>

            <div className="flex justify-end gap-3 border-t-2 border-gray-300 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={
                  loading ||
                  uploadingAvatar
                }
                className="rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  uploadingAvatar
                }
                className="flex items-center gap-2 rounded-lg border-2 border-[#C75712] bg-[#C75712] px-6 py-2 text-white transition-colors hover:bg-[#D96A1E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ||
                uploadingAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadingAvatar
                      ? 'Uploading...'
                      : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Add Applicant
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
