// components/dashboard/AddApplicantModal.tsx
'use client'

import { useState } from 'react'
import { databases, storage } from '@/lib/appwrite/config'
import { ID } from 'appwrite'
import { X, Loader2, User, Mail, Phone, School, BookOpen, Calendar, Lock, UserLock, Check, Image as ImageIcon, MapPin, AlertCircle } from 'lucide-react'

interface AddApplicantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  schoolId: string
}

export const AddApplicantModal = ({ isOpen, onClose, onSuccess, schoolId }: AddApplicantModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    levelOrFormApplied: '',
    applicationNo: '',
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

  // Generate application number in sequence format
  const generateApplicationNo = (): string => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `APP-${year}${month}${day}-${random}`
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
      // Generate application number if not manually provided
      const applicationNo = formData.applicationNo || generateApplicationNo()

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
          Role: 'applicant',
          avatar: formData.avatar || '',
        }
      )

      // 2. Create applicant document with only the specified fields
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID!,
        ID.unique(),
        {
          userId: userDoc.$id,
          ApplicationNo: applicationNo,
          LevelOrFormApplied: formData.levelOrFormApplied || '',
          Status: 'pending', // Auto-set to pending
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
        levelOrFormApplied: '',
        applicationNo: '',
        avatar: '',
        avatarFileId: '',
      })
      setAvatarPreview(null)
    } catch (error) {
      console.error('Error adding applicant:', error)
      setError(error instanceof Error ? error.message : 'Failed to add applicant')
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto border-2 border-gray-300">
        <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Add New Applicant</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center gap-2 border-2 border-red-200">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="First Name"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Last Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Email Address"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Password (min. 8 chars)"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <UserLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="Confirm Password"
                />
              </div>
            </div>

            {/* Level or Form Applied */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level or Form Applied</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.levelOrFormApplied}
                  onChange={(e) => setFormData({ ...formData, levelOrFormApplied: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] appearance-none"
                >
                  <option value="" className="text-blue-950">Select Level/Form</option>
                  <option value="Form 1" className="text-blue-950">Form 1</option>
                  <option value="Form 2" className="text-blue-950">Form 2</option>
                  <option value="Form 3" className="text-blue-950">Form 3</option>
                  <option value="Form 4" className="text-blue-950">Form 4</option>
                  <option value="Form 5" className="text-blue-950">Form 5</option>
                  <option value="Form 6" className="text-blue-950">Form 6</option>
                  <option value="Lower Six" className="text-blue-950">Lower Six</option>
                  <option value="Upper Six" className="text-blue-950">Upper Six</option>
                  <option value="O-Level" className="text-blue-950">O-Level</option>
                  <option value="A-Level" className="text-blue-950">A-Level</option>
                  <option value="Primary" className="text-blue-950">Primary</option>
                </select>
              </div>
            </div>

            {/* Application Number & Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Number</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.applicationNo}
                  onChange={(e) => setFormData({ ...formData, applicationNo: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="APP-20260101-XXXX (auto-generates)"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Leave empty to auto-generate</p>
            </div>

            {/* Avatar - Now in the same row as Application Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 hover:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden bg-gray-50 group">
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-[#C75712] border-t-transparent rounded-full animate-spin" />
                      ) : avatarPreview ? (
                        <img 
                          src={avatarPreview} 
                          alt="Avatar preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : formData.firstName && formData.lastName ? (
                        <div 
                          className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: initialsColor }}
                        >
                          {displayInitials}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-[#C75712] transition-colors" />
                          <span className="text-[6px] text-center text-gray-400 block mt-0.5">Photo</span>
                        </div>
                      )}
                    </div>
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 hover:bg-red-600 transition shadow-sm"
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Upload photo</p>
                  <p className="text-[10px] text-gray-400">PNG, JPG, WEBP</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="px-6 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border-2 border-[#C75712]"
            >
              {loading || uploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadingAvatar ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Applicant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}