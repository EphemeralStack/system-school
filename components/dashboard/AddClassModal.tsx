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

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoadingTeachers(true)
        
        const teachersResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
          [Query.equal('Status', 'active')]
        )
        
        const teachersWithUsers = []
        for (const teacher of teachersResponse.documents) {
          if (teacher.userId) {
            const userResponse = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
              [Query.equal('$id', teacher.userId)]
            )
            if (userResponse.documents.length > 0) {
              const user = userResponse.documents[0]
              teachersWithUsers.push({
                ...teacher,
                FirstName: user.FirstName || '',
                LastName: user.LastName || '',
                Email: user.Email || '',
              })
            }
          }
        }
        
        setTeachers(teachersWithUsers)
      } catch (error) {
        console.error('Error fetching teachers:', error)
      } finally {
        setLoadingTeachers(false)
      }
    }
    fetchTeachers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.teacherId || !formData.levelOrForm || !formData.room) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const existingClasses = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        [Query.equal('teacherId', formData.teacherId)]
      )

      if (existingClasses.documents.length > 0) {
        setError('This teacher is already assigned to another class. Each teacher can only be assigned to one class.')
        setLoading(false)
        return
      }

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        ID.unique(),
        {
          name: formData.name,
          teacherId: formData.teacherId,
          LevelOrForm: formData.levelOrForm,
          Room: formData.room.toUpperCase(),
        }
      )

      onSuccess()
      onClose()
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

  const levelFormOptions = [
    'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6',
    'Lower Six', 'Upper Six', 'O-Level', 'A-Level', 'Primary',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto border-2 border-gray-300">
        <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Add New Class</h2>
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
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  placeholder="e.g., Mathematics A, Science B"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] appearance-none"
                  required
                >
                  <option value="" className="text-blue-950">Select Teacher</option>
                  {loadingTeachers ? (
                    <option disabled className="text-blue-950">Loading teachers...</option>
                  ) : teachers.length === 0 ? (
                    <option disabled className="text-blue-950">No available teachers. All teachers are assigned to classes.</option>
                  ) : (
                    teachers.map((teacher) => {
                      const fullName = teacher.FirstName && teacher.LastName 
                        ? `${teacher.FirstName} ${teacher.LastName}`
                        : teacher.Email || `Teacher ${teacher.$id.slice(-6)}`
                      return (
                        <option key={teacher.$id} value={teacher.$id} className="text-blue-950">
                          {fullName}
                        </option>
                      )
                    })
                  )}
                </select>
              </div>
              {teachers.length === 0 && !loadingTeachers && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  All teachers are currently assigned to classes. Each teacher can only have one class.
                </p>
              )}
              {!loadingTeachers && teachers.length > 0 && (
                <p className="text-[10px] text-green-600 mt-1">
                  Showing {teachers.length} available teacher(s) not assigned to any class
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level or Form *</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.levelOrForm}
                  onChange={(e) => setFormData({ ...formData, levelOrForm: e.target.value })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] appearance-none"
                  required
                >
                  <option value="" className="text-blue-950">Select Level or Form</option>
                  {levelFormOptions.map((option) => (
                    <option key={option} value={option} className="text-blue-950">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value.toUpperCase() })}
                  className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] uppercase"
                  placeholder="e.g., ROOM 101, A1"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Will be automatically converted to uppercase</p>
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
              disabled={loading || loadingTeachers || teachers.length === 0}
              className="px-6 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border-2 border-[#C75712]"
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