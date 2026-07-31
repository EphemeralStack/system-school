'use client'

import { useEffect, useState } from 'react'
import { Query } from 'appwrite'
import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  School,
  User,
  Users,
  X,
} from 'lucide-react'

import { databases } from '@/lib/appwrite/config'
import { createClassAsAdmin } from '@/lib/admin/manage-class'
import { ZIMBABWE_PRIMARY_GRADES } from '@/lib/school/primary-school-options'

interface AddClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  schoolId?: string
}

interface TeacherOption {
  $id: string
  userId?: string
  FirstName?: string
  LastName?: string
  Email?: string
  SubjectSpecialization?: string
}

const LEVEL_FORM_OPTIONS = ZIMBABWE_PRIMARY_GRADES

export const AddClassModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddClassModalProps) => {
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [formData, setFormData] = useState({
    name: '',
    teacherId: '',
    levelOrForm: '',
    room: '',
  })

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadTeachers = async () => {
      setLoadingTeachers(true)
      setError('')

      try {
        const [teachersResponse, usersResponse, classesResponse] =
          await Promise.all([
            databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
              [Query.equal('Status', 'active'), Query.limit(100)]
            ),
            databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
              [Query.limit(100)]
            ),
            databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
              [Query.limit(100)]
            ),
          ])

        if (cancelled) return

        const assignedTeacherIds = new Set(
          classesResponse.documents
            .map((row) => String(row.teacherId || '').trim())
            .filter(Boolean)
        )

        const usersById = new Map(
          usersResponse.documents.map((user) => [user.$id, user])
        )

        setTeachers(
          teachersResponse.documents
            .filter((teacher) => !assignedTeacherIds.has(teacher.$id))
            .map((teacher) => {
              const user = teacher.userId
                ? usersById.get(String(teacher.userId))
                : null

              return {
                $id: teacher.$id,
                userId: teacher.userId
                  ? String(teacher.userId)
                  : undefined,
                FirstName: String(user?.FirstName || ''),
                LastName: String(user?.LastName || ''),
                Email: String(user?.Email || ''),
                SubjectSpecialization: String(
                  teacher.SubjectSpecialization || ''
                ),
              }
            })
        )
      } catch (loadError) {
        console.error('Error fetching available teachers:', loadError)

        if (!cancelled) {
          setTeachers([])
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load available teachers.'
          )
        }
      } finally {
        if (!cancelled) setLoadingTeachers(false)
      }
    }

    void loadTeachers()

    return () => {
      cancelled = true
    }
  }, [isOpen])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const name = formData.name.trim()
    const teacherId = formData.teacherId.trim()
    const levelOrForm = formData.levelOrForm.trim()
    const room = formData.room.trim().toUpperCase()

    if (!name || !teacherId || !levelOrForm || !room) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

    try {
      await createClassAsAdmin({
        name,
        teacherId,
        levelOrForm,
        room,
      })

      setFormData({
        name: '',
        teacherId: '',
        levelOrForm: '',
        room: '',
      })

      onSuccess()
      onClose()
    } catch (submitError) {
      console.error('Error adding class:', submitError)
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to add class.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-gray-300 bg-white sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-gray-300 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">Add New Class</h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-lg border-2 border-gray-300 p-2 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-red-500" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border-2 border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Class Name *
            </label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                placeholder="e.g., Mathematics A"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Teacher *
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                required
                value={formData.teacherId}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    teacherId: event.target.value,
                  }))
                }
                className="w-full appearance-none rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
              >
                <option value="">Select Teacher</option>
                {loadingTeachers ? (
                  <option disabled>Loading teachers...</option>
                ) : teachers.length === 0 ? (
                  <option disabled>No unassigned active teachers</option>
                ) : (
                  teachers.map((teacher) => {
                    const fullName =
                      `${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim()
                    const label =
                      fullName ||
                      teacher.Email ||
                      teacher.SubjectSpecialization ||
                      `Teacher ${teacher.$id.slice(-6)}`

                    return (
                      <option key={teacher.$id} value={teacher.$id}>
                        {label}
                        {teacher.Email && fullName
                          ? ` (${teacher.Email})`
                          : ''}
                      </option>
                    )
                  })
                )}
              </select>
            </div>

            {!loadingTeachers && teachers.length === 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                Every active teacher is already assigned to a class.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Grade *
            </label>
            <div className="relative">
              <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                required
                value={formData.levelOrForm}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    levelOrForm: event.target.value,
                  }))
                }
                className="w-full appearance-none rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
              >
                <option value="">Select grade</option>
                {LEVEL_FORM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Room *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={formData.room}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    room: event.target.value.toUpperCase(),
                  }))
                }
                className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 uppercase text-blue-950 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]"
                placeholder="e.g., ROOM 101"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t-2 border-gray-300 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingTeachers ||
                teachers.length === 0
              }
              className="flex items-center gap-2 rounded-lg border-2 border-[#C75712] bg-[#C75712] px-6 py-2 text-white hover:bg-[#D96A1E] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
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
