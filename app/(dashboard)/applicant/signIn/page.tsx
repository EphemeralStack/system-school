// app/applicant/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

const ApplicantLogin = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login:', formData)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Same background as signup */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/kidsBg.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      <div className="relative w-full max-w-md z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 rounded-2xl shadow-2xl p-8 border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/Logo.png" alt="Logo" className="h-16 w-auto" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to your applicant account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Username or Email"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
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
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link href="/applicant/forgot-password" className="text-sm text-gray-400 hover:text-[#C75712] transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
            >
              Sign In
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link href="/applicant/signUpPage" className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplicantLogin