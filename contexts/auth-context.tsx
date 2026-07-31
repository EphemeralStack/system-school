'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  Query,
} from 'appwrite'
import { useRouter } from 'next/navigation'

import {
  account,
  databases,
} from '@/lib/appwrite/config'

export type UserRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'applicant'

export interface User {
  $id: string
  FirstName: string
  LastName: string
  Email: string
  phone: string
  Role: UserRole
  Status?: string
  avatar?: string
  avatarFileId?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean

  login: (
    email: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<User>

  logout: (
    redirectTo?: string
  ) => Promise<void>

  refreshUser:
    () => Promise<User | null>
}

interface UserProfileDocument {
  $id: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  Role?: string
  avatar?: string
}

interface RoleProfileDocument {
  $id: string
  userId?: string
  Status?: string
}

interface AppwriteErrorLike {
  code?: number
  message?: string
  type?: string
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  )

const VALID_ROLES:
  readonly UserRole[] = [
    'admin',
    'teacher',
    'student',
    'applicant',
  ]

const BLOCKED_STATUSES =
  new Set([
    'inactive',
    'suspended',
    'withdrawn',
    'resigned',
    'rejected',
    'retired',
    'on_leave',
  ])

function requireEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const normalized =
    value?.trim()

  if (!normalized) {
    throw new Error(
      `Missing environment variable: ${name}`
    )
  }

  return normalized
}

function getDatabaseId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
  )
}

function getUsersCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
  )
}

function getAdminsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID
  )
}

function getApplicantsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
  )
}

function getStudentsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
  )
}

function getTeachersCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID',
    process.env
      .NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
  )
}

function getRoleCollectionId(
  role: UserRole
): string {
  switch (role) {
    case 'admin':
      return getAdminsCollectionId()

    case 'teacher':
      return getTeachersCollectionId()

    case 'student':
      return getStudentsCollectionId()

    case 'applicant':
      return getApplicantsCollectionId()
  }
}

function requireValue(
  value: string | undefined,
  label: string
): string {
  const normalized =
    value?.trim()

  if (!normalized) {
    throw new Error(
      `${label} is required.`
    )
  }

  return normalized
}

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase()
}

function normalizeRole(
  value: unknown
): UserRole {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'This account does not have a valid user role.'
    )
  }

  const normalized =
    value
      .trim()
      .toLowerCase()

  if (
    VALID_ROLES.includes(
      normalized as UserRole
    )
  ) {
    return normalized as UserRole
  }

  throw new Error(
    `Unsupported user role: ${
      normalized || 'missing'
    }`
  )
}

function getRoleFromLabels(
  labels: unknown
): UserRole {
  if (!Array.isArray(labels)) {
    throw new Error(
      'This account has no authorized role label.'
    )
  }

  const matchingRoles =
    labels
      .map((label) =>
        String(label)
          .trim()
          .toLowerCase()
      )
      .filter(
        (label): label is UserRole =>
          VALID_ROLES.includes(
            label as UserRole
          )
      )

  const uniqueRoles =
    [...new Set(matchingRoles)]

  if (uniqueRoles.length === 0) {
    throw new Error(
      'This account has no authorized role label. Please contact the system administrator.'
    )
  }

  if (uniqueRoles.length > 1) {
    throw new Error(
      'This account has conflicting role labels. Please contact the system administrator.'
    )
  }

  return uniqueRoles[0]
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

async function deleteCurrentSessionSilently():
  Promise<void> {
  try {
    await account.deleteSession({
      sessionId: 'current',
    })
  } catch {
    // The session may already be gone.
  }
}

async function findUserProfile(
  userId: string,
  email: string
): Promise<
  UserProfileDocument | null
> {
  try {
    const profile =
      await databases.getDocument({
        databaseId:
          getDatabaseId(),
        collectionId:
          getUsersCollectionId(),
        documentId:
          userId,
      })

    return profile as unknown as
      UserProfileDocument
  } catch (error) {
    if (
      getErrorCode(error) !== 404
    ) {
      console.error(
        'Unable to load user profile by document ID:',
        error
      )
    }
  }

  try {
    const response =
      await databases.listDocuments({
        databaseId:
          getDatabaseId(),
        collectionId:
          getUsersCollectionId(),
        queries: [
          Query.equal(
            'Email',
            [
              normalizeEmail(
                email
              ),
            ]
          ),
          Query.limit(1),
        ],
      })

    if (
      response.documents.length === 0
    ) {
      return null
    }

    return response
      .documents[0] as unknown as
        UserProfileDocument
  } catch (error) {
    console.error(
      'Unable to load user profile by email:',
      error
    )

    return null
  }
}

async function findRoleProfile(
  role: UserRole,
  userId: string
): Promise<
  RoleProfileDocument | null
> {
  const collectionId =
    getRoleCollectionId(role)

  try {
    const profile =
      await databases.getDocument({
        databaseId:
          getDatabaseId(),
        collectionId,
        documentId:
          userId,
      })

    return profile as unknown as
      RoleProfileDocument
  } catch (error) {
    if (
      getErrorCode(error) !== 404
    ) {
      console.error(
        `Unable to load ${role} profile by document ID:`,
        error
      )
    }
  }

  try {
    const response =
      await databases.listDocuments({
        databaseId:
          getDatabaseId(),
        collectionId,
        queries: [
          Query.equal(
            'userId',
            [userId]
          ),
          Query.limit(1),
        ],
      })

    if (
      response.documents.length === 0
    ) {
      return null
    }

    return response
      .documents[0] as unknown as
        RoleProfileDocument
  } catch (error) {
    console.error(
      `Unable to load ${role} profile by userId:`,
      error
    )

    return null
  }
}

async function loadCurrentUser():
  Promise<User> {
  const appwriteUser =
    await account.get()

  const role =
    getRoleFromLabels(
      appwriteUser.labels
    )

  const profile =
    await findUserProfile(
      appwriteUser.$id,
      appwriteUser.email
    )

  if (!profile) {
    throw new Error(
      'Your authentication account exists, but its user profile is missing.'
    )
  }

  const profileRole =
    normalizeRole(
      profile.Role
    )

  if (profileRole !== role) {
    throw new Error(
      'Your authorized role does not match your user profile. Please contact the system administrator.'
    )
  }

  const roleProfile =
    await findRoleProfile(
      role,
      appwriteUser.$id
    )

  if (!roleProfile) {
    throw new Error(
      `Your ${role} profile is missing. Please contact the system administrator.`
    )
  }

  const preferences =
    (
      appwriteUser.prefs ??
      {}
    ) as Record<
      string,
      unknown
    >

  const preferenceValue = (
    key: string
  ): string => {
    const value =
      preferences[key]

    return typeof value ===
      'string'
      ? value.trim()
      : ''
  }

  const nameParts =
    appwriteUser.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ??
    []

  return {
    $id:
      appwriteUser.$id,

    FirstName:
      profile.FirstName?.trim() ||
      preferenceValue(
        'FirstName'
      ) ||
      nameParts[0] ||
      '',

    LastName:
      profile.LastName?.trim() ||
      preferenceValue(
        'LastName'
      ) ||
      nameParts
        .slice(1)
        .join(' ') ||
      '',

    Email:
      profile.Email?.trim() ||
      appwriteUser.email,

    phone:
      profile.Phone?.trim() ||
      preferenceValue(
        'phone'
      ) ||
      appwriteUser.phone ||
      '',

    avatar:
      profile.avatar?.trim() ||
      preferenceValue(
        'avatar'
      ) ||
      '',

    avatarFileId:
      preferenceValue(
        'avatarFileId'
      ),

    Role:
      role,

    Status:
      roleProfile.Status?.trim() ||
      undefined,
  }
}

export function getDashboardPath(
  role: UserRole
): string {
  return `/${role}/dashboard`
}

export function getSignInPath(
  role: UserRole
): string {
  return `/${role}/signIn`
}

export function isBlockedStatus(
  status: string | undefined
): boolean {
  if (!status) {
    return false
  }

  return BLOCKED_STATUSES.has(
    status
      .trim()
      .toLowerCase()
  )
}

function getBlockedStatusMessage(
  status: string | undefined
): string {
  return `Your account is ${
    status
      ?.trim()
      .toLowerCase() ||
    'unavailable'
  }. Please contact the system administrator.`
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const router =
    useRouter()

  const refreshUser =
    useCallback(
      async (): Promise<
        User | null
      > => {
        try {
          const currentUser =
            await loadCurrentUser()

          if (
            isBlockedStatus(
              currentUser.Status
            )
          ) {
            await deleteCurrentSessionSilently()
            setUser(null)
            return null
          }

          setUser(
            currentUser
          )

          return currentUser
        } catch (error) {
          if (
            getErrorCode(
              error
            ) !== 401
          ) {
            console.error(
              'Error checking the current user:',
              error
            )
          }

          setUser(null)
          return null
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = async (
    email: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<User> => {
    setLoading(true)

    try {
      await account
        .createEmailPasswordSession({
          email:
            normalizeEmail(
              requireValue(
                email,
                'Email address'
              )
            ),
          password:
            requireValue(
              password,
              'Password'
            ),
        })

      const authenticatedUser =
        await loadCurrentUser()

      if (
        expectedRole &&
        authenticatedUser.Role !==
          expectedRole
      ) {
        await deleteCurrentSessionSilently()

        throw new Error(
          `This account belongs to the ${authenticatedUser.Role} portal. Please use the correct sign-in page.`
        )
      }

      if (
        isBlockedStatus(
          authenticatedUser.Status
        )
      ) {
        await deleteCurrentSessionSilently()

        throw new Error(
          getBlockedStatusMessage(
            authenticatedUser.Status
          )
        )
      }

      setUser(
        authenticatedUser
      )

      return authenticatedUser
    } catch (error) {
      setUser(null)

      console.error(
        'Login error:',
        error
      )

      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async (
    redirectTo = '/'
  ): Promise<void> => {
    setLoading(true)

    try {
      await account.deleteSession({
        sessionId:
          'current',
      })
    } catch (error) {
      if (
        getErrorCode(
          error
        ) !== 401
      ) {
        console.error(
          'Logout error:',
          error
        )
      }
    } finally {
      setUser(null)
      setLoading(false)
      router.replace(
        redirectTo
      )
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth():
  AuthContextType {
  const context =
    useContext(AuthContext)

  if (
    context === undefined
  ) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }

  return context
}
