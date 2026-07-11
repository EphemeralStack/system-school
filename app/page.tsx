'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { arrowForward, informationCircle, close } from 'ionicons/icons'
import { useAuth } from '@/contexts/auth-context'

// Dynamically import IonIcon with SSR disabled
const IonIcon = dynamic(
  () => import('@ionic/react').then((mod) => mod.IonIcon),
  { ssr: false }
)

const Homepage = () => {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check authentication and redirect
  useEffect(() => {
    if (!loading && user) {
      const role = user?.Role?.toLowerCase() || ''
      
      // Redirect based on user role
      switch(role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'teacher':
          router.push('/teacher/dashboard')
          break
        case 'student':
          router.push('/student/dashboard')
          break
        case 'applicant':
          router.push('/applicant/dashboard')
          break
        default:
          // If no specific role, stay on homepage
          break
      }
    }
  }, [user, loading, router])

  // Lock body scroll while the info modal is open (mobile bottom-sheet style)
  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isInfoOpen])

  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen)
  }

  const closeInfo = () => {
    setIsInfoOpen(false)
  }

  const portals = [
    {
      id: 'admin',
      title: 'Admin Portal',
      icon: (
        <Image 
          src="/admin.png" 
          alt="Admin" 
          width={32} 
          height={32} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
        />
      ),
      description: 'Manage students, teachers, and school operations',
      bgColor: 'bg-blue-50/90',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      gradient: 'from-blue-500 to-indigo-600',
      href: '/admin/signUp'
    },
    {
      id: 'teacher',
      title: 'Teacher Portal',
      icon: (
        <Image 
          src="/teacher.png" 
          alt="Teacher" 
          width={32} 
          height={32} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
        />
      ),
      description: 'Manage classes, assignments, and student progress',
      bgColor: 'bg-green-50/90',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      gradient: 'from-green-500 to-emerald-600',
      href: '/teacher/signUp'
    },
    {
      id: 'applicant',
      title: 'Applicant Portal',
      icon: (
        <Image 
          src="/applicant.png" 
          alt="Applicant" 
          width={32} 
          height={32} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
        />
      ),
      description: 'Submit applications and track admission status',
      bgColor: 'bg-purple-50/90',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      gradient: 'from-purple-500 to-violet-600',
      href: '/applicant/signUp'
    },
    {
      id: 'student',
      title: 'Student Portal',
      icon: (
        <Image 
          src="/student.png" 
          alt="Student" 
          width={32} 
          height={32} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
        />
      ),
      description: 'Access courses, grades, and learning resources',
      bgColor: 'bg-orange-50/90',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      gradient: 'from-orange-500 to-amber-600',
      href: '/student/signUp'
    }
  ]

  // Show loading state
  if (loading || !mounted) {
    return (
      <div className="min-h-[100dvh] relative flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl animate-fade-in z-10">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <div className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-wide drop-shadow-lg px-4">
              StarLight Management Suite
            </div>
            <p className="text-white/60 text-sm mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // If user is authenticated, they'll be redirected by the useEffect
  // But we still render the homepage for non-authenticated users
  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center p-4 py-8 sm:py-4">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/kidsBg.png')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-6xl animate-fade-in z-10">
        {/* Header Section */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            {/* Logo - visible from md up, sits inline at the left */}
            <div className="hidden md:block flex-shrink-0 w-20">
              <img 
                src="/Logo.png" 
                alt="StarLight Logo" 
                className="h-16 lg:h-20 w-auto object-contain"
              />
            </div>

            {/* Mobile logo */}
            <div className="md:hidden">
              <img 
                src="/Logo.png" 
                alt="StarLight Logo" 
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Spacer to balance the info icon on md+ so title stays centered */}
            <div className="hidden md:block w-20 flex-shrink-0" aria-hidden="true" />

            {/* Info Icon */}
            <div className="relative flex-shrink-0">
              <button
                onClick={toggleInfo}
                className="p-2 rounded-lg hover:bg-white/20 active:bg-white/25 transition-colors duration-200 text-white focus:outline-none touch-manipulation"
                aria-label="System Information"
              >
                <IonIcon icon={informationCircle} className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              {/* Info Modal */}
              {isInfoOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={closeInfo}
                  ></div>

                  {/* Info Modal: bottom sheet on mobile, floating card from sm up */}
                  <div className="
                    fixed sm:absolute
                    left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0
                    bottom-0 sm:bottom-auto
                    sm:right-0 sm:top-full sm:mt-2
                    w-full sm:w-96
                    max-w-full sm:max-w-[calc(100vw-2rem)]
                    max-h-[85dvh] sm:max-h-none
                    overflow-y-auto
                    bg-white/95 backdrop-blur-md
                    rounded-t-2xl sm:rounded-2xl
                    shadow-2xl border border-white/20
                    z-50 animate-slide-down
                  ">
                    {/* Close button */}
                    <button
                      onClick={closeInfo}
                      aria-label="Close"
                      className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600 z-10 touch-manipulation"
                    >
                      <IonIcon icon={close} className="w-5 h-5" />
                    </button>

                    <div className="p-5 sm:p-6 pt-8">
                      {/* System Name */}
                      <h3 className="text-lg sm:text-xl font-bold text-center text-gray-800 mb-1">
                        StarLight Management Suite
                      </h3>
                      <p className="text-center text-gray-500 text-sm mb-4">
                        School Management System
                      </p>

                      <div className="border-t border-gray-200 my-4"></div>

                      {/* System Information */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Version
                          </span>
                          <span className="font-semibold text-gray-800">v2.0.0</span>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Release Date
                          </span>
                          <span className="font-semibold text-gray-800">January 2026</span>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            License
                          </span>
                          <span className="font-semibold text-gray-800">MIT</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-4"></div>

                      {/* Developer Information */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                          <span className="text-blue-600">👨‍💻</span> Developed By
                        </h4>
                        <div className="space-y-1">
                          <p className="text-gray-700 text-sm font-medium">StarLight Technologies Inc.</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <span>📧</span> contact@starlight.com
                          </p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <span>📱</span> +1 (555) 123-4567
                          </p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <span>🌐</span> www.starlight.com
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-4"></div>

                      {/* Footer info */}
                      <div className="text-center pb-2 sm:pb-0">
                        <p className="text-xs text-gray-400">
                          &copy; {new Date().getFullYear()} StarLight Technologies
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                          Built with <span className="text-red-500">❤️</span> for education
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center">
            <span className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-wide drop-shadow-lg block px-2">
              StarLight Management Suite
            </span>
            <p className="text-yellow-500 text-sm sm:text-base max-w-2xl mx-auto drop-shadow-md mt-2 px-4">
              Select your portal to continue accessing your personalized dashboard
            </p>
          </div>
        </div>

        {/* Portal Cards Grid — always 2 columns from small screens up, so it renders as a clean 2x2 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8 sm:mb-10 max-w-3xl mx-auto">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              href={portal.href}
              className="group relative block"
              onMouseEnter={() => setHoveredCard(portal.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className={`
                relative bg-white/90 backdrop-blur-sm rounded-xl p-4 md:p-5 
                shadow-[0_4px_16px_rgba(0,0,0,0.15)] 
                hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)] 
                active:shadow-[0_6px_18px_rgba(0,0,0,0.2)]
                transition-all duration-300 hover:-translate-y-2 
                border border-white/20 hover:border-white/40
                overflow-hidden
                min-h-[150px] sm:min-h-[160px] md:min-h-[180px]
                flex flex-col
                touch-manipulation
              `}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${portal.gradient} 
                  opacity-0 group-hover:opacity-10 transition-opacity duration-300
                `}></div>

                <div className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-xl ${portal.bgColor} 
                  flex items-center justify-center mb-2 backdrop-blur-sm
                  group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
                  ${portal.iconColor}
                  shadow-sm
                `}>
                  <div className="transform group-hover:scale-110 transition-transform duration-300">
                    {portal.icon}
                  </div>
                </div>

                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {portal.title}
                </h3>

                <p className="text-gray-600 text-xs md:text-sm leading-relaxed mb-2 flex-grow line-clamp-2">
                  {portal.description}
                </p>

                <div className="flex items-center text-xs font-medium text-blue-600 group-hover:gap-2 transition-all mt-auto">
                  <span>Access</span>
                  <IonIcon icon={arrowForward} className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>

                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className={`
                    absolute -top-8 -right-8 w-16 h-16 rotate-45 
                    bg-gradient-to-br ${portal.gradient} opacity-10
                    group-hover:opacity-20 group-hover:scale-150 transition-all duration-500
                  `}></div>
                </div>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Section */}
        <div className="text-center px-2">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-md px-5 sm:px-8 py-3 rounded-2xl sm:rounded-full shadow-lg border border-white/30 max-w-full">
            <span className="text-gray-700 text-sm sm:text-base text-center">Don't have an account yet?</span>
            <div className="flex items-center gap-3">
              <Link 
                href="/signup" 
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors hover:underline underline-offset-4 text-sm sm:text-base"
              >
                Sign Up
              </Link>
              <span className="text-gray-400 hidden sm:inline">•</span>
              <Link 
                href="/contact" 
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors hover:underline underline-offset-4"
              >
                Need Help?
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay for redirect */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 sm:p-6 flex items-center gap-3 max-w-full">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
            <span className="text-gray-700 text-sm sm:text-base">Redirecting...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Homepage