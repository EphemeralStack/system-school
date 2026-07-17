// app/(dashboard)/admin/students/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { databases } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { AddStudentModal } from '@/components/dashboard/AddStudentModal'
import { 
  ArrowLeft, 
  User, 
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Plus,
  Trash2,
  X,
  Check,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  School,
  Filter,
  Download,
  Users,
} from 'lucide-react'

const StudentsPage = () => {
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filter states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterForm, setFilterForm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    level: '',
    form: '',
    enrollmentDate: '',
    status: '',
  })

  // Level/Form options
  const levelOptions = ['O-Level', 'A-Level', 'Primary']
  const formOptions = [
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Form 6',
    'Lower Six',
    'Upper Six',
  ]

  useEffect(() => {
    fetchStudents()
  }, [currentPage])

  // Fetch user details from Users collection
  const fetchUserDetails = async (userId: string) => {
    try {
      if (!userId) return null
      
      const userResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('$id', userId)]
      )
      
      return userResponse.documents[0] || null
    } catch (error) {
      console.error('Error fetching user details:', error)
      return null
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        [
          Query.limit(itemsPerPage),
          Query.offset((currentPage - 1) * itemsPerPage),
          Query.orderDesc('$createdAt')
        ]
      )
      
      setStudents(response.documents)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalItems(response.total)

      // Fetch user details for each student
      const userIds = response.documents
        .map(student => student.userId)
        .filter(id => id && id !== '')

      const userMap: Record<string, any> = {}
      for (const id of userIds) {
        const user = await fetchUserDetails(id)
        if (user) {
          userMap[id] = user
        }
      }
      setUsersMap(userMap)

    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const getFilteredStudents = () => {
    let filtered = students

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student => {
        const user = student.userId ? usersMap[student.userId] : null
        const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.toLowerCase() : ''
        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          student.Level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.Form?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.Email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Level filter
    if (filterLevel) {
      filtered = filtered.filter(student => student.Level === filterLevel)
    }

    // Form filter
    if (filterForm) {
      filtered = filtered.filter(student => student.Form === filterForm)
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(student => student.Status === filterStatus)
    }

    return filtered
  }

  const filteredStudents = getFilteredStudents()

  // Clear all filters
  const clearFilters = () => {
    setFilterLevel('')
    setFilterForm('')
    setFilterStatus('')
    setSearchTerm('')
    setShowFilterDropdown(false)
  }

  // Export CSV functionality
  const exportCSV = () => {
    const headers = ['#', 'Student Name', 'Email', 'Phone', 'Level', 'Form', 'Status', 'Enrollment Date']
    const rows = filteredStudents.map((student, index) => {
      const user = student.userId ? usersMap[student.userId] : null
      const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : 'Unknown'
      return [
        index + 1,
        fullName,
        user?.Email || '',
        user?.Phone || '',
        student.Level || 'N/A',
        student.Form || 'N/A',
        student.Status || 'Active',
        student.EnrollmentDate ? new Date(student.EnrollmentDate).toLocaleDateString() : 'N/A',
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
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleView = (student: any) => {
    setSelectedStudent(student)
    const user = student.userId ? usersMap[student.userId] : null
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEdit = (student: any) => {
    setSelectedStudent(student)
    setEditFormData({
      level: student.Level || '',
      form: student.Form || '',
      enrollmentDate: student.EnrollmentDate || new Date().toISOString().split('T')[0],
      status: student.Status || 'active',
    })
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
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        selectedStudent.$id,
        {
          Level: editFormData.level,
          Form: editFormData.form,
          EnrollmentDate: editFormData.enrollmentDate,
          Status: editFormData.status,
        }
      )

      setSuccessMessage('Student updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditModal(false)
      fetchStudents()
    } catch (error) {
      console.error('Error updating student:', error)
      setError(error instanceof Error ? error.message : 'Failed to update student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (student: any) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setIsSubmitting(true)
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        selectedStudent.$id
      )

      setSuccessMessage('Student deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddStudentSuccess = () => {
    setSuccessMessage('Student added successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchStudents()
  }

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.$id === studentId)
    if (!student) return 'Unknown'
    const user = student.userId ? usersMap[student.userId] : null
    if (user) {
      return `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'Student'
    }
    return 'Student'
  }

  const getStudentInitials = (student: any) => {
    if (!student) return 'S'
    const user = student.userId ? usersMap[student.userId] : null
    if (user) {
      const initials = (user.FirstName?.[0] || '') + (user.LastName?.[0] || '')
      if (initials) return initials.toUpperCase()
    }
    return 'S'
  }

  const getStudentAvatar = (student: any) => {
    if (!student) return null
    const user = student.userId ? usersMap[student.userId] : null
    return user?.avatar || null
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'suspended': 'bg-red-100 text-red-700',
      'graduated': 'bg-blue-100 text-blue-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
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
              <h1 className="text-2xl font-bold text-gray-800">Students</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage all students in your school</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-4 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Student
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
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {students.filter(s => s.Status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-bold text-gray-600">
              {students.filter(s => s.Status === 'inactive').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Graduated</p>
            <p className="text-2xl font-bold text-blue-600">
              {students.filter(s => s.Status === 'graduated').length}
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
                placeholder="Search students by name, email, level, or form..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 focus:border-[#C75712] transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`px-4 py-2.5 border-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
                  filterLevel || filterForm || filterStatus
                    ? 'border-[#C75712] bg-[#C75712]/10 text-[#C75712]'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                {(filterLevel || filterForm || filterStatus) && (
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
                    >
                      <option value="" className="text-blue-950">All Levels</option>
                      {levelOptions.map((option) => (
                        <option key={option} value={option} className="text-blue-950">{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Form Filter */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Form</label>
                    <select
                      value={filterForm}
                      onChange={(e) => setFilterForm(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
                    >
                      <option value="" className="text-blue-950">All Forms</option>
                      {formOptions.map((option) => (
                        <option key={option} value={option} className="text-blue-950">{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
                    >
                      <option value="" className="text-blue-950">All Status</option>
                      <option value="active" className="text-blue-950">Active</option>
                      <option value="inactive" className="text-blue-950">Inactive</option>
                      <option value="suspended" className="text-blue-950">Suspended</option>
                      <option value="graduated" className="text-blue-950">Graduated</option>
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

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-300">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#C75712]" />
                <p className="text-sm text-gray-500">Loading students...</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new student</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-300">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">#</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Level</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Form</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Enrollment Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => {
                      const user = student.userId ? usersMap[student.userId] : null
                      const avatarUrl = user?.avatar || null
                      const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : 'Unknown'
                      
                      return (
                        <tr 
                          key={student.$id} 
                          className="hover:bg-gray-50/70 transition-colors duration-150 group border-b border-gray-200"
                        >
                          <td className="px-6 py-4 text-sm text-gray-400 font-medium border-r border-gray-200">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#232A42] to-[#3a4466] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 shadow-sm border-2 border-gray-300">
                                {avatarUrl ? (
                                  <img 
                                    src={avatarUrl} 
                                    alt={fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  getStudentInitials(student)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-gray-800 truncate">
                                  {fullName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  {user?.Email && (
                                    <span className="truncate max-w-[120px]">{user.Email}</span>
                                  )}
                                  {user?.Phone && (
                                    <span className="hidden sm:inline">• {user.Phone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="text-sm text-gray-800">
                              {student.Level || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="text-sm text-gray-800">
                              {student.Form || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.Status)}`}>
                              {student.Status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="text-sm text-gray-800">
                              {student.EnrollmentDate 
                                ? new Date(student.EnrollmentDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(student)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Edit Student"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(student)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Delete Student"
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
                    <span className="font-medium text-gray-700">{totalItems}</span> students
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
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-300">
            <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75712]/10 to-[#C75712]/5 flex items-center justify-center border-2 border-gray-300">
                  <User className="w-5 h-5 text-[#C75712]" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Student Details</h2>
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
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedUser ? `${selectedUser.FirstName || ''} ${selectedUser.LastName || ''}`.trim() : 'Unknown'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedUser?.Email || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedUser?.Phone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Level</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedStudent.Level || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Form</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedStudent.Form || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                  <p className="p-2 bg-gray-50 rounded-lg border border-gray-300">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedStudent.Status)}`}>
                      {selectedStudent.Status || 'Active'}
                    </span>
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Date</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedStudent.EnrollmentDate 
                      ? new Date(selectedStudent.EnrollmentDate).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t-2 border-gray-300">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-300">
                  {new Date(selectedStudent.$createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Edit Student</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 bg-red-500 rounded-lg  border-2 "
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={editFormData.level}
                    onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-blue-950"
                  >
                    <option value="" className="text-blue-950">Select Level</option>
                    {levelOptions.map((option) => (
                      <option key={option} value={option} className="text-blue-950">{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                  <select
                    value={editFormData.form}
                    onChange={(e) => setEditFormData({ ...editFormData, form: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-blue-950"
                  >
                    <option value="" className="text-blue-950">Select Form</option>
                    {formOptions.map((option) => (
                      <option key={option} value={option} className="text-blue-950">{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Date</label>
                  <input
                    type="date"
                    value={editFormData.enrollmentDate}
                    onChange={(e) => setEditFormData({ ...editFormData, enrollmentDate: e.target.value })}
                    className="w-full text-blue-950 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-blue-950"
                  >
                    <option value="active" className="text-blue-950">Active</option>
                    <option value="inactive" className="text-blue-950">Inactive</option>
                    <option value="suspended" className="text-blue-950">Suspended</option>
                    <option value="graduated" className="text-blue-950">Graduated</option>
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
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border-2 border-gray-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full border-2 border-red-300">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Delete Student</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this student? This action cannot be undone.
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

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onSuccess={handleAddStudentSuccess}
        schoolId=""
      />
    </div>
  )
}

export default StudentsPage