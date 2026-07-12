// components/dashboard/AddStudentModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { databases, storage } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { X, Loader2, User, Mail, Phone, School, BookOpen, Calendar, Check, Image as ImageIcon } from 'lucide-react'

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  schoolId: string
}

export const AddStudentModal = ({ isOpen, onClose, onSuccess, schoolId }: AddStudentModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    classId: '',
    level: '',
    form: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    status: 'active',
    avatar: '',
    avatarFileId: '',
  })

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

  // Fetch classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return
      try {
        setLoadingClasses(true)
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
          [Query.equal('schoolId', schoolId)]
        )
        setClasses(response.documents)
      } catch (error) {
        console.error('Error fetching classes:', error)
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [schoolId])

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
          .toString()

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

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.username || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Generate a unique student ID
      const studentId = `STU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

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
          schoolId: schoolId,
          classId: formData.classId || '',
          Level: formData.level || '',
          Form: formData.form || '',
          EnrollmentDate: formData.enrollmentDate || new Date().toISOString(),
          Status: formData.status || 'active',
        }
      )

      onSuccess()
      onClose()
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: '',
        classId: '',
        level: '',
        form: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active',
        avatar: '',
        avatarFileId: '',
      })
      setAvatarPreview(null)
    } catch (error) {
      console.error('Error adding student:', error)
      setError(error instanceof Error ? error.message : 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const displayInitials = formData.firstName && formData.lastName 
    ? getInitials(formData.firstName, formData.lastName) 
    : ''
  const initialsColor = formData.firstName && formData.lastName 
    ? getInitialsColor(formData.firstName, formData.lastName) 
    : '#F97316'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[#232A42] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#232A42] -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 z-10">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Add New Student</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

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
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-gray-500 hover:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden bg-gray-800/50 group">
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
                      className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white"
                      style={{ backgroundColor: initialsColor }}
                    >
                      {displayInitials}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 group-hover:text-[#C75712] transition-colors" />
                      <span className="text-[8px] sm:text-xs text-center text-gray-400 block mt-1">Add Photo</span>
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
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="First Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Email Address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">🔒</div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Password (min. 8 chars)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password *</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">🔒</div>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="Confirm Password"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Class</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none appearance-none"
                >
                  <option value="">Select Class</option>
                  {loadingClasses ? (
                    <option disabled>Loading classes...</option>
                  ) : classes.length === 0 ? (
                    <option disabled>No classes available</option>
                  ) : (
                    classes.map((cls) => (
                      <option key={cls.$id} value={cls.$id}>
                        {cls.LevelOrForm} - {cls.Room || 'No Room'}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Level</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none appearance-none"
                >
                  <option value="">Select Level</option>
                  <option value="O-Level">O-Level</option>
                  <option value="A-Level">A-Level</option>
                  <option value="Primary">Primary</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Form</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.form}
                  onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none appearance-none"
                >
                  <option value="">Select Form</option>
                  <option value="Form 1">Form 1</option>
                  <option value="Form 2">Form 2</option>
                  <option value="Form 3">Form 3</option>
                  <option value="Form 4">Form 4</option>
                  <option value="Lower Six">Lower Six</option>
                  <option value="Upper Six">Upper Six</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Enrollment Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.enrollmentDate}
                  onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-[#232A42] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-sm sm:text-base text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="px-6 py-2.5 sm:py-2 text-sm sm:text-base bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
            >
              {loading || uploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadingAvatar ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}