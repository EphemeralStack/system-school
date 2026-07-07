// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { databases } from '@/lib/appwrite/config'
import { 
  ArrowLeft, 
  Home, 
  FileText, 
  User, 
  Bell, 
  AlertCircle,
  Clock,
  Search,
  Menu,
  X,
  Settings,
  Search as SearchIcon,
  Grid,
  Users,
  BarChart3,
  DollarSign,
  School,
  BookOpen,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  Check,
  X as XIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  GraduationCap,
  Briefcase,
  CreditCard,
  Shield,
  Info,
  Loader2,
} from 'lucide-react'

// ============= LEFT PANEL SECTIONS =============
const LEFT_SECTIONS = [
  { id: 'global-config', label: 'Global Configuration', icon: Settings },
  { id: 'financial-audit', label: 'Financial Auditing Desk', icon: SearchIcon },
  { id: 'academic-matrix', label: 'Academic Matrix Setup', icon: Grid },
  { id: 'user-accounts', label: 'User Accounts', icon: Users },
]

// ============= NOTIFICATIONS =============
const notifications = [
  {
    id: 1,
    title: 'New applicant registered',
    description: 'John Doe submitted an application for Form 1',
    icon: UserPlus,
    time: '5 minutes ago',
    type: 'info'
  },
  {
    id: 2,
    title: 'Payment received',
    description: 'School fees payment of $500 from Student ID #1234',
    icon: DollarSign,
    time: '1 hour ago',
    type: 'success'
  },
  {
    id: 3,
    title: 'System Update',
    description: 'New update available for the school management system',
    icon: Settings,
    time: '3 hours ago',
    type: 'warning'
  },
  {
    id: 4,
    title: 'Attendance Alert',
    description: 'Low attendance recorded for Form 4A - 60% today',
    icon: AlertCircle,
    time: '5 hours ago',
    type: 'error'
  },
]

// ============= STATS CARDS =============
const statsData = [
  { label: 'Total Students', value: '1,245', icon: Users, color: 'bg-blue-500/20 text-blue-400' },
  { label: 'Total Teachers', value: '48', icon: User, color: 'bg-green-500/20 text-green-400' },
  { label: 'Total Applicants', value: '32', icon: FileText, color: 'bg-yellow-500/20 text-yellow-400' },
  { label: 'Revenue', value: '$12,450', icon: DollarSign, color: 'bg-purple-500/20 text-purple-400' },
]

// ============= SCHOOL SETUP FORM =============
const SchoolSetupForm = ({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    status: 'active',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving school:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#232A42] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Add School Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">School Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                placeholder="Enter school name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                placeholder="Enter school address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="school@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-[#C75712] focus:outline-none"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============= SECTION PLACEHOLDER COMPONENTS =============
const SectionPlaceholder = ({ title, description, icon: Icon }: { title: string; description: string; icon: any }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
    <div className="flex flex-col items-center">
      <div className="p-4 bg-[#232A42]/5 rounded-full mb-4">
        <Icon className="w-12 h-12 text-[#232A42]/40" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-[#C75712] text-white rounded-lg hover:bg-[#D96A1E] transition-colors text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Manage
        </button>
      </div>
    </div>
  </div>
)

// ============= MAIN DASHBOARD =============
const AdminDashboard = () => {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('global-config')
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [showSchoolSetup, setShowSchoolSetup] = useState(false)
  const [schoolData, setSchoolData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivities, setRecentActivities] = useState([
    { id: 1, action: 'New student enrolled', details: 'Sarah Johnson - Form 2A', time: '10 mins ago' },
    { id: 2, action: 'Fee payment recorded', details: 'Payment #1234 - $500', time: '25 mins ago' },
    { id: 3, action: 'Teacher assigned', details: 'Mr. James to Mathematics', time: '1 hour ago' },
    { id: 4, action: 'Exam schedule updated', details: 'Mid-term exams rescheduled', time: '2 hours ago' },
  ])
  const [stats, setStats] = useState(statsData)

  // Check if school data exists
  useEffect(() => {
    const checkSchoolData = async () => {
      try {
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!
        )
        if (response.documents.length > 0) {
          setSchoolData(response.documents[0])
        }
      } catch (error) {
        console.error('Error checking school data:', error)
      } finally {
        setLoading(false)
      }
    }
    checkSchoolData()
  }, [])

  const handleSaveSchool = async (data: any) => {
    try {
      const response = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!,
        'unique()',
        {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      )
      setSchoolData(response)
      return response
    } catch (error) {
      console.error('Error saving school:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9E9E9] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#232A42] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no school data, show setup screen
  if (!schoolData) {
    return (
      <div className="min-h-screen bg-[#E9E9E9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-[#232A42]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="w-10 h-10 text-[#232A42]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Your School Management System</h2>
          <p className="text-gray-500 mb-6">
            Get started by adding your school details. This will set up your school profile and enable all features.
          </p>
          <button
            onClick={() => setShowSchoolSetup(true)}
            className="px-6 py-3 bg-[#C75712] hover:bg-[#D96A1E] text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Add School Details
          </button>
          <p className="text-xs text-gray-400 mt-4">
            You can always update these details later from the settings panel.
          </p>
        </div>

        {showSchoolSetup && (
          <SchoolSetupForm
            onClose={() => setShowSchoolSetup(false)}
            onSave={handleSaveSchool}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9] flex">
      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden bg-[#232A42] text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setIsLeftPanelOpen(true)} className="text-gray-300 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold">Admin Dashboard</h2>
        <button onClick={() => setIsRightPanelOpen(true)} className="text-gray-300 hover:text-white">
          <Bell className="w-5 h-5" />
        </button>
      </div>

      {/* ===== LEFT PANEL ===== */}
      <div className={`
        lg:w-[240px] lg:min-h-screen lg:relative lg:flex lg:flex-col
        fixed inset-0 z-40 bg-[#232A42] text-white p-4 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <button 
          onClick={() => setIsLeftPanelOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="hidden lg:block mb-6 mt-6">
          <span className="font-bold text-white">Navigator</span>
        </div>

        <div className="bg-[#D9D9D9]/15 rounded-lg p-2 mb-6">
          <div className="flex justify-between items-center">
            <div className="p-2 rounded-lg bg-[#2C3553] text-white">
              <Home className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="p-2 rounded-lg text-gray-400">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {LEFT_SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-sm
                  ${isActive 
                    ? 'bg-[#D9D9D9]/15 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#D9D9D9]/10'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== MID SECTION ===== */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto h-screen">
        <div className="relative mb-8 flex justify-center">
          <div className="bg-[#D9D9D9] rounded-b-lg px-4 py-2 inline-block">
            <h2 className="text-[#232A42] font-bold text-base">
              {LEFT_SECTIONS.find(s => s.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <div className="flex items-center bg-[#D9D9D9] rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent text-gray-700 placeholder-gray-500 text-sm pl-2 pr-4 py-1 focus:outline-none w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                <Image
                  src="/user.png"
                  alt="Profile"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-gray-800">{user?.FirstName || 'John Doe'}</div>
                <div className="text-xs text-gray-400">{user?.Role || 'Administrator'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* School Info Bar */}
        <div className="bg-gradient-to-r from-[#232A42] to-[#2C3553] rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-[#C75712]" />
              <span className="font-semibold">{schoolData?.name || 'School Name'}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-300">{schoolData?.address || 'Address not set'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-300">Status:</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full capitalize">
                {schoolData?.status || 'active'}
              </span>
              <button 
                onClick={() => setShowSchoolSetup(true)}
                className="ml-2 px-3 py-1 bg-[#C75712] hover:bg-[#D96A1E] rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-6">
          {/* Section Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionPlaceholder 
              title="Teachers Management"
              description="Add, edit, and manage teachers. Assign subjects and classes."
              icon={User}
            />
            <SectionPlaceholder 
              title="Classes & Subjects"
              description="Create classes, assign subjects, and set up academic structure."
              icon={Grid}
            />
            <SectionPlaceholder 
              title="Student Management"
              description="Enroll students, track attendance, and manage student records."
              icon={Users}
            />
            <SectionPlaceholder 
              title="Financial Management"
              description="Manage fees, payments, and financial records."
              icon={DollarSign}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Recent Activities
            </h3>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.details}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className={`
        lg:w-[280px] lg:min-h-screen lg:relative lg:block
        fixed inset-0 z-40 bg-[#232A42] text-white p-4 border-l border-white/10
        transition-transform duration-300 ease-in-out
        ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
        overflow-y-auto
      `}>
        <button 
          onClick={() => setIsRightPanelOpen(false)}
          className="lg:hidden absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-white mb-4 mt-16 lg:mt-8">Notifications & Alerts</h3>
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = notification.icon
            return (
              <div key={notification.id} className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Pending Applications</span>
              <span className="font-semibold text-white">12</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: '45%' }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Attendance Today</span>
              <span className="font-semibold text-white">89%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '89%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit School Modal */}
      {showSchoolSetup && (
        <SchoolSetupForm
          onClose={() => setShowSchoolSetup(false)}
          onSave={async (data) => {
            try {
              // Update existing school
              await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!,
                schoolData.$id,
                {
                  ...data,
                  updatedAt: new Date().toISOString(),
                }
              )
              setSchoolData({ ...schoolData, ...data })
              setShowSchoolSetup(false)
            } catch (error) {
              console.error('Error updating school:', error)
              throw error
            }
          }}
        />
      )}

      {(isLeftPanelOpen || isRightPanelOpen) && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => {
            setIsLeftPanelOpen(false)
            setIsRightPanelOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default AdminDashboard