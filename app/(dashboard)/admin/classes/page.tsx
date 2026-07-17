// app/(dashboard)/admin/classes/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { databases } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { AddClassModal } from '@/components/dashboard/AddClassModal'
import { 
  ArrowLeft, 
  School, 
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Plus,
  Trash2,
  User,
  X,
  Check,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Users,
  Filter,
  Download,
} from 'lucide-react'

const ClassesPage = () => {
  const router = useRouter()
  const [classes, setClasses] = useState<any[]>([])
  const [teachersMap, setTeachersMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Modal states
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddClassModal, setShowAddClassModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  // Filter states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    name: '',
    levelOrForm: '',
    room: '',
    teacherId: '',
  })

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

  useEffect(() => {
    fetchClasses()
  }, [currentPage])

  // Fetch teacher details - from Teachers collection and Users collection
  const fetchTeacherDetails = async (teacherId: string) => {
    try {
      if (!teacherId) return null
      
      // First, get the teacher document from Teachers collection
      const teacherResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        [Query.equal('$id', teacherId)]
      )
      
      if (teacherResponse.documents.length === 0) {
        return null
      }
      
      const teacherDoc = teacherResponse.documents[0]
      
      // Now fetch the user details using the userId from teacher document
      if (teacherDoc.userId) {
        const userResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          [Query.equal('$id', teacherDoc.userId)]
        )
        
        if (userResponse.documents.length > 0) {
          const userData = userResponse.documents[0]
          return {
            ...teacherDoc,
            FirstName: userData.FirstName || '',
            LastName: userData.LastName || '',
            Email: userData.Email || '',
            Phone: userData.Phone || '',
            avatar: userData.avatar || '',
            SubjectSpecialization: teacherDoc.SubjectSpecialization || '',
            Qualification: teacherDoc.Qualification || '',
            Status: teacherDoc.Status || '',
            HireDate: teacherDoc.HireDate || '',
          }
        }
      }
      
      return teacherDoc
    } catch (error) {
      console.error('Error fetching teacher details:', error)
      return null
    }
  }

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        [
          Query.limit(itemsPerPage),
          Query.offset((currentPage - 1) * itemsPerPage),
          Query.orderDesc('$createdAt')
        ]
      )
      
      setClasses(response.documents)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalItems(response.total)

      const teacherIds = response.documents
        .map(cls => cls.teacherId)
        .filter(id => id && id !== '')

      const teacherMap: Record<string, any> = {}
      for (const id of teacherIds) {
        const teacher = await fetchTeacherDetails(id)
        if (teacher) {
          teacherMap[id] = teacher
        }
      }
      setTeachersMap(teacherMap)

    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch available teachers for edit modal
  const fetchAvailableTeachers = async () => {
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
              Phone: user.Phone || '',
              avatar: user.avatar || '',
            })
          } else {
            teachersWithUsers.push(teacher)
          }
        } else {
          teachersWithUsers.push(teacher)
        }
      }
      
      setAvailableTeachers(teachersWithUsers)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoadingTeachers(false)
    }
  }

  // Apply filters
  const getFilteredClasses = () => {
    let filtered = classes

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cls => 
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.LevelOrForm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.Room?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Level filter
    if (filterLevel) {
      filtered = filtered.filter(cls => cls.LevelOrForm === filterLevel)
    }

    // Status filter (with/without teacher)
    if (filterStatus === 'with_teacher') {
      filtered = filtered.filter(cls => cls.teacherId && teachersMap[cls.teacherId])
    } else if (filterStatus === 'without_teacher') {
      filtered = filtered.filter(cls => !cls.teacherId || !teachersMap[cls.teacherId])
    }

    return filtered
  }

  const filteredClasses = getFilteredClasses()

  // Clear all filters
  const clearFilters = () => {
    setFilterLevel('')
    setFilterStatus('')
    setSearchTerm('')
    setShowFilterDropdown(false)
  }

  // Export CSV functionality
  const exportCSV = () => {
    const headers = ['#', 'Class Name', 'Level/Form', 'Room', 'Teacher', 'Teacher Email', 'Teacher Phone']
    const rows = filteredClasses.map((cls, index) => {
      const teacher = cls.teacherId ? teachersMap[cls.teacherId] : null
      return [
        index + 1,
        cls.name || 'Unnamed Class',
        cls.LevelOrForm || 'N/A',
        cls.Room || 'N/A',
        teacher ? getTeacherName(cls.teacherId) : 'Not assigned',
        teacher ? teacher.Email || '' : '',
        teacher ? teacher.Phone || '' : '',
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `classes_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleView = (cls: any) => {
    setSelectedClass(cls)
    const teacher = cls.teacherId ? teachersMap[cls.teacherId] : null
    setSelectedTeacher(teacher)
    setShowViewModal(true)
  }

  const handleEdit = async (cls: any) => {
    setSelectedClass(cls)
    setEditFormData({
      name: cls.name || '',
      levelOrForm: cls.LevelOrForm || '',
      room: cls.Room || '',
      teacherId: cls.teacherId || '',
    })
    await fetchAvailableTeachers()
    setShowEditModal(true)
    setError('')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        selectedClass.$id,
        {
          name: editFormData.name,
          LevelOrForm: editFormData.levelOrForm,
          Room: editFormData.room.toUpperCase(),
          teacherId: editFormData.teacherId,
        }
      )

      setSuccessMessage('Class updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditModal(false)
      fetchClasses()
    } catch (error) {
      console.error('Error updating class:', error)
      setError(error instanceof Error ? error.message : 'Failed to update class')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (cls: any) => {
    setSelectedClass(cls)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setIsSubmitting(true)
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
        selectedClass.$id
      )

      setSuccessMessage('Class deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete class')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddClassSuccess = () => {
    setSuccessMessage('Class added successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchClasses()
  }

  const getTeacherName = (teacherId: string) => {
    if (!teacherId) return 'Not assigned'
    const teacher = teachersMap[teacherId]
    if (!teacher) return 'Teacher not found'
    const fullName = `${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim()
    if (fullName) return fullName
    return teacher.SubjectSpecialization || teacher.Qualification || 'Teacher'
  }

  const getTeacherInitials = (teacher: any) => {
    if (!teacher) return 'T'
    const initials = (teacher.FirstName?.[0] || '') + (teacher.LastName?.[0] || '')
    if (initials) return initials.toUpperCase()
    return teacher.SubjectSpecialization?.[0]?.toUpperCase() || 'T'
  }

  const getTeacherAvatar = (teacher: any) => {
    if (!teacher) return null
    return teacher.avatar || null
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'Form 1': 'bg-blue-100 text-blue-700',
      'Form 2': 'bg-indigo-100 text-indigo-700',
      'Form 3': 'bg-purple-100 text-purple-700',
      'Form 4': 'bg-pink-100 text-pink-700',
      'Form 5': 'bg-red-100 text-red-700',
      'Form 6': 'bg-orange-100 text-orange-700',
      'Lower Six': 'bg-yellow-100 text-yellow-700',
      'Upper Six': 'bg-green-100 text-green-700',
      'O-Level': 'bg-teal-100 text-teal-700',
      'A-Level': 'bg-cyan-100 text-cyan-700',
      'Primary': 'bg-gray-100 text-gray-700',
    }
    return colors[level] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-[#F5F5F2] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage all classes in your school</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowAddClassModal(true)}
              className="px-4 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-green-700 text-sm flex items-center gap-3 animate-fadeIn">
            <div className="p-1 bg-green-100 rounded-full">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm flex items-center gap-3 animate-fadeIn">
            <div className="p-1 bg-red-100 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            {error}
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Classes</p>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">With Teachers</p>
            <p className="text-2xl font-bold text-green-600">
              {classes.filter(c => c.teacherId && teachersMap[c.teacherId]).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Without Teachers</p>
            <p className="text-2xl font-bold text-yellow-600">
              {classes.filter(c => !c.teacherId || !teachersMap[c.teacherId]).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Teachers</p>
            <p className="text-2xl font-bold text-blue-600">
              {Object.keys(teachersMap).length}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes by name, level, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 focus:border-[#C75712] transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`px-4 py-2.5 border-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
                  filterLevel || filterStatus
                    ? 'border-[#C75712] bg-[#C75712]/10 text-[#C75712]'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                {(filterLevel || filterStatus) && (
                  <span className="w-2 h-2 bg-[#C75712] rounded-full"></span>
                )}
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600 font-medium"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

{/* Filter Dropdown */}
{showFilterDropdown && (
  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border-2 border-gray-300 z-50 p-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="font-semibold text-gray-800">Filters</h3>
      <button
        onClick={clearFilters}
        className="text-xs text-[#C75712] hover:underline"
      >
        Clear all
      </button>
    </div>

    {/* Level Filter */}
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">Level/Form</label>
      <select
        value={filterLevel}
        onChange={(e) => setFilterLevel(e.target.value)}
        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
      >
        <option value="" className="text-blue-950">All Levels</option>
        {levelFormOptions.map((option) => (
          <option key={option} value={option} className="text-blue-950">{option}</option>
        ))}
      </select>
    </div>

    {/* Status Filter */}
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">Teacher Status</label>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="w-full px-3 text-blue-950 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
      >
        <option value="" className="text-blue-950">All</option>
        <option value="with_teacher" className="text-blue-950">With Teacher</option>
        <option value="without_teacher" className="text-blue-950">Without Teacher</option>
      </select>
    </div>

    <button
      onClick={() => setShowFilterDropdown(false)}
      className="w-full mt-2 px-4 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors text-sm font-medium"
    >
      Apply Filters
    </button>
  </div>
)}

            </div>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-300">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#C75712]" />
                <p className="text-sm text-gray-500">Loading classes...</p>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No classes found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new class</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-300">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">#</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Class Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Level/Form</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Room</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Teacher</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClasses.map((cls, index) => {
                      const teacher = cls.teacherId ? teachersMap[cls.teacherId] : null
                      const hasTeacher = cls.teacherId && cls.teacherId !== '' && teacher
                      const avatarUrl = hasTeacher ? getTeacherAvatar(teacher) : null
                      
                      return (
                        <tr 
                          key={cls.$id} 
                          className="hover:bg-gray-50/70 transition-colors duration-150 group border-b border-gray-200"
                        >
                          <td className="px-6 py-4 text-sm text-gray-400 font-medium border-r border-gray-200">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-800">
                                {cls.name || 'Unnamed Class'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(cls.LevelOrForm)}`}>
                              {cls.LevelOrForm || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-mono border border-gray-300">
                              {cls.Room || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            {hasTeacher ? (
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#232A42] to-[#3a4466] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 shadow-sm border-2 border-gray-300">
                                  {avatarUrl ? (
                                    <img 
                                      src={avatarUrl} 
                                      alt={getTeacherName(cls.teacherId)}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    getTeacherInitials(teacher)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-gray-800 truncate">
                                    {getTeacherName(cls.teacherId)}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    {teacher.Email && (
                                      <span className="truncate max-w-[120px]">{teacher.Email}</span>
                                    )}
                                    {teacher.Phone && (
                                      <span className="hidden sm:inline">• {teacher.Phone}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300">
                                  <User className="w-3 h-3 text-gray-400" />
                                </div>
                                Not assigned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(cls)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(cls)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Edit Class"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(cls)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Delete Class"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t-2 border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium text-gray-700">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-medium text-gray-700">{totalItems}</span> classes
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border-2 border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm transition-all duration-200 border-2 ${
                              currentPage === pageNum
                                ? 'bg-[#C75712] text-white border-[#C75712] shadow-sm'
                                : 'hover:bg-gray-200 text-gray-600 border-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border-2 border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm flex items-center gap-1 font-medium"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-300">
            <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75712]/10 to-[#C75712]/5 flex items-center justify-center border-2 border-gray-300">
                  <School className="w-5 h-5 text-[#C75712]" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Class Details</h2>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 bg-red-400 rounded-lg "
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">{selectedClass.name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Level/Form</label>
                  <p className="p-2 bg-gray-50 rounded-lg border border-gray-300">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(selectedClass.LevelOrForm)}`}>
                      {selectedClass.LevelOrForm || 'N/A'}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Room</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-mono border border-gray-300">
                      {selectedClass.Room || 'N/A'}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</label>
                  {selectedTeacher ? (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border-2 border-gray-300">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#232A42] to-[#3a4466] flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0 shadow-sm border-2 border-gray-300">
                        {selectedTeacher.avatar ? (
                          <img 
                            src={selectedTeacher.avatar} 
                            alt={getTeacherName(selectedClass.teacherId)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getTeacherInitials(selectedTeacher)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">
                          {getTeacherName(selectedClass.teacherId)}
                        </p>
                        {selectedTeacher.Email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {selectedTeacher.Email}
                          </p>
                        )}
                        {selectedTeacher.Phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {selectedTeacher.Phone}
                          </p>
                        )}
                        {selectedTeacher.SubjectSpecialization && (
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            {selectedTeacher.SubjectSpecialization}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 p-2 bg-gray-50 rounded-lg border border-gray-300">Not assigned</p>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t-2 border-gray-300">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-300">
                  {new Date(selectedClass.$createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Edit Class</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center gap-2 border-2 border-red-200">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                    placeholder="Enter class name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level/Form *</label>
                  <select
                    required
                    value={editFormData.levelOrForm}
                    onChange={(e) => setEditFormData({ ...editFormData, levelOrForm: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  >
                    <option value="">Select Level/Form</option>
                    {levelFormOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.room}
                    onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] uppercase"
                    placeholder="Enter room number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    value={editFormData.teacherId}
                    onChange={(e) => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  >
                    <option value="">Select Teacher</option>
                    {loadingTeachers ? (
                      <option disabled>Loading teachers...</option>
                    ) : (
                      availableTeachers.map((teacher) => {
                        const firstName = teacher.FirstName || ''
                        const lastName = teacher.LastName || ''
                        const name = firstName || lastName 
                          ? `${firstName} ${lastName}`.trim()
                          : teacher.SubjectSpecialization || `Teacher ${teacher.$id.slice(-6)}`
                        return (
                          <option key={teacher.$id} value={teacher.$id}>
                            {name} {teacher.Email ? `(${teacher.Email})` : ''}
                          </option>
                        )
                      })
                    )}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border-2 border-[#C75712]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border-2 border-gray-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full border-2 border-red-300">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Delete Class</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong className="text-gray-800">{selectedClass.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border-2 border-red-600"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      <AddClassModal
        isOpen={showAddClassModal}
        onClose={() => setShowAddClassModal(false)}
        onSuccess={handleAddClassSuccess}
        schoolId=""
      />
    </div>
  )
}

export default ClassesPage