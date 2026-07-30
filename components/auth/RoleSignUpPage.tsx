'use client'

import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Query } from 'appwrite'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  GraduationCap,
  Image as ImageIcon,
  Lock,
  Mail,
  MapPin,
  Phone,
  School,
  Shield,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react'

import { databases } from '@/lib/appwrite/config'
import {
  getDashboardPath,
  type SchoolDocument,
  type UserRole,
  useAuth,
} from '@/contexts/auth-context'

interface SignUpForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string

  position: string
  assignedArea: string

  schoolId: string
  departmentId: string
  hireDate: string
  qualification: string
  subjectSpecialization: string

  level: string
  form: string

  levelOrFormApplied: string
}

interface DepartmentDocument {
  $id: string
  Name?: string
  [key: string]: unknown
}

interface InputFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  Icon: LucideIcon
}

interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  Icon: LucideIcon
  placeholder: string
  options: Array<{
    value: string
    label: string
  }>
}

const ADMIN_POSITIONS = [
  'School Administrator',
  'Deputy Administrator',
  'Head of Department',
  'Finance Officer',
  'HR Manager',
  'IT Administrator',
  'Academic Coordinator',
  'Discipline Master/Mistress',
  'Sports Director',
  'Librarian',
  'School Counselor',
  'Other',
]

const ADMIN_AREAS = [
  'Academic Affairs',
  'Headmaster/Headmistress',
  'Deputy Headmaster/Headmistress',
  'TIC/Senior Teacher',
  'Finance & Accounting',
  'Human Resources',
  'Student Affairs',
  'Admissions',
  'Examinations',
  'Information Technology',
  'Library Services',
  'Sports & Recreation',
  'Discipline',
  'Parent Relations',
  'Facilities Management',
  'Transport',
  'Hostel Management',
  'Public Relations',
  'Other',
]

const STUDENT_LEVELS = [
  'Primary',
  'O-Level',
  'A-Level',
]

const STUDENT_FORMS = [
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
  'Lower Six',
  'Upper Six',
]

const APPLICANT_LEVELS = [
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
]

const ROLE_HEADINGS: Record<
  UserRole,
  {
    title: string
    description: string
    Icon: LucideIcon
  }
> = {
  admin: {
    title: 'Create Admin Account',
    description:
      'Join StarLight Management Suite as an Administrator',
    Icon: Shield,
  },
  teacher: {
    title: 'Create Teacher Account',
    description:
      'Join StarLight Management Suite as a Teacher',
    Icon: GraduationCap,
  },
  student: {
    title: 'Create Student Account',
    description:
      'Join StarLight Management Suite as a Student',
    Icon: School,
  },
  applicant: {
    title: 'Create Applicant Account',
    description:
      'Apply for admission through StarLight Management Suite',
    Icon: BookOpen,
  },
}

function InputField({
  Icon,
  className = '',
  ...props
}: InputFieldProps) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Icon className="w-5 h-5" />
      </div>

      <input
        {...props}
        className={`w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300 ${className}`}
      />
    </div>
  )
}

function SelectField({
  Icon,
  placeholder,
  options,
  className = '',
  ...props
}: SelectFieldProps) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <Icon className="w-5 h-5" />
      </div>

      <select
        {...props}
        className={`w-full bg-gray-800/80 text-white rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-[#C75712] focus:outline-none focus:ring-2 focus:ring-[#C75712]/50 transition-all duration-300 ${className}`}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Registration failed. Please try again.'
  }

  const normalizedMessage =
    error.message.toLowerCase()

  if (
    normalizedMessage.includes(
      'user already exists'
    ) ||
    normalizedMessage.includes(
      'already registered'
    )
  ) {
    return 'An account with this email already exists. Please sign in.'
  }

  if (
    normalizedMessage.includes('invalid email')
  ) {
    return 'Please enter a valid email address.'
  }

  if (
    normalizedMessage.includes('rate limit')
  ) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return error.message
}

function requiredEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const result = value?.trim()

  if (!result) {
    throw new Error(
      `Missing environment variable: ${name}`
    )
  }

  return result
}

export default function RoleSignUpPage({
  role,
}: {
  role: UserRole
}) {
  const router = useRouter()

  const {
    registerAdmin,
    registerTeacher,
    registerStudent,
    registerApplicant,
    getSchools,
  } = useAuth()

  const roleHeading = ROLE_HEADINGS[role]
  const HeadingIcon = roleHeading.Icon

  const [formData, setFormData] =
    useState<SignUpForm>({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',

      position: '',
      assignedArea: '',

      schoolId: '',
      departmentId: '',
      hireDate: new Date()
        .toISOString()
        .slice(0, 10),
      qualification: '',
      subjectSpecialization: '',

      level: '',
      form: '',

      levelOrFormApplied: '',
    })

  const [schools, setSchools] =
    useState<SchoolDocument[]>([])

  const [departments, setDepartments] =
    useState<DepartmentDocument[]>([])

  const [loadingOptions, setLoadingOptions] =
    useState(
      role === 'teacher' ||
      role === 'student'
    )

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null)

  const [avatarPreview, setAvatarPreview] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    if (
      role !== 'teacher' &&
      role !== 'student'
    ) {
      return
    }

    let cancelled = false

    const loadSchools = async () => {
      setLoadingOptions(true)

      try {
        const loadedSchools =
          await getSchools()

        if (cancelled) {
          return
        }

        const activeSchools =
          loadedSchools.filter(
            (school) =>
              !school.Status ||
              school.Status === 'active' ||
              school.Status === 'trial'
          )

        setSchools(activeSchools)

        if (activeSchools.length === 1) {
          setFormData((current) => ({
            ...current,
            schoolId:
              activeSchools[0].$id,
          }))
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false)
        }
      }
    }

    void loadSchools()

    return () => {
      cancelled = true
    }
  }, [getSchools, role])

  useEffect(() => {
    if (
      role !== 'teacher' ||
      !formData.schoolId
    ) {
      setDepartments([])
      return
    }

    const collectionId =
      process.env
        .NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID

    if (!collectionId?.trim()) {
      setDepartments([])
      return
    }

    let cancelled = false

    const loadDepartments = async () => {
      try {
        const response =
          await databases.listDocuments({
            databaseId:
              requiredEnvironmentVariable(
                'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
                process.env
                  .NEXT_PUBLIC_APPWRITE_DATABASE_ID
              ),
            collectionId,
            queries: [
              Query.equal('schoolId', [
                formData.schoolId,
              ]),
              Query.limit(100),
            ],
          })

        if (!cancelled) {
          setDepartments(
            response.documents as unknown as DepartmentDocument[]
          )
        }
      } catch (loadError) {
        console.error(
          'Unable to load departments:',
          loadError
        )

        if (!cancelled) {
          setDepartments([])
        }
      }
    }

    void loadDepartments()

    return () => {
      cancelled = true
    }
  }, [formData.schoolId, role])

  useEffect(
    () => () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(
          avatarPreview
        )
      }
    },
    [avatarPreview]
  )

  const initials = useMemo(() => {
    const first =
      formData.firstName.trim().charAt(0)
    const last =
      formData.lastName.trim().charAt(0)

    return `${first}${last}`.toUpperCase()
  }, [
    formData.firstName,
    formData.lastName,
  ])

  const updateField = (
    key: keyof SignUpForm,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleAvatarSelection = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Only JPG, PNG and WEBP images are allowed.'
      )
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'Avatar must be smaller than 5MB.'
      )
      event.target.value = ''
      return
    }

    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setError('')
    setAvatarFile(file)
    setAvatarPreview(
      URL.createObjectURL(file)
    )
  }

  const removeAvatar = () => {
    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setAvatarFile(null)
    setAvatarPreview('')
  }

  const validate = (): string | null => {
    const commonFields: Array<
      [string, string]
    > = [
      [formData.firstName, 'First name'],
      [formData.lastName, 'Last name'],
      [formData.email, 'Email'],
      [formData.phone, 'Phone'],
      [formData.password, 'Password'],
      [
        formData.confirmPassword,
        'Confirm password',
      ],
    ]

    const missingCommon =
      commonFields
        .filter(
          ([value]) => !value.trim()
        )
        .map(([, label]) => label)

    if (missingCommon.length > 0) {
      return `Please complete: ${missingCommon.join(
        ', '
      )}.`
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return 'Passwords do not match.'
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters.'
    }

    if (
      role === 'admin' &&
      (
        !formData.position ||
        !formData.assignedArea
      )
    ) {
      return 'Position and assigned area are required.'
    }

    if (
      role === 'teacher' &&
      (
        !formData.schoolId ||
        !formData.qualification.trim() ||
        !formData.subjectSpecialization.trim()
      )
    ) {
      return 'School, qualification and subject specialization are required.'
    }

    if (
      role === 'student' &&
      (
        !formData.schoolId ||
        !formData.level ||
        !formData.form
      )
    ) {
      return 'School, level and form are required.'
    }

    if (
      role === 'applicant' &&
      !formData.levelOrFormApplied
    ) {
      return 'Select the level or form you are applying for.'
    }

    return null
  }

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()
    setError('')

    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    const commonData = {
      firstName:
        formData.firstName.trim(),
      lastName:
        formData.lastName.trim(),
      email:
        formData.email.trim(),
      phone:
        formData.phone.trim(),
      password: formData.password,
      avatarFile,
    }

    try {
      if (role === 'admin') {
        await registerAdmin({
          ...commonData,
          position: formData.position,
          assignedArea:
            formData.assignedArea,
          status: 'active',
        })
      } else if (role === 'teacher') {
        await registerTeacher({
          ...commonData,
          schoolId: formData.schoolId,
          departmentId:
            formData.departmentId,
          hireDate: formData.hireDate,
          qualification:
            formData.qualification.trim(),
          subjectSpecialization:
            formData.subjectSpecialization.trim(),
          status: 'active',
        })
      } else if (role === 'student') {
        await registerStudent({
          ...commonData,
          schoolId: formData.schoolId,
          level: formData.level,
          form: formData.form,
          status: 'active',
        })
      } else {
        await registerApplicant({
          ...commonData,
          levelOrFormApplied:
            formData.levelOrFormApplied,
        })
      }

      router.replace(
        getDashboardPath(role)
      )
    } catch (submitError) {
      setError(formatError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const schoolOptions = schools.map(
    (school) => ({
      value: school.$id,
      label:
        school.Name?.trim() ||
        `School ${school.$id}`,
    })
  )

  const departmentOptions =
    departments.map((department) => ({
      value: department.$id,
      label:
        department.Name?.trim() ||
        `Department ${department.$id}`,
    }))

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/kidsBg.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 via-50% to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
      </div>

      <div className="relative w-full max-w-2xl z-10 animate-fade-in">
        <div className="bg-[#232A42]/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10 max-h-[92vh] overflow-y-auto">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img
                src="/Logo.png"
                alt="StarLight Logo"
                className="h-16 w-auto object-contain"
              />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <HeadingIcon className="w-6 h-6 text-[#D96A1E]" />
              {roleHeading.title}
            </h2>

            <p className="text-gray-400 text-sm">
              {roleHeading.description}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border-l-4 border-red-500 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <AlertCircle
                size={18}
                className="flex-shrink-0 mt-0.5"
              />
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-3">
              <label className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-500 hover:border-[#C75712] transition-colors duration-300 flex items-center justify-center overflow-hidden bg-gray-800/50 cursor-pointer group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : initials ? (
                  <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-[#C75712]">
                    {initials}
                  </span>
                ) : (
                  <span className="flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-[#C75712] transition-colors" />
                    <span className="text-xs text-gray-400 mt-1">
                      Add Photo
                    </span>
                  </span>
                )}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={
                    handleAvatarSelection
                  }
                  className="sr-only"
                />
              </label>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="text-xs text-red-300 hover:text-red-200 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove photo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                Icon={User}
                type="text"
                value={formData.firstName}
                onChange={(event) =>
                  updateField(
                    'firstName',
                    event.target.value
                  )
                }
                placeholder="First Name"
                autoComplete="given-name"
                required
              />

              <InputField
                Icon={User}
                type="text"
                value={formData.lastName}
                onChange={(event) =>
                  updateField(
                    'lastName',
                    event.target.value
                  )
                }
                placeholder="Last Name"
                autoComplete="family-name"
                required
              />

              <InputField
                Icon={Mail}
                type="email"
                value={formData.email}
                onChange={(event) =>
                  updateField(
                    'email',
                    event.target.value
                  )
                }
                placeholder="Email Address"
                autoComplete="email"
                required
              />

              <InputField
                Icon={Phone}
                type="tel"
                value={formData.phone}
                onChange={(event) =>
                  updateField(
                    'phone',
                    event.target.value
                  )
                }
                placeholder="Phone Number"
                autoComplete="tel"
                required
              />

              <div className="relative">
                <InputField
                  Icon={Lock}
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={formData.password}
                  onChange={(event) =>
                    updateField(
                      'password',
                      event.target.value
                    )
                  }
                  placeholder="Password"
                  autoComplete="new-password"
                  required
                  className="pr-12"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <InputField
                  Icon={Lock}
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    formData.confirmPassword
                  }
                  onChange={(event) =>
                    updateField(
                      'confirmPassword',
                      event.target.value
                    )
                  }
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  required
                  className="pr-12"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {role === 'admin' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  Icon={BriefcaseBusiness}
                  value={formData.position}
                  onChange={(event) =>
                    updateField(
                      'position',
                      event.target.value
                    )
                  }
                  placeholder="Select Position"
                  options={ADMIN_POSITIONS.map(
                    (position) => ({
                      value: position,
                      label: position,
                    })
                  )}
                  required
                />

                <SelectField
                  Icon={MapPin}
                  value={formData.assignedArea}
                  onChange={(event) =>
                    updateField(
                      'assignedArea',
                      event.target.value
                    )
                  }
                  placeholder="Select Assigned Area"
                  options={ADMIN_AREAS.map(
                    (area) => ({
                      value: area,
                      label: area,
                    })
                  )}
                  required
                />
              </div>
            )}

            {role === 'teacher' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField
                    Icon={Building2}
                    value={formData.schoolId}
                    onChange={(event) => {
                      updateField(
                        'schoolId',
                        event.target.value
                      )
                      updateField(
                        'departmentId',
                        ''
                      )
                    }}
                    placeholder={
                      loadingOptions
                        ? 'Loading schools...'
                        : 'Select School'
                    }
                    options={schoolOptions}
                    disabled={loadingOptions}
                    required
                  />

                  <SelectField
                    Icon={School}
                    value={
                      formData.departmentId
                    }
                    onChange={(event) =>
                      updateField(
                        'departmentId',
                        event.target.value
                      )
                    }
                    placeholder="Select Department (Optional)"
                    options={
                      departmentOptions
                    }
                    disabled={
                      !formData.schoolId
                    }
                  />

                  <InputField
                    Icon={CalendarDays}
                    type="date"
                    value={formData.hireDate}
                    onChange={(event) =>
                      updateField(
                        'hireDate',
                        event.target.value
                      )
                    }
                  />

                  <InputField
                    Icon={GraduationCap}
                    type="text"
                    value={
                      formData.qualification
                    }
                    onChange={(event) =>
                      updateField(
                        'qualification',
                        event.target.value
                      )
                    }
                    placeholder="Qualification"
                    required
                  />
                </div>

                <InputField
                  Icon={BookOpen}
                  type="text"
                  value={
                    formData.subjectSpecialization
                  }
                  onChange={(event) =>
                    updateField(
                      'subjectSpecialization',
                      event.target.value
                    )
                  }
                  placeholder="Subject Specialization"
                  required
                />
              </div>
            )}

            {role === 'student' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField
                  Icon={Building2}
                  value={formData.schoolId}
                  onChange={(event) =>
                    updateField(
                      'schoolId',
                      event.target.value
                    )
                  }
                  placeholder={
                    loadingOptions
                      ? 'Loading schools...'
                      : 'Select School'
                  }
                  options={schoolOptions}
                  disabled={loadingOptions}
                  required
                />

                <SelectField
                  Icon={School}
                  value={formData.level}
                  onChange={(event) =>
                    updateField(
                      'level',
                      event.target.value
                    )
                  }
                  placeholder="Select Level"
                  options={STUDENT_LEVELS.map(
                    (level) => ({
                      value: level,
                      label: level,
                    })
                  )}
                  required
                />

                <SelectField
                  Icon={BookOpen}
                  value={formData.form}
                  onChange={(event) =>
                    updateField(
                      'form',
                      event.target.value
                    )
                  }
                  placeholder="Select Form"
                  options={STUDENT_FORMS.map(
                    (form) => ({
                      value: form,
                      label: form,
                    })
                  )}
                  required
                />
              </div>
            )}

            {role === 'applicant' && (
              <SelectField
                Icon={BookOpen}
                value={
                  formData.levelOrFormApplied
                }
                onChange={(event) =>
                  updateField(
                    'levelOrFormApplied',
                    event.target.value
                  )
                }
                placeholder="Select Level or Form Applied For"
                options={APPLICANT_LEVELS.map(
                  (level) => ({
                    value: level,
                    label: level,
                  })
                )}
                required
              />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C75712] hover:bg-[#D96A1E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have a {role} account?{' '}
              <Link
                href={`/${role}/signIn`}
                className="text-[#C75712] hover:text-[#D96A1E] font-semibold transition-colors hover:underline"
              >
                Sign In
              </Link>
            </p>

            <Link
              href="/"
              className="inline-block mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors hover:underline"
            >
              Back to portal selection
            </Link>
          </div>
        </div>
      </div>

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

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
