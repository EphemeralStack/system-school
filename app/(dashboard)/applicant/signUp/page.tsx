// app/applicant/signUpPage/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IonIcon } from '@ionic/react'
import { person, lockClosed, mail, image, arrowForward, eye, eyeOff } from 'ionicons/icons'

const ApplicantSignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
    avatar: null as File | null,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({
        ...prev,
        avatar: file,
      }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      setIsSubmitting(false)
      return
    }

    // TODO: Implement actual signup logic with Appwrite
    console.log('Form Data:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      password: formData.password,
      avatar: formData.avatar,
    })

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      // Redirect to login or dashboard
      // router.push('/applicant/login')
    }, 2000)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
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

      {/* Sign Up Form */}
      <div className="relative w-full max-w-2xl z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 rounded-2xl shadow-2xl p-8 border border-white/10">
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
              Create Account
            </h2>
            <p className="text-gray-400 text-sm">
              Join StarLight Management Suite as an Applicant
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Upload - Full Width */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-700/50 border-2 border-dashed border-gray-500 hover:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden cursor-pointer group">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <IonIcon icon={image} className="w-8 h-8 text-gray-400 group-hover:text-[#C75712] transition-colors" />
                      <span className="text-xs text-gray-400 block mt-1">Add Profile Photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2x2 Grid for Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IonIcon icon={person} className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Last Name */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IonIcon icon={person} className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Username */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IonIcon icon={mail} className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Create Username"
                  required
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IonIcon icon={lockClosed} className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create Password"
                  required
                  minLength={8}
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <IonIcon icon={showPassword ? eyeOff : eye} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Confirm Password - Full Width */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IonIcon icon={lockClosed} className="w-5 h-5" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm Password"
                required
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-12 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <IonIcon icon={showConfirmPassword ? eyeOff : eye} className="w-5 h-5" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <IonIcon icon={arrowForward} className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/applicant/login" 
                className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline"
              >
                Sign In
              </Link>
            </p>
            <p className="text-gray-500 text-xs mt-3">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplicantSignUp