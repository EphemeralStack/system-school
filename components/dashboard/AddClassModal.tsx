// components/dashboard/AddClassModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { databases } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { X, Loader2, School, BookOpen, User, Users, Check, AlertCircle } from 'lucide-react'

interface AddClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  schoolId: string
}

export const AddClassModal = ({ isOpen, onClose, onSuccess, schoolId }: AddClassModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<any[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    teacherId: '',
    levelOrForm: '',
    room: '',
  })

  // Fetch teachers for dropdown - only those not already assigned to a class
  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) return
      try {
        setLoadingTeachers(true)
        
        // First, get all active teachers
        const teachersResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
          [
            Query.equal('schoolId', schoolId),
            Query.equal('Status', 'active')
          ]
        )
        
        // Get all classes to check which teachers are already assigned
        const classesResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
          [
            Query.equal('schoolId', schoolId)
          ]
        )
        
        // Get teacher IDs that are already assigned to a class
        const assignedTeacherIds = new Set(
          classesResponse.documents
            .map(cls => cls.teacherId)
            .filter(id => id) // Remove null/undefined
        )
        
        // Filter out teachers who are already assigned
        const availableTeachers = teachersResponse.documents.filter(
          teacher => !assignedTeacherIds.has(teacher.$id)
        )
        
        setTeachers(availableTeachers)
      } catch (error) {
        console.error('Error fetching teachers:', error)
      } finally {
        setLoadingTeachers(false)
      }
    }
    fetchTeachers()
  }, [schoolId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.name || !formData.teacherId || !formData.levelOrForm || !formData.room) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Double-check that the teacher isn't already assigned to another class
      const existingClasses = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        [
          Query.equal('teacherId', formData.teacherId)
        ]
      )

      if (existingClasses.documents.length > 0) {
        setError('This teacher is already assigned to another class. Each teacher can only be assigned to one class.')
        setLoading(false)
        return
      }

      // Create class document
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        ID.unique(),
        {
          Name: formData.name,
          teacherId: formData.teacherId,
          LevelOrForm: formData.levelOrForm,
          Room: formData.room.toUpperCase(),
        }
      )

      onSuccess()
      onClose()
      // Reset form
      setFormData({
        name: '',
        teacherId: '',
        levelOrForm: '',
        room: '',
      })
    } catch (error) {
      console.error('Error adding class:', error)
      setError(error instanceof Error ? error.message : 'Failed to add class')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Level/Form options
  const levelFormOptions = [
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Form 6',
    'Lower Six',
    'Upper Six',
    'O-Level',
    'A-Level',
    'Primary',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[#232A42] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#232A42] -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 z-10">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Add New Class</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Class Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Class Name *</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="e.g., Mathematics A, Science B"
                />
              </div>
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teacher *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none appearance-none"
                  required
                >
                  <option value="">Select Teacher</option>
                  {loadingTeachers ? (
                    <option disabled>Loading teachers...</option>
                  ) : teachers.length === 0 ? (
                    <option disabled>No available teachers. All teachers are assigned to classes.</option>
                  ) : (
                    teachers.map((teacher) => {
                      // Try to get teacher name from user data
                      const teacherName = teacher.userId ? `Teacher ${teacher.userId.slice(-6)}` : `Teacher ${teacher.$id.slice(-6)}`
                      return (
                        <option key={teacher.$id} value={teacher.$id}>
                          {teacherName}
                        </option>
                      )
                    })
                  )}
                </select>
              </div>
              {teachers.length === 0 && !loadingTeachers && (
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  All teachers are currently assigned to classes. Each teacher can only have one class.
                </p>
              )}
              {!loadingTeachers && teachers.length > 0 && (
                <p className="text-[10px] text-green-400 mt-1">
                  Showing {teachers.length} available teacher(s) not assigned to any class
                </p>
              )}
            </div>

            {/* Level or Form */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Level or Form *</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.levelOrForm}
                  onChange={(e) => setFormData({ ...formData, levelOrForm: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none appearance-none"
                  required
                >
                  <option value="">Select Level or Form</option>
                  {levelFormOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Room *</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#C75712] focus:outline-none uppercase"
                  placeholder="e.g., ROOM 101, A1"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Will be automatically converted to uppercase</p>
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
              disabled={loading || loadingTeachers || teachers.length === 0}
              className="px-6 py-2.5 sm:py-2 text-sm sm:text-base bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Class
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}