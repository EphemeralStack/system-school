// app/applicant/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  ArrowRight,
  Home, 
  FileText, 
  User, 
  Bell, 
  Calendar, 
  Upload, 
  Edit, 
  AlertCircle,
  Clock,
  Search,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'

const ApplicantDashboard = () => {
  const [activeTab, setActiveTab] = useState('application')
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const notifications = [
    {
      id: 1,
      title: 'Application still pending',
      description: 'Your application is under review',
      icon: Clock,
      time: '2 hours ago',
      type: 'warning'
    },
    {
      id: 2,
      title: 'System AI Flag Raised',
      description: 'New anomaly detected in admissions data. Review flagged entry Form No. 102-2885-214.',
      icon: AlertCircle,
      time: '1 day ago',
      type: 'error'
    },
    {
      id: 3,
      title: 'Upcoming Audit Deadline',
      description: 'Financial auditing desk report due in 5 days. Ensure ledger entries are reconciled.',
      icon: Calendar,
      time: '3 days ago',
      type: 'warning'
    },
    {
      id: 4,
      title: 'Access Role Change',
      description: 'James Rodriguez updated to "Instructor" privileges. Verify classroom assignments.',
      icon: User,
      time: '5 days ago',
      type: 'info'
    }
  ]

  return (
    <div className="min-h-screen bg-[#E9E9E9] flex flex-col lg:flex-row">
      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden bg-[#232A42] text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setIsLeftPanelOpen(true)} className="text-gray-300 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold">Dashboard</h2>
        <button onClick={() => setIsRightPanelOpen(true)} className="text-gray-300 hover:text-white">
          <Bell className="w-5 h-5" />
        </button>
      </div>

      {/* ===== LEFT PANEL - Mobile Overlay ===== */}
      <div className={`
        lg:w-[280px] lg:min-h-screen lg:relative lg:flex lg:flex-col
        fixed inset-0 z-40 bg-[#232A42] text-white p-4 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsLeftPanelOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Back Button - Desktop only */}
        <div className="hidden lg:block mb-6 mt-6">
          <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-lg">Back</span>
          </Link>
        </div>

        {/* Navbar Icons */}
        <div className="bg-[#D9D9D9]/15 rounded-lg p-2 mb-6">
          <div className="flex justify-between items-center">
            <div className={`p-2 rounded-lg ${activeTab === 'home' ? 'bg-[#2C3553] text-white' : 'text-gray-400'}`}>
              <Home className="w-5 h-5" />
            </div>
            <div className={`p-2 rounded-lg ${activeTab === 'application' ? 'bg-[#2C3553] text-white' : 'text-gray-400'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className={`p-2 rounded-lg ${activeTab === 'profile' ? 'bg-[#2C3553] text-white' : 'text-gray-400'}`}>
              <User className="w-5 h-5" />
            </div>
            <div className={`p-2 rounded-lg ${activeTab === 'notifications' ? 'bg-[#2C3553] text-white' : 'text-gray-400'}`}>
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Send Application Section */}
        <div className="bg-[#042F66] rounded-lg p-4 mb-6 cursor-pointer hover:bg-blue-800 transition-colors">
          <div className="flex items-center gap-3">
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <span className="text-white font-semibold text-sm">Send Application</span>
          </div>
        </div>

        {/* Profile Context Card - Scrollable */}
        <div className="bg-[#D9D9D9]/30 rounded-lg overflow-y-auto flex-1 min-h-0">
          <div className="bg-[#D9D9D9]/30 px-4 py-2 border-b border-white/10 sticky top-0">
            <h3 className="text-xs font-semibold text-gray-300">Profile Context</h3>
          </div>
          <div className="p-3 space-y-3">
            {/* Application 1 - In Progress */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-white">Application 1</span>
                  <span className="text-[10px] text-gray-400 ml-2">a week ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-400">In Progress</span>
                  <div className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center animate-spin-slow">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="flex items-center gap-0.5">
                  {['Form Submitted', 'Document Audit', 'Entrance Testing', 'Personal Interview', 'Decision'].map((step, index) => (
                    <div key={index} className="flex-1">
                      <div className={`h-1.5 rounded-full ${index < 3 ? 'bg-green-400' : 'bg-gray-500'}`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {['Form Submitted', 'Document Audit', 'Entrance Testing', 'Personal Interview', 'Decision'].map((step, index) => (
                    <span key={index} className={`text-[7px] ${index < 3 ? 'text-green-300' : 'text-gray-500'}`}>
                      {step}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between mt-0.5">
                  {['✓', '✓', '✓', '○', '○'].map((icon, index) => (
                    <span key={index} className={`text-[8px] ${index < 3 ? 'text-green-400' : 'text-gray-500'}`}>
                      {icon}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Application 2 - Rejected */}
            <div className="bg-white/10 rounded-lg p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-white">Application 2</span>
                  <span className="text-[10px] text-gray-400 ml-2">7 months ago</span>
                </div>
                <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-0.5 rounded-full">
                  REJECTED
                </span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-0.5">
                  {['Form Submitted', 'Document Audit', 'Entrance Testing', 'Personal Interview', 'Decision'].map((step, index) => (
                    <div key={index} className="flex-1">
                      <div className={`h-1.5 rounded-full ${index < 2 ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {['Form Submitted', 'Document Audit', 'Entrance Testing', 'Personal Interview', 'Decision'].map((step, index) => (
                    <span key={index} className={`text-[7px] ${index < 2 ? 'text-green-300' : 'text-red-400'}`}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="transform -rotate-12 opacity-15">
                  <span className="text-4xl font-black text-red-500 border-4 border-red-500 px-6 py-1 rounded-lg">
                    REJECTED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MID SECTION - Scrollable ===== */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto h-screen lg:h-auto max-h-screen">
        {/* Header with Search and Profile */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Search Bar */}
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
          
          {/* Profile Section - Hidden on mobile (in header) */}
          <div className="hidden lg:flex items-center gap-3">
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
                <div className="font-bold text-sm text-gray-800">John Doe</div>
                <div className="text-xs text-gray-400">Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 lg:p-8 mb-6 text-center">
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop files here</p>
            <button className="bg-[#042F66] text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors">
              Browse Files
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Upload secondary academic records, birth data cards or medical cover cards. PDF format. Max 10MB per file.
            </p>
          </div>
        </div>

        {/* Two Column Layout - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interview Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#042F66] px-6 py-3">
              <h3 className="font-bold text-white text-lg">Interview Schedule</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Interview Appointment</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#042F66]" />
                  <div>
                    <div className="font-semibold text-sm text-gray-800">No Interview Scheduled</div>
                    <div className="text-xs text-gray-500">Check back later</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="bg-[#042F66] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm flex-1">
                  View Schedule
                </button>
                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm flex-1 flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Schedule
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                You will receive an email notification once your interview date is scheduled.
              </p>
            </div>
          </div>

          {/* Application Fee Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-center text-gray-800 text-lg mb-1">Application Fee</h3>
            <p className="text-sm text-center text-gray-500 mb-2">Due Processing Fee</p>
            <div className="text-[#042F66] text-center font-bold text-4xl mb-4">$50</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-[#042F66] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">
                Pay online
              </button>
              <button className="flex-1 bg-white text-[#042F66] border-2 border-[#042F66] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL - Mobile Overlay ===== */}
      <div className={`
        lg:w-[280px] lg:min-h-screen lg:relative lg:block
        fixed inset-0 z-40 bg-[#232A42] text-white p-4 border-l border-white/10
        transition-transform duration-300 ease-in-out
        ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
        overflow-y-auto
      `}>
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsRightPanelOpen(false)}
          className="lg:hidden absolute top-4 left-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-white mb-4 mt-10 lg:mt-0">Notifications & Alerts</h3>
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = notification.icon
            return (
              <div key={notification.id} className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
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

      </div>

      {/* Overlay backdrop for mobile panels */}
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

export default ApplicantDashboard