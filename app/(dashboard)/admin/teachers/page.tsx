// app/(dashboard)/admin/teachers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { databases } from '@/lib/appwrite/config'
import { ID, Query } from 'appwrite'
import { AddTeacherModal } from '@/components/dashboard/AddTeacherModal'
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
  Briefcase,
  GraduationCap,
  Filter,
  Download,
  School,
} from 'lucide-react'

const TeachersPage = () => {
  const router = useRouter()
  const [teachers, setTeachers] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Modal states
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filter states
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('')

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    qualification: '',
    subjectSpecialization: '',
    hireDate: '',
    status: '',
  })

  useEffect(() => {
    fetchTeachers()
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

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        [
          Query.limit(itemsPerPage),
          Query.offset((currentPage - 1) * itemsPerPage),
          Query.orderDesc('$createdAt')
        ]
      )
      
      setTeachers(response.documents)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalItems(response.total)

      // Fetch user details for each teacher
      const userIds = response.documents
        .map(teacher => teacher.userId)
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
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const getFilteredTeachers = () => {
    let filtered = teachers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(teacher => {
        const user = teacher.userId ? usersMap[teacher.userId] : null
        const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.toLowerCase() : ''
        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          teacher.SubjectSpecialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.Qualification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.Email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(teacher => teacher.Status === filterStatus)
    }

    // Specialization filter
    if (filterSpecialization) {
      filtered = filtered.filter(teacher => 
        teacher.SubjectSpecialization?.toLowerCase().includes(filterSpecialization.toLowerCase())
      )
    }

    return filtered
  }

  const filteredTeachers = getFilteredTeachers()

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus('')
    setFilterSpecialization('')
    setSearchTerm('')
    setShowFilterDropdown(false)
  }

  // Export CSV functionality
  const exportCSV = () => {
    const headers = ['#', 'Teacher Name', 'Email', 'Phone', 'Specialization', 'Qualification', 'Status', 'Hire Date']
    const rows = filteredTeachers.map((teacher, index) => {
      const user = teacher.userId ? usersMap[teacher.userId] : null
      const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : 'Unknown'
      return [
        index + 1,
        fullName,
        user?.Email || '',
        user?.Phone || '',
        teacher.SubjectSpecialization || 'N/A',
        teacher.Qualification || 'N/A',
        teacher.Status || 'Active',
        teacher.HireDate ? new Date(teacher.HireDate).toLocaleDateString() : 'N/A',
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
    link.setAttribute('download', `teachers_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleView = (teacher: any) => {
    setSelectedTeacher(teacher)
    const user = teacher.userId ? usersMap[teacher.userId] : null
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher)
    setEditFormData({
      qualification: teacher.Qualification || '',
      subjectSpecialization: teacher.SubjectSpecialization || '',
      hireDate: teacher.HireDate || new Date().toISOString().split('T')[0],
      status: teacher.Status || 'active',
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
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        selectedTeacher.$id,
        {
          Qualification: editFormData.qualification,
          SubjectSpecialization: editFormData.subjectSpecialization,
          HireDate: editFormData.hireDate,
          Status: editFormData.status,
        }
      )

      setSuccessMessage('Teacher updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditModal(false)
      fetchTeachers()
    } catch (error) {
      console.error('Error updating teacher:', error)
      setError(error instanceof Error ? error.message : 'Failed to update teacher')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (teacher: any) => {
    setSelectedTeacher(teacher)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setIsSubmitting(true)
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
        selectedTeacher.$id
      )

      setSuccessMessage('Teacher deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      fetchTeachers()
    } catch (error) {
      console.error('Error deleting teacher:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete teacher')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTeacherSuccess = () => {
    setSuccessMessage('Teacher added successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchTeachers()
  }

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.$id === teacherId)
    if (!teacher) return 'Unknown'
    const user = teacher.userId ? usersMap[teacher.userId] : null
    if (user) {
      return `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'Teacher'
    }
    return 'Teacher'
  }

  const getTeacherInitials = (teacher: any) => {
    if (!teacher) return 'T'
    const user = teacher.userId ? usersMap[teacher.userId] : null
    if (user) {
      const initials = (user.FirstName?.[0] || '') + (user.LastName?.[0] || '')
      if (initials) return initials.toUpperCase()
    }
    return 'T'
  }

  const getTeacherAvatar = (teacher: any) => {
    if (!teacher) return null
    const user = teacher.userId ? usersMap[teacher.userId] : null
    return user?.avatar || null
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'on_leave': 'bg-yellow-100 text-yellow-700',
      'retired': 'bg-gray-100 text-gray-700',
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
              <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage all teachers in your school</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="px-4 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
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
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {teachers.filter(t => t.Status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">On Leave</p>
            <p className="text-2xl font-bold text-yellow-600">
              {teachers.filter(t => t.Status === 'on_leave').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Retired</p>
            <p className="text-2xl font-bold text-gray-600">
              {teachers.filter(t => t.Status === 'retired').length}
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
                placeholder="Search teachers by name, email, specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-blue-950 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 focus:border-[#C75712] transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`px-4 py-2.5 border-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
                  filterStatus || filterSpecialization
                    ? 'border-[#C75712] bg-[#C75712]/10 text-[#C75712]'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                {(filterStatus || filterSpecialization) && (
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
        <option value="on_leave" className="text-blue-950">On Leave</option>
        <option value="retired" className="text-blue-950">Retired</option>
      </select>
    </div>

    {/* Specialization Filter */}
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">Specialization</label>
      <input
        type="text"
        placeholder="Filter by specialization..."
        value={filterSpecialization}
        onChange={(e) => setFilterSpecialization(e.target.value)}
        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712] text-sm text-blue-950"
      />
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

        {/* Teachers Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-300">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#C75712]" />
                <p className="text-sm text-gray-500">Loading teachers...</p>
              </div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No teachers found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new teacher</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-300">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">#</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Teacher</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Specialization</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Qualification</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Hire Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTeachers.map((teacher, index) => {
                      const user = teacher.userId ? usersMap[teacher.userId] : null
                      const avatarUrl = user?.avatar || null
                      const fullName = user ? `${user.FirstName || ''} ${user.LastName || ''}`.trim() : 'Unknown'
                      
                      return (
                        <tr 
                          key={teacher.$id} 
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
                                  getTeacherInitials(teacher)
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
                              {teacher.SubjectSpecialization || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="text-sm text-gray-800">
                              {teacher.Qualification || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(teacher.Status)}`}>
                              {teacher.Status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200">
                            <span className="text-sm text-gray-800">
                              {teacher.HireDate 
                                ? new Date(teacher.HireDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(teacher)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(teacher)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Edit Teacher"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(teacher)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                                title="Delete Teacher"
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
                    <span className="font-medium text-gray-700">{totalItems}</span> teachers
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
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-300">
            <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C75712]/10 to-[#C75712]/5 flex items-center justify-center border-2 border-gray-300">
                  <User className="w-5 h-5 text-[#C75712]" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Teacher Details</h2>
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
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedTeacher.SubjectSpecialization || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedTeacher.Qualification || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                  <p className="p-2 bg-gray-50 rounded-lg border border-gray-300">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTeacher.Status)}`}>
                      {selectedTeacher.Status || 'Active'}
                    </span>
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</label>
                  <p className="text-lg font-semibold text-gray-800 p-2 bg-gray-50 rounded-lg border border-gray-300">
                    {selectedTeacher.HireDate 
                      ? new Date(selectedTeacher.HireDate).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t-2 border-gray-300">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-300">
                  {new Date(selectedTeacher.$createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
{showEditModal && selectedTeacher && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
      <div className="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Edit Teacher</h2>
        <button
          onClick={() => setShowEditModal(false)}
          className="p-2 bg-red-500 rounded-lg  border-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
            <input
              type="text"
              value={editFormData.qualification}
              onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
              className="w-full text-blue-950 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
              placeholder="e.g., B.Ed, M.A. Education"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input
              type="text"
              value={editFormData.subjectSpecialization}
              onChange={(e) => setEditFormData({ ...editFormData, subjectSpecialization: e.target.value })}
              className="w-full text-blue-950 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712] focus:border-[#C75712]"
              placeholder="e.g., Mathematics, Science"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
            <input
              type="date"
              value={editFormData.hireDate}
              onChange={(e) => setEditFormData({ ...editFormData, hireDate: e.target.value })}
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
              <option value="on_leave" className="text-blue-950">On Leave</option>
              <option value="retired" className="text-blue-950">Retired</option>
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
            Update Teacher
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Delete Modal */}
      {showDeleteModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border-2 border-gray-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full border-2 border-red-300">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Delete Teacher</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this teacher? This action cannot be undone.
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

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={showAddTeacherModal}
        onClose={() => setShowAddTeacherModal(false)}
        onSuccess={handleAddTeacherSuccess}
        schoolId=""
      />
    </div>
  )
}

export default TeachersPage