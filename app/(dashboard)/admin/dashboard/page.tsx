// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AddClassModal } from '@/components/dashboard/AddClassModal'
import { useAuth } from '@/contexts/auth-context'
import { databases, storage } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { 
  ArrowLeft, 
  Home, 
  FileText, 
  User, 
  Bell, 
  AlertCircle,
  Clock,
  Lock,
  Search,
  Menu,
  Eye,
  X,
  Settings,
  Search as SearchIcon,
  Grid,
  Users,
  BarChart3,
  DollarSign,
  School,
  BookOpen,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  Check,
  X as XIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  GraduationCap,
  Briefcase,
  CreditCard,
  Shield,
  Info,
  Loader2,
  ChevronDown,
  LogOut,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

// Import dashboard components
import { 
  StatsCard, 
  FinancialLedger, 
  RbacMatrix, 
  SectionPlaceholder 
} from '@/components/dashboard'
import { AddStudentModal } from '@/components/dashboard/AddStudentModal'
import { AddTeacherModal } from '@/components/dashboard/AddTeacherModal'
import { AddApplicantModal } from '@/components/dashboard/AddApplicantModal'

import FinancialAuditDesk, {
  FinancialAuditSidePanel,
} from '@/components/dashboard/financial-audit/FinancialAuditDesk'

import UserAccountsDesk, {
  UserAccountsSidePanel,
} from '@/components/dashboard/user-accounts/UserAccountsDesk'

import {
  GlobalConfigLiveSidePanel,
  GlobalConfigLiveWorkspace,
} from '@/components/dashboard/global-config/GlobalConfigLive'

// ============= LEFT PANEL SECTIONS =============
const LEFT_SECTIONS = [
  { id: 'global-config', label: 'Global Configuration', icon: Settings },
  { id: 'financial-audit', label: 'Financial Auditing Desk', icon: SearchIcon },
  { id: 'academic-matrix', label: 'Academic Matrix Setup', icon: Grid },
  { id: 'user-accounts', label: 'User Accounts', icon: Users },
]

// ============= SCHOOL SETUP FORM =============
const SchoolSetupForm = ({ onClose, onSave, initialData }: { onClose: () => void; onSave: (data: any) => void; initialData?: any }) => {
  const [formData, setFormData] = useState({
    Name: initialData?.Name || '',
    Address: initialData?.Address || '',
    ContactEmail: initialData?.ContactEmail || '',
    ContactPhone: initialData?.ContactPhone || '',
    LogoUrl: initialData?.LogoUrl || '',
    Status: initialData?.Status || 'active',
  })
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.LogoUrl || null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      const uploadedFile = await storage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
        ID.unique(),
        file
      )
      
      const previewUrl = storage.getFileView(
        process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
        uploadedFile.$id
      ).toString()
      
      setFormData({ ...formData, LogoUrl: previewUrl })
      
    } catch (error) {
      console.error('Error uploading logo:', error)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving school:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[#232A42] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#232A42] -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 z-10">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">
            {initialData ? 'Edit School Details' : 'Add School Details'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full border-2 border-dashed border-gray-500 hover:border-[#C75712] active:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden bg-gray-800/50 group cursor-pointer touch-manipulation"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#C75712] animate-spin" />
                ) : logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="School logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-2">
                    <Building2 className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400 mx-auto mb-1" />
                    <span className="text-[10px] sm:text-xs text-gray-400 block">Upload Logo</span>
                  </div>
                )}
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleImageUpload}
                className="hidden"
              />
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null)
                    setFormData({ ...formData, LogoUrl: '' })
                  }}
                  aria-label="Remove logo"
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 rounded-full p-1.5 sm:p-1 hover:bg-red-600 transition touch-manipulation"
                >
                  <XIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center px-4">
              Tap to upload school logo (PNG, JPG, WEBP, SVG)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">School Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.Name}
                onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-700 focus:border-[#C75712] focus:outline-none"
                placeholder="Enter school name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.Address}
                onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-700 focus:border-[#C75712] focus:outline-none"
                placeholder="Enter school address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.ContactEmail}
                  onChange={(e) => setFormData({ ...formData, ContactEmail: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="school@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.ContactPhone}
                  onChange={(e) => setFormData({ ...formData, ContactPhone: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>

          <input type="hidden" value={formData.LogoUrl} />

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 pb-1 sticky bottom-0 bg-[#232A42] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-sm sm:text-base text-gray-400 hover:text-white transition-colors order-2 sm:order-1 rounded-lg hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingLogo}
              className="px-6 py-2.5 sm:py-2 text-sm sm:text-base bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2 touch-manipulation"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Saving...' : initialData ? 'Update School' : 'Save School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

let cachedAdminSchoolData: any = null
// ============= MAIN DASHBOARD =============
const AdminDashboard = () => {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('global-config')

  // FINANCIAL_SECTION_URL_SYNC
  useEffect(() => {
    const syncSectionFromUrl = () => {
      const requestedSection =
        new URLSearchParams(
          window.location.search
        ).get('section')

      if (
        requestedSection === 'global-config' ||
        requestedSection === 'financial-audit' ||
        requestedSection === 'user-accounts'
      ) {
        setActiveSection(
          requestedSection
        )
      }
    }

    syncSectionFromUrl()

    window.addEventListener(
      'popstate',
      syncSectionFromUrl
    )

    return () => {
      window.removeEventListener(
        'popstate',
        syncSectionFromUrl
      )
    }
  }, [])
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [showSchoolSetup, setShowSchoolSetup] = useState(false)
  const [schoolData, setSchoolData] = useState<any>(
    () => cachedAdminSchoolData
  )
  const [loading, setLoading] = useState(
    () => cachedAdminSchoolData === null
  )
  const [studentCount, setStudentCount] = useState(0)
  const [teacherCount, setTeacherCount] = useState(0)
  const [applicantCount, setApplicantCount] = useState(0)
  const [classCount, setClassCount] = useState(0)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [showAddApplicant, setShowAddApplicant] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Get user initials for avatar
  const getUserInitials = () => {
    const firstName = user?.FirstName || ''
    const lastName = user?.LastName || ''
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  // Get user full name
  const getFullName = () => {
    const firstName = user?.FirstName || ''
    const lastName = user?.LastName || ''
    return `${firstName} ${lastName}`.trim() || 'User'
  }

  // Get user role display name
  const getRoleDisplay = () => {
    const role = user?.Role || 'admin'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  // Get avatar URL or use initials
  const getAvatarUrl = () => {
    return user?.avatar || null
  }

  // Handle add student
  const handleAddStudent = () => {
    setShowAddStudent(true)
  }

  // Handle add teacher
  const handleAddTeacher = () => {
    setShowAddTeacher(true)
  }

  // Handle add applicant
  const handleAddApplicant = () => {
    setShowAddApplicant(true)
  }

  // Handle add class
  const handleAddClass = () => {
    setShowAddClass(true)
  }

  const refreshAdminSnapshots = (
    ...eventNames: string[]
  ) => {
    eventNames.forEach(
      (eventName) =>
        window.dispatchEvent(
          new CustomEvent(
            eventName
          )
        )
    )
  }

  // Handle class added successfully
  const handleClassAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix'
    )
  }

  // Handle student added successfully
  const handleStudentAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix',
      'user-accounts:refresh'
    )
  }

  // Handle teacher added successfully
  const handleTeacherAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix',
      'user-accounts:refresh'
    )
  }

  // Handle applicant added successfully
  const handleApplicantAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'user-accounts:refresh'
    )
  }

  // Navigation handlers
  const handleViewStudents = () => {
    router.push('/admin/students')
  }

  const handleViewTeachers = () => {
    router.push('/admin/teachers')
  }

  const handleViewApplicants = () => {
    router.push('/admin/applicants')
  }

  const handleViewClasses = () => {
    router.push('/admin/classes')
  }

  // Fetch all counts
  const fetchCounts = async () => {
    try {
      // Get total students count
      const studentsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        [Query.limit(1)]
      )
      setStudentCount(studentsResponse.total)

      // Get total teachers count
      const teachersResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        [Query.limit(1)]
      )
      setTeacherCount(teachersResponse.total)

      // Get total applicants count
      const applicantsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID!,
        [Query.limit(1)]
      )
      setApplicantCount(applicantsResponse.total)

      // Get total classes count
      const classesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        [Query.limit(1)]
      )
      setClassCount(classesResponse.total)

    } catch (error) {
      console.error('Error fetching counts:', error)
    }
  }

  // Fetch counts only once on initial mount
  useEffect(() => {
    if (isInitialLoad) {
      fetchCounts()
      setIsInitialLoad(false)
    }
  }, [isInitialLoad])

  // Check if school data exists
  useEffect(() => {
    const checkSchoolData = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!
        )
        if (response.documents.length > 0) {
          cachedAdminSchoolData =
            response.documents[0]

          setSchoolData(
            cachedAdminSchoolData
          )
        }
      } catch (error) {
        console.error('Error checking school data:', error)
      } finally {
        setLoading(false)
      }
    }
    checkSchoolData()
  }, [])

  // Close mobile panels when switching to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsLeftPanelOpen(false)
        setIsRightPanelOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock body scroll while a mobile panel is open
  useEffect(() => {
    if (isLeftPanelOpen || isRightPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isLeftPanelOpen, isRightPanelOpen])

  const handleSaveSchool = async (data: any) => {
    try {
      const response = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!,
        ID.unique(),
        {
          Name: data.Name,
          Address: data.Address,
          ContactEmail: data.ContactEmail,
          ContactPhone: data.ContactPhone,
          LogoUrl: data.LogoUrl,
          Status: data.Status || 'active',
        }
      )
      setSchoolData(response)
      return response
    } catch (error) {
      console.error('Error saving school:', error)
      throw error
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleShowAllLedger = () => {
    console.log('Show all ledger entries')
  }

  const handleShowAllRbac = () => {
    console.log('Show all RBAC entries')
  }

  const handleRbacEdit = (entry: any) => {
    console.log('Edit RBAC entry:', entry)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#E9E9E9] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#232A42] animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no school data, show setup screen
  if (!schoolData) {
    return (
      <div className="min-h-[100dvh] bg-[#E9E9E9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#232A42]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 sm:w-10 sm:h-10 text-[#232A42]" />
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Welcome to Your School Management System</h2>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Get started by adding your school details. This will set up your school profile and enable all features.
          </p>
          <button
            onClick={() => setShowSchoolSetup(true)}
            className="min-h-[44px] px-6 py-3 bg-[#C75712] hover:bg-[#D96A1E] active:bg-[#B84E10] text-white rounded-lg transition-colors flex items-center gap-2 mx-auto text-sm sm:text-base touch-manipulation"
          >
            <Plus className="w-5 h-5" />
            Add School Details
          </button>
          <p className="text-xs text-gray-400 mt-4">
            You can always update these details later from the settings panel.
          </p>
        </div>

        {showSchoolSetup && (
          <SchoolSetupForm
            onClose={() => setShowSchoolSetup(false)}
            onSave={handleSaveSchool}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#E9E9E9] flex flex-col lg:flex-row">
      {/* ===== MOBILE / TABLET HEADER ===== */}
      <div className="lg:hidden bg-[#232A42] text-white px-3 sm:px-4 py-3 flex items-center justify-between sticky top-0 z-30 safe-top">
        <button
          onClick={() => setIsLeftPanelOpen(true)}
          aria-label="Open navigation menu"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center -ml-2 text-gray-300 hover:text-white active:bg-white/10 rounded-lg transition-colors touch-manipulation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm sm:text-base font-semibold truncate max-w-[45%]">Admin Dashboard</h2>
        <button
          onClick={() => setIsRightPanelOpen(true)}
          aria-label="Open notifications"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center -mr-2 text-gray-300 hover:text-white active:bg-white/10 rounded-lg transition-colors touch-manipulation relative"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>

      {/* ===== LEFT PANEL ===== */}
      <div className={`
        lg:w-[220px] xl:w-[240px] lg:shrink-0 lg:min-h-[100dvh] lg:relative lg:flex lg:flex-col lg:translate-x-0
        fixed inset-y-0 left-0 z-40 w-[82%] max-w-[300px] sm:w-72 bg-[#232A42] text-white p-4 flex flex-col
        transition-transform duration-300 ease-in-out overflow-y-auto
        ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <button 
          onClick={() => setIsLeftPanelOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-3 right-3 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white active:bg-white/10 rounded-lg touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 mt-1 lg:mt-6">
          <span className="font-bold text-white">Navigator</span>
        </div>

        <div className="bg-[#D9D9D9]/15 rounded-lg p-2 mb-6">
          <div className="flex justify-between items-center">
            <div className="p-2 rounded-lg bg-[#2C3553] text-white">
              <Home className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-8">
          {LEFT_SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (section.id === 'academic-matrix') {
                    router.push('/admin/academic-matrix')
                    return
                  }

                  setActiveSection(section.id)
                  setIsLeftPanelOpen(false)

                  router.replace(
                    `/admin/dashboard?section=${section.id}`,
                    {
                      scroll: false,
                    }
                  )
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-xs sm:text-sm touch-manipulation
                  ${isActive 
                    ? 'bg-[#D9D9D9]/15 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#D9D9D9]/10 active:bg-[#D9D9D9]/20'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-medium truncate">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== MID SECTION ===== */}
      <div className="flex-1 min-w-0 p-3 bg-[#F5F5F2] sm:p-4 md:p-5 lg:p-6 overflow-y-auto lg:h-[100dvh]">
        <div className="relative mb-4 sm:mb-6 lg:mb-8 flex justify-center">
          <div className="bg-[#D9D9D9] rounded-b-lg px-3 sm:px-4 py-1.5 sm:py-2 inline-block max-w-full">
            <h2 className="text-[#232A42] font-bold text-xs sm:text-sm lg:text-base truncate">
              {LEFT_SECTIONS.find((s) => s.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative w-full sm:max-w-xs">
            <div className="flex items-center bg-[#D9D9D9] rounded-lg px-3 py-2 sm:py-1.5">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent text-gray-700 placeholder-gray-500 text-sm pl-2 pr-4 py-1 focus:outline-none w-full min-w-0"
              />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#2C3553] flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
              {getAvatarUrl() ? (
                <img src={getAvatarUrl()!} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getUserInitials() || <User className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-blue-950 truncate">{getFullName()}</div>
              <div className="text-xs text-gray-600 truncate">{getRoleDisplay()}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>

        {/* FINANCIAL_AUDIT_MIDDLE_SWITCH */}
        {/* USER_ACCOUNTS_MIDDLE_SWITCH */}
        {/* DATABASE_LIVE_MIDDLE_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditDesk />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsDesk
            onAddStudent={handleAddStudent}
            onAddTeacher={handleAddTeacher}
            onAddApplicant={handleAddApplicant}
          />
        ) : (
          <GlobalConfigLiveWorkspace
            onAddStudent={handleAddStudent}
            onAddTeacher={handleAddTeacher}
            onAddApplicant={handleAddApplicant}
            onAddClass={handleAddClass}
            onViewStudents={handleViewStudents}
            onViewTeachers={handleViewTeachers}
            onViewApplicants={handleViewApplicants}
            onViewClasses={handleViewClasses}
          />
        )}
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className={`
        lg:w-[260px] xl:w-[280px] lg:shrink-0 lg:min-h-[100dvh] lg:relative lg:block lg:translate-x-0
        lg:sticky lg:top-0 lg:h-[100dvh]
        fixed inset-y-0 right-0 z-40 w-[82%] max-w-[320px] sm:w-80 bg-[#232A42] text-white p-4 border-l border-white/10
        transition-transform duration-300 ease-in-out overflow-y-auto
        ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <button 
          onClick={() => setIsRightPanelOpen(false)}
          aria-label="Close notifications"
          className="lg:hidden absolute top-3 left-3 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-white active:bg-white/10 rounded-lg touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* FINANCIAL_AUDIT_RIGHT_SWITCH */}
        {/* USER_ACCOUNTS_RIGHT_SWITCH */}
        {/* DATABASE_LIVE_RIGHT_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditSidePanel />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsSidePanel />
        ) : (
          <GlobalConfigLiveSidePanel />
        )}
      </div>

      {/* Edit School Modal */}
      {showSchoolSetup && (
        <SchoolSetupForm
          onClose={() => setShowSchoolSetup(false)}
          onSave={async (data) => {
            try {
              await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!,
                schoolData.$id,
                {
                  Name: data.Name,
                  Address: data.Address,
                  ContactEmail: data.ContactEmail,
                  ContactPhone: data.ContactPhone,
                  LogoUrl: data.LogoUrl,
                  Status: data.Status || 'active',
                  updatedAt: new Date().toISOString(),
                }
              )
              const updatedSchoolData = {
                ...schoolData,
                Name: data.Name,
                Address: data.Address,
                ContactEmail:
                  data.ContactEmail,
                ContactPhone:
                  data.ContactPhone,
                LogoUrl: data.LogoUrl,
                Status:
                  data.Status || 'active',
              }

              cachedAdminSchoolData =
                updatedSchoolData

              setSchoolData(
                updatedSchoolData
              )
              setShowSchoolSetup(false)
            } catch (error) {
              console.error('Error updating school:', error)
              throw error
            }
          }}
          initialData={{
            Name: schoolData?.Name || '',
            Address: schoolData?.Address || '',
            ContactEmail: schoolData?.ContactEmail || '',
            ContactPhone: schoolData?.ContactPhone || '',
            LogoUrl: schoolData?.LogoUrl || '',
            Status: schoolData?.Status || 'active',
          }}
        />
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          isOpen={showAddStudent}
          onClose={() => setShowAddStudent(false)}
          onSuccess={handleStudentAdded}
          schoolId={schoolData.$id}
        />
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <AddTeacherModal
          isOpen={showAddTeacher}
          onClose={() => setShowAddTeacher(false)}
          onSuccess={handleTeacherAdded}
          schoolId={schoolData.$id}
        />
      )}

      {/* Add Applicant Modal */}
      {showAddApplicant && (
        <AddApplicantModal
          isOpen={showAddApplicant}
          onClose={() => setShowAddApplicant(false)}
          onSuccess={handleApplicantAdded}
          schoolId={schoolData.$id}
        />
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <AddClassModal
          isOpen={showAddClass}
          onClose={() => setShowAddClass(false)}
          onSuccess={handleClassAdded}
          schoolId={schoolData.$id}
        />
      )}

      {/* Overlay backdrop for mobile panels */}
      {(isLeftPanelOpen || isRightPanelOpen) && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => {
            setIsLeftPanelOpen(false)
            setIsRightPanelOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default AdminDashboard




