// app/auth/signup/page.tsx (or app/student/signup/page.tsx)
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { databases, storage } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { 
  User, 
  Mail, 
  Lock, 
  Image as ImageIcon, 
  ArrowRight, 
  Eye, 
  EyeOff,
  AlertCircle, 
  ChevronDown,
  School,
  BookOpen,
  Calendar,
  Check,
} from 'lucide-react'

// Combobox component
interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon?: React.ReactNode
  required?: boolean
  disabled?: boolean
}

const Combobox = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon,
  required = false,
  disabled = false 
}: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-10 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300 text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'
        }`}
        disabled={disabled}
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? selectedOption?.label || value : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          {icon}
        </div>
      )}

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-20 max-h-60 overflow-hidden">
            {/* Search */}
            <div className="sticky top-0 bg-gray-800 p-2 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700/50 text-white placeholder-gray-400 rounded-lg px-3 py-1.5 text-sm border border-gray-600 focus:border-[#C75712] focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="overflow-y-auto max-h-40">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-gray-400 text-sm text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className="w-full px-4 py-2.5 text-left text-white hover:bg-gray-700 transition-colors text-sm flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="w-4 h-4 text-[#C75712]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Level options
const LEVEL_OPTIONS = [
  { value: 'O-Level', label: 'O-Level' },
  { value: 'A-Level', label: 'A-Level' },
  { value: 'Primary', label: 'Primary' },
]

// Form options
const FORM_OPTIONS = [
  { value: 'Form 1', label: 'Form 1' },
  { value: 'Form 2', label: 'Form 2' },
  { value: 'Form 3', label: 'Form 3' },
  { value: 'Form 4', label: 'Form 4' },
  { value: 'Form 5', label: 'Form 5' },
  { value: 'Form 6', label: 'Form 6' },
  { value: 'Lower Six', label: 'Lower Six' },
  { value: 'Upper Six', label: 'Upper Six' },
]

const StudentSignUp = () => {
  const router = useRouter()
  const { registerStudent } = useAuth()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    level: '',
    form: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    avatar: '',
    avatarFileId: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [schoolData, setSchoolData] = useState<any>(null)
  const [loadingSchool, setLoadingSchool] = useState(true)

  // Fetch school data
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!
        )
        if (response.documents.length > 0) {
          setSchoolData(response.documents[0])
        }
      } catch (error) {
        console.error('Error fetching school:', error)
      } finally {
        setLoadingSchool(false)
      }
    }
    fetchSchool()
  }, [])

  // Get initials from name
  const getInitials = (firstName: string, lastName: string): string => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  // Generate consistent color based on name
  const getInitialsColor = (firstName: string, lastName: string): string => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
    ]
    const name = firstName + lastName
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  const handleAvatarUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp'

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setUploadingAvatar(true)
        setError('')

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Only JPG, PNG and WEBP images are allowed.')
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Avatar must be smaller than 5MB.')
        }

        const uploadedFile = await storage.createFile(
          process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
          ID.unique(),
          file
        )

        const previewUrl = storage
          .getFileView(process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!, uploadedFile.$id)
          .toString();

        setFormData((prev) => ({
          ...prev,
          avatar: previewUrl,
          avatarFileId: uploadedFile.$id,
        }))
        setAvatarPreview(previewUrl)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to upload avatar')
      } finally {
        setUploadingAvatar(false)
      }
    }
    input.click()
  }

  const removeAvatar = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: '',
      avatarFileId: '',
    }))
    setAvatarPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    console.log('🚀 Student registration form submitted:', formData)

    // Validate required fields
    if (!formData.firstName || !formData.lastName || 
        !formData.email || !formData.phone || !formData.username ||
        !formData.password || !formData.confirmPassword || 
        !formData.level || !formData.form) {
      setError('Please fill in all required fields')
      return
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Validate school exists
    if (!schoolData) {
      setError('School not found. Please contact administrator.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Create user in USERS collection
      const userDoc = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        {
          FirstName: formData.firstName,
          LastName: formData.lastName,
          Email: formData.email,
          Phone: formData.phone || '',
          Role: 'student',
          avatar: formData.avatar || '',
        }
      )

      // 2. Create student document
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: userDoc.$id,
          schoolId: schoolData.$id,
          Level: formData.level || '',
          Form: formData.form || '',
          EnrollmentDate: formData.enrollmentDate || new Date().toISOString(),
          Status: 'active',
        }
      )

      console.log('✅ Student registration successful')
      
      // Redirect to login page after successful registration
      router.push('/student/login?registered=true')
    } catch (err: unknown) {
      console.error('❌ Student registration error:', err)
      
      let errorMessage = 'Failed to register as student. Please try again.'
      if (err instanceof Error) {
        errorMessage = err.message
        if (err.message.includes('user already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in.'
        }
      }
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }

  const displayInitials = formData.firstName && formData.lastName 
    ? getInitials(formData.firstName, formData.lastName) 
    : ''
  const initialsColor = formData.firstName && formData.lastName 
    ? getInitialsColor(formData.firstName, formData.lastName) 
    : '#F97316'

  if (loadingSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#232A42]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C75712] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/kidsBg.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      {/* Sign Up Form */}
      <div className="relative w-full max-w-2xl z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo.png" 
                alt="StarLight Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Student Registration
            </h2>
            <p className="text-gray-400 text-sm">
              Create your student account for StarLight Management Suite
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-500/20 rounded-full">
              <School className="w-3 h-3 text-green-300" />
              <span className="text-xs text-green-300">Student Account</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center mb-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-500 hover:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden bg-gray-800/50 group">
                    {uploadingAvatar ? (
                      <div className="w-8 h-8 border-2 border-[#C75712] border-t-transparent rounded-full animate-spin" />
                    ) : avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : formData.firstName && formData.lastName ? (
                      <div 
                        className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                        style={{ backgroundColor: initialsColor }}
                      >
                        {displayInitials}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-[#C75712] transition-colors" />
                        <span className="text-xs text-center text-gray-400 block mt-1">Add Photo</span>
                      </div>
                    )}
                  </div>
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 2x2 Grid for Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Last Name */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email Address"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone Number"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Username */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="Username"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create Password (min. 8 chars)"
                  required
                  minLength={8}
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - Full Width */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm Password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Level and Form Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Level Combobox */}
              <Combobox
                options={LEVEL_OPTIONS}
                value={formData.level}
                onChange={(value) => setFormData({ ...formData, level: value })}
                placeholder="Select Level"
                icon={<BookOpen className="w-5 h-5" />}
                required
              />

              {/* Form Combobox */}
              <Combobox
                options={FORM_OPTIONS}
                value={formData.form}
                onChange={(value) => setFormData({ ...formData, form: value })}
                placeholder="Select Form"
                icon={<School className="w-5 h-5" />}
                required
              />
            </div>

            {/* Enrollment Date */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar className="w-5 h-5" />
              </div>
              <input
                type="date"
                name="enrollmentDate"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
            </div>

            {/* Password Hint */}
            {formData.password.length > 0 && formData.password.length < 8 && (
              <div className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                Password must be at least 8 characters
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || uploadingAvatar}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || uploadingAvatar ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {uploadingAvatar ? 'Uploading Avatar...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  Create Student Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have a student account?{' '}
              <Link 
                href="/student/login" 
                className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline"
              >
                Sign In
              </Link>
            </p>
            <p className="text-gray-500 text-xs mt-3">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentSignUp