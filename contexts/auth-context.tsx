// contexts/auth-context.tsx
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

import { account, databases } from '@/lib/appwrite/config'

export type UserRole = 'admin' | 'teacher' | 'student' | 'applicant'

export interface User {
  $id: string
  FirstName: string
  LastName: string
  Email: string
  phone: string
  avatar?: string
  avatarFileId?: string
  Role: UserRole
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string

  avatar?: string
  avatarFileId?: string

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

  registerApplicant: (data: RegisterData) => Promise<void>
  registerAdmin: (data: RegisterData) => Promise<void>
  registerTeacher: (data: RegisterData) => Promise<void>
  registerStudent: (data: RegisterData) => Promise<void>

  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
  getSchools: () => Promise<any[]>
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

interface AppwriteErrorLike {
  code?: number
  message?: string
  type?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const VALID_ROLES: UserRole[] = [
  'admin',
  'teacher',
  'student',
  'applicant',
]

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

function requireValue(value: string | undefined, label: string): string {
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
  if (
    typeof value === 'string' &&
    VALID_ROLES.includes(value.toLowerCase() as UserRole)
  ) {
    return value.toLowerCase() as UserRole
  }

  return 'applicant'
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

async function findUserProfileByEmail(
  email: string
): Promise<UserProfileDocument | null> {
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

    return response.documents[0] as unknown as UserProfileDocument
  } catch (error) {
    console.error('Unable to load the database user profile:', error)
    return null
  }
}

async function loadCurrentUser(): Promise<User> {
  const appwriteUser = await account.get()
  const profile = await findUserProfileByEmail(appwriteUser.email)

  const preferences = (appwriteUser.prefs ?? {}) as Record<string, unknown>

  const preferenceValue = (key: string): string => {
    const value = preferences[key]
    return typeof value === 'string' ? value.trim() : ''
  }

  const profileRole = profile?.Role
  const preferenceRole = preferenceValue('Role')

  return {
    $id: appwriteUser.$id,

    FirstName:
      profile?.FirstName?.trim() ||
      preferenceValue('FirstName') ||
      appwriteUser.name?.split(' ')[0] ||
      '',

    LastName:
      profile?.LastName?.trim() ||
      preferenceValue('LastName') ||
      appwriteUser.name?.split(' ').slice(1).join(' ') ||
      '',

    Email: profile?.Email?.trim() || appwriteUser.email,

    phone:
      profile?.Phone?.trim() ||
      preferenceValue('phone') ||
      appwriteUser.phone ||
      '',

    avatar:
      profile?.avatar?.trim() ||
      preferenceValue('avatar') ||
      '',

    avatarFileId: preferenceValue('avatarFileId'),

    Role: normalizeRole(profileRole || preferenceRole),
  }
}

function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'

    case 'teacher':
      return '/teacher/dashboard'

    case 'student':
      return '/student/dashboard'

    case 'applicant':
    default:
      return '/applicant/dashboard'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await loadCurrentUser()
      setUser(currentUser)

      return currentUser
    } catch (error) {
      if (getErrorCode(error) !== 401) {
        console.error('Error checking the current user:', error)
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

  const getSchools = async (): Promise<any[]> => {
    try {
      const response = await databases.listDocuments({
        databaseId: getDatabaseId(),
        collectionId: getSchoolsCollectionId(),
      })

      return response.documents
    } catch (error) {
      console.error('Error fetching schools:', error)
      return []
    }
  }

  const createBaseAccount = async (
    data: RegisterData,
    role: UserRole
  ): Promise<User> => {
    const firstName = requireValue(data.firstName, 'First name')
    const lastName = requireValue(data.lastName, 'Last name')
    const email = normalizeEmail(
      requireValue(data.email, 'Email address')
    )
    const password = requireValue(data.password, 'Password')
    const phone = data.phone?.trim() || ''
    const fullName = `${firstName} ${lastName}`.trim()

    const newAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: fullName,
    })

    await account.createEmailPasswordSession({
      email,
      password,
    })

    await account.updatePrefs({
      prefs: {
        FirstName: firstName,
        LastName: lastName,
        phone,
        Role: role,
        avatar: data.avatar?.trim() || '',
        avatarFileId: data.avatarFileId?.trim() || '',
      },
    })

    await databases.createDocument({
      databaseId: getDatabaseId(),
      collectionId: getUsersCollectionId(),
      documentId: newAccount.$id,
      data: {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone,
        Role: role,
        avatar: data.avatar?.trim() || '',
      },
    })

    return {
      $id: newAccount.$id,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      phone,
      Role: role,
      avatar: data.avatar?.trim() || '',
      avatarFileId: data.avatarFileId?.trim() || '',
    }
  }

  const registerAdmin = async (data: RegisterData): Promise<void> => {
    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(data, 'admin')

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getAdminsCollectionId(),
        documentId: registeredUser.$id,
        data: {
          userId: registeredUser.$id,
          Position: data.position?.trim() || 'Administrator',
          AssignedArea:
            data.assignedArea?.trim() || 'Administration',
          Status: data.status?.trim() || 'active',
          avatar: data.avatar?.trim() || '',
        },
      })

      setUser(registeredUser)
      router.replace(getDashboardPath('admin'))
    } catch (error) {
      console.error('Error registering admin:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerTeacher = async (
    data: RegisterData
  ): Promise<void> => {
    const schoolId = requireValue(data.schoolId, 'School')

    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(data, 'teacher')

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getTeachersCollectionId(),
        documentId: registeredUser.$id,
        data: {
          schoolId,
          userId: registeredUser.$id,
          departmentId: data.departmentId?.trim() || '',
          HireDate: data.hireDate?.trim() || '',
          Qualification: data.qualification?.trim() || '',
          SubjectSpecialization:
            data.subjectSpecialization?.trim() || '',
          Status: data.status?.trim() || 'active',
        },
      })

      setUser(registeredUser)
      router.replace(getDashboardPath('teacher'))
    } catch (error) {
      console.error('Error registering teacher:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerStudent = async (
    data: RegisterData
  ): Promise<void> => {
    setLoading(true)

    try {
      const registeredUser = await createBaseAccount(data, 'student')

      const studentData: Record<string, unknown> = {
        userId: registeredUser.$id,
        classId: data.classId?.trim() || '',
        Level: data.level?.trim() || '',
        Form: data.form?.trim() || '',
        EnrollmentDate: new Date().toISOString(),
        Status: data.status?.trim() || 'active',
      }

      if (data.schoolId?.trim()) {
        studentData.schoolId = data.schoolId.trim()
      }

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getStudentsCollectionId(),
        documentId: registeredUser.$id,
        data: studentData,
      })

      setUser(registeredUser)
      router.replace(getDashboardPath('student'))
    } catch (error) {
      console.error('Error registering student:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const registerApplicant = async (
    data: RegisterData
  ): Promise<void> => {
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

      await databases.createDocument({
        databaseId: getDatabaseId(),
        collectionId: getApplicantsCollectionId(),
        documentId: registeredUser.$id,
        data: {
          userId: registeredUser.$id,
          ApplicationNo: createApplicationNumber(),
          LevelOrFormApplied: levelOrFormApplied,
          Status: 'pending',
        },
      })

      setUser(registeredUser)
      router.replace(getDashboardPath('applicant'))
    } catch (error) {
      console.error('Error registering applicant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    setLoading(true)

    try {
      await account.createEmailPasswordSession({
        email: normalizeEmail(
          requireValue(email, 'Email address')
        ),
        password: requireValue(password, 'Password'),
      })

      /*
       * Do not read the React `user` state here.
       * loadCurrentUser() returns the actual freshly authenticated user.
       */
      const authenticatedUser = await loadCurrentUser()

      setUser(authenticatedUser)
      router.replace(getDashboardPath(authenticatedUser.Role))

      return authenticatedUser
    } catch (error) {
      setUser(null)
      console.error('Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    setLoading(true)

    try {
      await account.deleteSession({
        sessionId: 'current',
      })
    } catch (error) {
      if (getErrorCode(error) !== 401) {
        console.error('Logout error:', error)
        throw error
      }
    } finally {
      setUser(null)
      setLoading(false)
      router.replace('/')
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
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}