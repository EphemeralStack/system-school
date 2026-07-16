// app/student/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { databases } from '@/lib/appwrite/config'
import { Query } from 'appwrite'
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  AlertCircle,
  School,
  User,
  CheckCircle,
} from 'lucide-react'

const StudentLogin = () => {
  const router = useRouter()
  const { login, user } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for registration success message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('registered') === 'true') {
      setSuccessMessage('Account created successfully! Please sign in.')
    }
  }, [])

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (user) {
      // Check user role and redirect accordingly
      if (user.Role === 'student') {
        router.push('/student/dashboard')
      } else if (user.Role === 'admin') {
        router.push('/admin/dashboard')
      } else if (user.Role === 'teacher') {
        router.push('/teacher/dashboard')
      }
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    
    // Validate required fields
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    setLoading(true)

    try {
      // 1. Login the user
      const session = await login(formData.email, formData.password)
      
      if (!session) {
        throw new Error('Failed to login')
      }

      // 2. Get the user document to check role
      const users = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [
          Query.equal('Email', formData.email)
        ]
      )

      if (users.documents.length === 0) {
        throw new Error('User not found')
      }

      const userData = users.documents[0]

      // 3. Check if user is a student
      if (userData.Role !== 'student') {
        throw new Error('This account is not a student account. Please use the correct login page.')
      }

      // 4. Check if student is active
      const students = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
        [
          Query.equal('userId', userData.$id)
        ]
      )

      if (students.documents.length > 0) {
        const studentData = students.documents[0]
        if (studentData.Status === 'inactive') {
          throw new Error('Your account is inactive. Please contact the administrator.')
        }
      }

      // 5. Redirect to student dashboard
      router.push('/student/dashboard')
    } catch (err: unknown) {
      console.error('Student login error:', err)
      
      let errorMessage = 'Invalid email or password. Please try again.'
      if (err instanceof Error) {
        errorMessage = err.message
        if (err.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid email or password. Please try again.'
        } else if (err.message.includes('user not found')) {
          errorMessage = 'No account found with this email.'
        }
      }
      setError(errorMessage)
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/kidsBg.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      {/* Login Form */}
      <div className="relative w-full max-w-md z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/Logo.png" 
                alt="StarLight Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Student Sign In
            </h2>
            <p className="text-gray-400 text-sm">
              Welcome back! Sign in to access your student dashboard
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-500/20 rounded-full">
              <School className="w-3 h-3 text-green-300" />
              <span className="text-xs text-green-300">Student Portal</span>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border-l-4 border-green-500 rounded-lg text-green-300 text-sm flex items-center gap-2 animate-slide-down">
              <CheckCircle size={18} className="flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-center gap-2 animate-slide-down">
              <AlertCircle size={18} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email Address"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                href="/student/forgot-password" 
                className="text-sm text-gray-400 hover:text-[#C75712] transition-colors hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have a student account?{' '}
              <Link 
                href="/student/signup" 
                className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline"
              >
                Sign Up
              </Link>
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Link 
                href="/admin/login" 
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors hover:underline"
              >
                Admin Login
              </Link>
              <span className="text-gray-600 text-xs">•</span>
              <Link 
                href="/teacher/login" 
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors hover:underline"
              >
                Teacher Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default StudentLogin