// contexts/auth-context.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { account, databases } from '@/lib/appwrite/config'
import { ID } from 'appwrite'
import { useRouter } from 'next/navigation'

interface User {
  $id: string
  FirstName: string
  LastName: string
  Email: string
  phone: string
  avatar?: string
  avatarFileId?: string
  Role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean

  registerApplicant: (data: RegisterData) => Promise<void>
  registerAdmin: (data: RegisterData) => Promise<void>
  registerTeacher: (data: RegisterData) => Promise<void>
  registerStudent: (data: RegisterData) => Promise<void>

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getSchools: () => Promise<any[]>
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  hireDate?: string
  departmentId?: string
  qualification?: string
  subjectSpecialization?: string
  classId?: string
  level?: string
  form?: string
  phone: string
  password: string
  avatar?: string
  avatarFileId?: string
  Role?: string

  levelOrFormApplied?: string
  position?: string
  assignedArea?: string
  status?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const session = await account.get()
      setUser({
        $id: session.$id,
        FirstName: session.prefs?.FirstName || '',
        LastName: session.prefs?.LastName || '',
        Email: session.email,
        phone: session.phone || '',
        avatar: session.prefs?.avatar || '',
        avatarFileId: session.prefs?.avatarFileId || '',
        Role: session.prefs?.Role || 'applicant',
      })
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const getSchools = async () => {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!
      )
      return response.documents
    } catch (error) {
      console.error('Error fetching schools:', error)
      return []
    }
  }

  const registerAdmin = async (data: RegisterData) => {
    try {
      const fullName = `${data.firstName} ${data.lastName}`
      const newUser = await account.create(
        ID.unique(),
        data.email,
        data.password,
        fullName
      )

      await account.createEmailPasswordSession(data.email, data.password)

      await account.updatePrefs({

        phone: data.phone,
        avatar: data.avatar || '',
        avatarFileId: data.avatarFileId || '',
        Role: data.Role || 'admin',

        FirstName: data.firstName,
        LastName: data.lastName,
      })

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        {

          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          Role: "admin",
          avatar: data.avatar || "",
        }
      )

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: newUser.$id,
          Position: data.position || "Administrator",
          AssignedArea: data.assignedArea || "",
          Status: data.status || "active",
          avatar: data.avatar || "",
        }
      )

      setUser({
        $id: newUser.$id,
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        phone: data.phone,
        avatar: data.avatar || "",
        avatarFileId: data.avatarFileId || "",
        Role: "admin",
      })

      router.push("/admin/dashboard")
    } catch (error) {
      console.error('Error registering admin:', error)
      throw error
    }
  }

  const registerTeacher = async (data: RegisterData) => {
    try {
      const fullName = `${data.firstName} ${data.lastName}`
      const newUser = await account.create(
        ID.unique(),
        data.email,
        data.password,
        fullName
      )

      await account.createEmailPasswordSession(data.email, data.password)

      await account.updatePrefs({

        phone: data.phone,
        avatar: data.avatar || '',
        avatarFileId: data.avatarFileId || '',
        Role: data.Role || 'teacher',

        FirstName: data.firstName,
        LastName: data.lastName,
      })

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        {

          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          Role: "teacher",
          avatar: data.avatar || "",
        }
      )

      // Create teacher document
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: newUser.$id,
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          phone: data.phone,
          departmentId: data.departmentId || "",
          hireDate: data.hireDate || "",
          qualification: data.qualification || "",
          subjectSpecialization: data.subjectSpecialization || "",
          status: data.status || "active",
          avatar: data.avatar || "",
          avatarFileId: data.avatarFileId || "",
        }
      )

      setUser({
        $id: newUser.$id,
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        phone: data.phone,
        avatar: data.avatar || "",
        avatarFileId: data.avatarFileId || "",
        Role: "teacher",
      })

      router.push("/teacher/dashboard")
    } catch (error) {
      console.error('Error registering teacher:', error)
      throw error
    }
  }

  const registerStudent = async (data: RegisterData) => {
    try {
      const fullName = `${data.firstName} ${data.lastName}`
      const newUser = await account.create(
        ID.unique(),
        data.email,
        data.password,
        fullName
      )

      await account.createEmailPasswordSession(data.email, data.password)

      await account.updatePrefs({

        phone: data.phone,
        avatar: data.avatar || '',
        avatarFileId: data.avatarFileId || '',
        Role: data.Role || 'student',
        FirstName: data.firstName,
        LastName: data.lastName,
      })

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        {
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          Role: "student",
          avatar: data.avatar || "",
        }
      )

      // Create student document
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: newUser.$id,
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          phone: data.phone,
          classId: data.classId || "",
          level: data.level || "",
          form: data.form || "",
          enrollmentDate: new Date().toISOString(),
          status: data.status || "active",
          avatar: data.avatar || "",
          avatarFileId: data.avatarFileId || "",
        }
      )

      setUser({
        $id: newUser.$id,
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        phone: data.phone,
        avatar: data.avatar || "",
        avatarFileId: data.avatarFileId || "",
        Role: "student",
      })

      router.push("/student/dashboard")
    } catch (error) {
      console.error('Error registering student:', error)
      throw error
    }
  }

  const registerApplicant = async (data: RegisterData) => {
    try {
      console.log('🚀 Starting applicant registration...')

      // 1. Generate application number
      const applicationNo = `APP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // 2. Create Appwrite Auth account
      const fullName = `${data.firstName} ${data.lastName}`
      console.log('📝 Creating user account for:', data.email)

      const newUser = await account.create(
        ID.unique(),
        data.email,
        data.password,
        fullName
      )
      console.log('✅ User account created:', newUser.$id)

      // 3. Login
      await account.createEmailPasswordSession(data.email, data.password)
      console.log('✅ Session created')

      // 4. Update preferences
      await account.updatePrefs({
        phone: data.phone,
        avatar: data.avatar || "",
        avatarFileId: data.avatarFileId || "",
        Role: "applicant",
        FirstName: data.firstName,
        LastName: data.lastName,
      })
      console.log('✅ Preferences updated')

      // 5. USERS collection
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        {
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          Role: "applicant",
          avatar: data.avatar || "",
          avatarFileId: data.avatarFileId || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      )
      console.log('✅ User document created')

      // 6. APPLICANTS collection
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: newUser.$id,
          applicationNo: applicationNo,
          levelOrFormApplied: data.levelOrFormApplied || "",
          status: "pending",
          FirstName: data.firstName,
          LastName: data.lastName,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar || "",
          avatarFileId: data.avatarFileId || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      )
      console.log('✅ Applicant document created')

      // 7. Update state
      setUser({
        $id: newUser.$id,
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        phone: data.phone,
        avatar: data.avatar || "",
        avatarFileId: data.avatarFileId || "",
        Role: "applicant",
      })

      console.log('🎉 Applicant registration complete!')
      router.push("/applicant/dashboard")
    } catch (error) {
      console.error("❌ Applicant registration error:", error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password)
      await checkUser()
      
      // Redirect based on role
      const userRole = user?.Role || 'applicant'
      switch (userRole) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'teacher':
          router.push('/teacher/dashboard')
          break
        case 'student':
          router.push('/student/dashboard')
          break
        default:
          router.push('/applicant/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      registerApplicant, 
      registerAdmin, 
      registerTeacher, 
      registerStudent, 
      login, 
      logout, 
      getSchools 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}