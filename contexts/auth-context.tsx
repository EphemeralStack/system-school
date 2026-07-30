'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ID, Query } from 'appwrite'
import { useRouter } from 'next/navigation'

import {
  account,
  databases,
  storage,
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

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string

  avatar?: string
  avatarFileId?: string
  avatarFile?: File | null

  schoolId?: string
  departmentId?: string
  hireDate?: string
  qualification?: string
  subjectSpecialization?: string

  classId?: string
  level?: string
  form?: string

  levelOrFormApplied?: string

  position?: string
  assignedArea?: string
  status?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean

  registerApplicant: (data: RegisterData) => Promise<User>
  registerAdmin: (data: RegisterData) => Promise<User>
  registerTeacher: (data: RegisterData) => Promise<User>
  registerStudent: (data: RegisterData) => Promise<User>

  login: (
    email: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<User>

  logout: (redirectTo?: string) => Promise<void>
  refreshUser: () => Promise<User | null>
  getSchools: () => Promise<SchoolDocument[]>
}

export interface SchoolDocument {
  $id: string
  Name?: string
  Address?: string
  Status?: string
  [key: string]: unknown
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

interface AvatarResult {
  avatar: string
  avatarFileId: string
}

const AuthContext =
  createContext<AuthContextType | undefined>(undefined)

const VALID_ROLES: UserRole[] = [
  'admin',
  'teacher',
  'student',
  'applicant',
]

const BLOCKED_STATUSES = new Set([
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
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return normalizedValue
}

function getDatabaseId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
  )
}

function getUsersCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
  )
}

function getAdminsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID
  )
}

function getApplicantsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID
  )
}

function getStudentsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
  )
}

function getTeachersCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID
  )
}

function getSchoolsCollectionId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID',
    process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID
  )
}

function getBucketId(): string {
  return requireEnvironmentVariable(
    'NEXT_PUBLIC_APPWRITE_BUCKET_ID',
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID
  )
}

function getRoleCollectionId(role: UserRole): string {
  switch (role) {
    case 'admin':
      return getAdminsCollectionId()

    case 'teacher':
      return getTeachersCollectionId()

    case 'student':
      return getStudentsCollectionId()

    case 'applicant':
    default:
      return getApplicantsCollectionId()
  }
}

function requireValue(
  value: string | undefined,
  label: string
): string {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new Error(`${label} is required.`)
  }

  return normalizedValue
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeRole(value: unknown): UserRole {
  if (typeof value !== 'string') {
    throw new Error(
      'This account does not have a valid user role.'
    )
  }

  const normalizedRole = value.trim().toLowerCase()

  if (VALID_ROLES.includes(normalizedRole as UserRole)) {
    return normalizedRole as UserRole
  }

  throw new Error(
    `Unsupported user role: ${normalizedRole || 'missing'}`
  )
}

function getErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  return (error as AppwriteErrorLike).code
}

function createApplicationNumber(): string {
  const timestampPart = Date.now().toString().slice(-8)

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()

  return `APP-${timestampPart}-${randomPart}`
}

function addOptionalString(
  target: Record<string, unknown>,
  key: string,
  value: string | undefined
): void {
  const normalizedValue = value?.trim()

  if (normalizedValue) {
    target[key] = normalizedValue
  }
}

async function deleteCurrentSessionSilently(): Promise<void> {
  try {
    await account.deleteSession({
      sessionId: 'current',
    })
  } catch {
    // The session may already be gone.
  }
}

async function uploadAvatar(
  data: RegisterData
): Promise<AvatarResult> {
  const existingAvatar = data.avatar?.trim() || ''
  const existingAvatarFileId =
    data.avatarFileId?.trim() || ''

  if (!data.avatarFile) {
    return {
      avatar: existingAvatar,
      avatarFileId: existingAvatarFileId,
    }
  }

  try {
    const uploadedFile = await storage.createFile({
      bucketId: getBucketId(),
      fileId: ID.unique(),
      file: data.avatarFile,
    })

    return {
      avatar: storage
        .getFileView({
          bucketId: getBucketId(),
          fileId: uploadedFile.$id,
        })
        .toString(),
      avatarFileId: uploadedFile.$id,
    }
  } catch (error) {
    console.error(
      'Avatar upload failed. Registration will continue without it:',
      error
    )

    return {
      avatar: '',
      avatarFileId: '',
    }
  }
}

async function findUserProfile(
  userId: string,
  email: string
): Promise<UserProfileDocument | null> {
  try {
    const profile = await databases.getDocument({
      databaseId: getDatabaseId(),
      collectionId: getUsersCollectionId(),
      documentId: userId,
    })

    return profile as unknown as UserProfileDocument
  } catch (error) {
    if (getErrorCode(error) !== 404) {
      console.error(
        'Unable to load user profile by document ID:',
        error
      )
    }
  }

  try {
    const response = await databases.listDocuments({
      databaseId: getDatabaseId(),
      collectionId: getUsersCollectionId(),
      queries: [
        Query.equal('Email', [normalizeEmail(email)]),
        Query.limit(1),
      ],
    })

    if (response.documents.length === 0) {
      return null
    }

    return response
      .documents[0] as unknown as UserProfileDocument
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
): Promise<RoleProfileDocument | null> {
  const collectionId = getRoleCollectionId(role)

  try {
    const profile = await databases.getDocument({
      databaseId: getDatabaseId(),
      collectionId,
      documentId: userId,
    })

    return profile as unknown as RoleProfileDocument
  } catch (error) {
    if (getErrorCode(error) !== 404) {
      console.error(
        `Unable to load ${role} profile by document ID:`,
        error
      )
    }
  }

  try {
    const response = await databases.listDocuments({
      databaseId: getDatabaseId(),
      collectionId,
      queries: [
        Query.equal('userId', [userId]),
        Query.limit(1),
      ],
    })

    if (response.documents.length === 0) {
      return null
    }

    return response
      .documents[0] as unknown as RoleProfileDocument
  } catch (error) {
    console.error(
      `Unable to load ${role} profile by userId:`,
      error
    )

    return null
  }
}

async function loadCurrentUser(): Promise<User> {
  const appwriteUser = await account.get()

  const profile = await findUserProfile(
    appwriteUser.$id,
    appwriteUser.email
  )

  if (!profile) {
    throw new Error(
      'Your authentication account exists, but its user profile is missing.'
    )
  }

  const preferences =
    (appwriteUser.prefs ?? {}) as Record<string, unknown>

  const preferenceValue = (key: string): string => {
    const value = preferences[key]

    return typeof value === 'string' ? value.trim() : ''
  }

  const role = normalizeRole(
    profile.Role || preferenceValue('Role')
  )

  const roleProfile = await findRoleProfile(
    role,
    appwriteUser.$id
  )

  if (!roleProfile) {
    throw new Error(
      `Your ${role} profile is missing. Please contact the system administrator.`
    )
  }

  return {
    $id: appwriteUser.$id,

    FirstName:
      profile.FirstName?.trim() ||
      preferenceValue('FirstName') ||
      appwriteUser.name?.split(' ')[0] ||
      '',

    LastName:
      profile.LastName?.trim() ||
      preferenceValue('LastName') ||
      appwriteUser.name?.split(' ').slice(1).join(' ') ||
      '',

    Email:
      profile.Email?.trim() ||
      appwriteUser.email,

    phone:
      profile.Phone?.trim() ||
      preferenceValue('phone') ||
      appwriteUser.phone ||
      '',

    avatar:
      profile.avatar?.trim() ||
      preferenceValue('avatar') ||
      '',

    avatarFileId:
      preferenceValue('avatarFileId'),

    Role: role,

    Status:
      roleProfile.Status?.trim() || undefined,
  }
}

export function getDashboardPath(role: UserRole): string {
  return `/${role}/dashboard`
}

export function getSignInPath(role: UserRole): string {
  return `/${role}/signIn`
}

export function isBlockedStatus(
  status: string | undefined
): boolean {
  if (!status) {
    return false
  }

  return BLOCKED_STATUSES.has(
    status.trim().toLowerCase()
  )
}

function getBlockedStatusMessage(
  status: string | undefined
): string {
  return `Your account is ${
    status?.trim().toLowerCase() || 'unavailable'
  }. Please contact the system administrator.`
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const refreshUser =
    useCallback(async (): Promise<User | null> => {
      try {
        const currentUser = await loadCurrentUser()

        if (isBlockedStatus(currentUser.Status)) {
          await deleteCurrentSessionSilently()
          setUser(null)
          return null
        }

        setUser(currentUser)

        return currentUser
      } catch (error) {
        if (getErrorCode(error) !== 401) {
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
    }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const getSchools = async (): Promise<SchoolDocument[]> => {
    try {
      const response = await databases.listDocuments({
        databaseId: getDatabaseId(),
        collectionId: getSchoolsCollectionId(),
        queries: [Query.limit(100)],
      })

      return response.documents as unknown as SchoolDocument[]
    } catch (error) {
      console.error('Error fetching schools:', error)

      return []
    }
  }

  const createBaseAccount = async (
    data: RegisterData,
    role: UserRole
  ): Promise<User> => {
    const firstName = requireValue(
      data.firstName,
      'First name'
    )

    const lastName = requireValue(
      data.lastName,
      'Last name'
    )

    const email = normalizeEmail(
      requireValue(data.email, 'Email address')
    )

    const password = requireValue(
      data.password,
      'Password'
    )

    if (password.length < 8) {
      throw new Error(
        'Password must be at least 8 characters.'
      )
    }

    const phone = requireValue(
      data.phone,
      'Phone number'
    )

    const fullName =
      `${firstName} ${lastName}`.trim()

    const userId = ID.unique()

    const newAccount = await account.create({
      userId,
      email,
      password,
      name: fullName,
    })

    await account.createEmailPasswordSession({
      email,
      password,
    })

    const avatarResult = await uploadAvatar(data)

    await account.updatePrefs({
      prefs: {
        FirstName: firstName,
        LastName: lastName,
        phone,
        Role: role,
        avatar: avatarResult.avatar,
        avatarFileId: avatarResult.avatarFileId,
      },
    })

    const userDocumentData: Record<string, unknown> = {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Phone: phone,
      Role: role,
    }

    addOptionalString(
      userDocumentData,
      'avatar',
      avatarResult.avatar
    )

    await databases.createDocument({
      databaseId: getDatabaseId(),
      collectionId: getUsersCollectionId(),
      documentId: newAccount.$id,
      data: userDocumentData,
    })

    return {
      $id: newAccount.$id,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      phone,
      Role: role,
      avatar: avatarResult.avatar,
      avatarFileId: avatarResult.avatarFileId,
    }
  }

  const registerAdmin = async (
    data: RegisterData
  ): Promise<User> => {
    const position = requireValue(
      data.position,
      'Position'
    )

    const assignedArea = requireValue(
      data.assignedArea,
      'Assigned area'
    )

    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(
        data,
        'admin'
      )

      const status =
        data.status?.trim() || 'active'

      const adminDocumentData:
        Record<string, unknown> = {
          userId: registeredUser.$id,
          Position: position,
          AssignedArea: assignedArea,
          Status: status,
        }

      addOptionalString(
        adminDocumentData,
        'avatar',
        registeredUser.avatar
      )

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getAdminsCollectionId(),
        documentId: registeredUser.$id,
        data: adminDocumentData,
      })

      const currentUser: User = {
        ...registeredUser,
        Status: status,
      }

      setUser(currentUser)
      router.replace(getDashboardPath('admin'))

      return currentUser
    } catch (error) {
      console.error(
        'Error registering admin:',
        error
      )

      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerTeacher = async (
    data: RegisterData
  ): Promise<User> => {
    const schoolId = requireValue(
      data.schoolId,
      'School'
    )

    const qualification = requireValue(
      data.qualification,
      'Qualification'
    )

    const subjectSpecialization = requireValue(
      data.subjectSpecialization,
      'Subject specialization'
    )

    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(
        data,
        'teacher'
      )

      const status =
        data.status?.trim() || 'active'

      const teacherDocumentData:
        Record<string, unknown> = {
          schoolId,
          userId: registeredUser.$id,
          Qualification: qualification,
          SubjectSpecialization:
            subjectSpecialization,
          Status: status,
        }

      addOptionalString(
        teacherDocumentData,
        'departmentId',
        data.departmentId
      )

      addOptionalString(
        teacherDocumentData,
        'HireDate',
        data.hireDate
      )

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getTeachersCollectionId(),
        documentId: registeredUser.$id,
        data: teacherDocumentData,
      })

      const currentUser: User = {
        ...registeredUser,
        Status: status,
      }

      setUser(currentUser)
      router.replace(getDashboardPath('teacher'))

      return currentUser
    } catch (error) {
      console.error(
        'Error registering teacher:',
        error
      )

      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerStudent = async (
    data: RegisterData
  ): Promise<User> => {
    const schoolId = requireValue(
      data.schoolId,
      'School'
    )

    const level = requireValue(
      data.level,
      'Level'
    )

    const form = requireValue(
      data.form,
      'Form'
    )

    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(
        data,
        'student'
      )

      const status =
        data.status?.trim() || 'active'

      const studentDocumentData:
        Record<string, unknown> = {
          userId: registeredUser.$id,
          schoolId,
          Level: level,
          Form: form,
          EnrollmentDate: new Date().toISOString(),
          Status: status,
        }

      addOptionalString(
        studentDocumentData,
        'classId',
        data.classId
      )

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getStudentsCollectionId(),
        documentId: registeredUser.$id,
        data: studentDocumentData,
      })

      const currentUser: User = {
        ...registeredUser,
        Status: status,
      }

      setUser(currentUser)
      router.replace(getDashboardPath('student'))

      return currentUser
    } catch (error) {
      console.error(
        'Error registering student:',
        error
      )

      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerApplicant = async (
    data: RegisterData
  ): Promise<User> => {
    const levelOrFormApplied = requireValue(
      data.levelOrFormApplied,
      'Level or form applied for'
    )

    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(
        data,
        'applicant'
      )

      const status = 'pending'

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getApplicantsCollectionId(),
        documentId: registeredUser.$id,
        data: {
          userId: registeredUser.$id,
          ApplicationNo:
            createApplicationNumber(),
          LevelOrFormApplied:
            levelOrFormApplied,
          Status: status,
        },
      })

      const currentUser: User = {
        ...registeredUser,
        Status: status,
      }

      setUser(currentUser)
      router.replace(getDashboardPath('applicant'))

      return currentUser
    } catch (error) {
      console.error(
        'Error registering applicant:',
        error
      )

      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (
    email: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<User> => {
    setLoading(true)

    try {
      await account.createEmailPasswordSession({
        email: normalizeEmail(
          requireValue(email, 'Email address')
        ),
        password: requireValue(
          password,
          'Password'
        ),
      })

      const authenticatedUser =
        await loadCurrentUser()

      if (
        expectedRole &&
        authenticatedUser.Role !== expectedRole
      ) {
        await deleteCurrentSessionSilently()

        throw new Error(
          `This account belongs to the ${authenticatedUser.Role} portal. Please use the correct sign-in page.`
        )
      }

      if (
        isBlockedStatus(authenticatedUser.Status)
      ) {
        await deleteCurrentSessionSilently()

        throw new Error(
          getBlockedStatusMessage(
            authenticatedUser.Status
          )
        )
      }

      setUser(authenticatedUser)

      return authenticatedUser
    } catch (error) {
      setUser(null)

      console.error('Login error:', error)

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
        sessionId: 'current',
      })
    } catch (error) {
      if (getErrorCode(error) !== 401) {
        console.error('Logout error:', error)
      }
    } finally {
      setUser(null)
      setLoading(false)
      router.replace(redirectTo)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        registerApplicant,
        registerAdmin,
        registerTeacher,
        registerStudent,
        login,
        logout,
        refreshUser,
        getSchools,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }

  return context
}

