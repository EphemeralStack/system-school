// app/(dashboard)/admin/classes/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { databases } from '@/lib/appwrite/config'
import { Query } from 'appwrite'
import { 
  ArrowLeft, 
  School, 
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  User,
} from 'lucide-react'

const ClassesPage = () => {
  const router = useRouter()
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchClasses()
  }, [currentPage])

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
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter(cls => 
    cls.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.LevelOrForm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.Room?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#E9E9E9] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C75712]"
            />
          </div>
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#C75712]" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <School className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No classes found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level/Form</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClasses.map((cls) => (
                      <tr key={cls.$id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cls.Name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cls.LevelOrForm || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cls.Room || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {cls.teacherId ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {cls.teacherId.slice(-8)}
                            </span>
                          ) : (
                            'Not assigned'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button className="text-blue-600 hover:text-blue-800 mr-2">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800 mr-2">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClassesPage