// app/applicant/dashboard/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Home, 
  FileText, 
  User, 
  Bell, 
  Calendar, 
  CreditCard, 
  Upload, 
  File, 
  Edit, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Search,
  Download
} from 'lucide-react'

const ApplicantDashboard = () => {
  const [activeTab, setActiveTab] = useState('application')
  
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

  const applications = [
    {
      id: 1,
      title: 'Application 1',
      date: 'a week ago',
      status: 'in-progress',
      steps: [
        { label: 'Form Submitted', completed: true },
        { label: 'Document Audit', completed: true },
        { label: 'Entrance Testing', completed: true },
        { label: 'Personal interview', completed: false },
        { label: 'Decision', completed: false }
      ]
    },
    {
      id: 2,
      title: 'Application 2',
      date: '7 months ago',
      status: 'rejected',
      steps: [
        { label: 'Form Submitted', completed: true },
        { label: 'Document Audit', completed: true },
        { label: 'Entrance Testing', completed: false },
        { label: 'Personal interview', completed: false },
        { label: 'Decision', completed: false }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ===== LEFT PANEL - Wider ===== */}
      <div className="w-[280px] min-h-screen bg-[#232A42] text-white flex flex-col p-4 flex-shrink-0">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
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
        <div className="bg-[#D9D9D9]/15 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Ready to apply?</div>
            <div className="font-semibold text-sm">Send Application</div>
            <div className="text-[10px] text-gray-400 mt-1">Complete your profile first</div>
          </div>
        </div>

        {/* Profile Context Card */}
        <div className="bg-[#D9D9D9]/30 rounded-lg overflow-hidden flex-1">
          <div className="bg-[#D9D9D9]/30 px-4 py-2 border-b border-white/10">
            <h3 className="text-xs font-semibold text-gray-300">Profile Context</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full bg-gray-600 mb-3 overflow-hidden">
                <Image
                  src="/avatar.png"
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>
              <h4 className="text-sm font-semibold">John Doe</h4>
              <p className="text-xs text-gray-400">Applicant</p>
              <div className="w-full mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Application ID</span>
                  <span className="text-white">#APP-2024-001</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Status</span>
                  <span className="text-yellow-400">Pending Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MID SECTION - 2/3 of screen ===== */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header with Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <Image
                src="/avatar.png"
                alt="Profile"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-semibold text-sm">John Doe</div>
              <div className="text-xs text-gray-500">Admin</div>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6 text-center">
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop files here</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Browse Files
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Upload secondary academic records, birth data cards or medical cover cards. PDF format. Max 10MB per file.
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Interview Schedule - Left */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Interview Schedule</h3>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700">View Schedule</button>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Interview Appointment</span>
              <button className="text-gray-400 hover:text-gray-600">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-sm text-gray-800">No Interview Scheduled</div>
                  <div className="text-xs text-gray-500">Check back later</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              You will receive an email notification once your interview date is scheduled.
            </p>
          </div>

          {/* Application Fee - Right */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Application Fee</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Due Processing Fee</span>
                <span className="font-bold text-gray-800">$50</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Pay online
              </button>
              <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Application Status */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Application Status</h3>
          <div className="space-y-6">
            {applications.map((app) => (
              <div key={app.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{app.title}</h4>
                    <p className="text-xs text-gray-400">{app.date}</p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    app.status === 'in-progress' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {app.status === 'in-progress' ? 'In Progress' : 'REJECTED'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {app.steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        step.completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </div>
                      {index < app.steps.length - 1 && (
                        <div className={`w-8 h-0.5 ${
                          step.completed ? 'bg-green-300' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  {app.steps.map((step, index) => (
                    <span key={index} className="text-center w-16 truncate">
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL - Wider with same BG as Left ===== */}
      <div className="w-[280px] bg-[#232A42] text-white p-4 border-l border-white/10 overflow-y-auto flex-shrink-0">
        <h3 className="font-bold text-white mb-4">Notifications & Alerts</h3>
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

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Documents</span>
              <span className="font-semibold text-white">3/5</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Profile</span>
              <span className="font-semibold text-white">80%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '80%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplicantDashboard