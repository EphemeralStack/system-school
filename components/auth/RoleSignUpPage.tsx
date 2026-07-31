'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  School,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'

import {
  getSignInPath,
  type UserRole,
} from '@/contexts/auth-context'

interface RoleSignUpPageProps {
  role: UserRole
}

interface RoleContent {
  title: string
  description: string
  instruction: string
  Icon: LucideIcon
}

const ROLE_CONTENT: Record<
  UserRole,
  RoleContent
> = {
  admin: {
    title:
      'Administrator Registration Closed',
    description:
      'Administrator accounts are created through the secure school management console.',
    instruction:
      'Contact the current school administrator if you need administrative access.',
    Icon: ShieldCheck,
  },

  teacher: {
    title:
      'Teacher Registration Closed',
    description:
      'Teacher accounts are provisioned securely by an authorized school administrator.',
    instruction:
      'Ask the school administration office to create your teacher account.',
    Icon: GraduationCap,
  },

  student: {
    title:
      'Student Registration Closed',
    description:
      'Student accounts are created after enrollment by an authorized school administrator.',
    instruction:
      'Contact the school administration office if you have not received your login details.',
    Icon: School,
  },

  applicant: {
    title:
      'Online Self-Registration Closed',
    description:
      'Applicant accounts are now created securely by the school admissions office.',
    instruction:
      'Contact admissions to submit an application and receive temporary login credentials.',
    Icon: BookOpen,
  },
}

export default function RoleSignUpPage({
  role,
}: RoleSignUpPageProps) {
  const content =
    ROLE_CONTENT[role]

  const Icon =
    content.Icon

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07152e] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#C75712]/15 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C75712]/40 bg-[#C75712]/15">
          <Icon className="h-8 w-8 text-[#F58A45]" />
        </div>

        <div className="text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#F58A45]">
            Secure Account Provisioning
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {content.title}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">
            {content.description}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-start gap-3">
            <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-[#F58A45]" />

            <div>
              <h2 className="font-semibold text-white">
                Need an account?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-300">
                {content.instruction}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={getSignInPath(role)}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#C75712] px-5 py-3 font-semibold text-white transition hover:bg-[#D96A1E] focus:outline-none focus:ring-2 focus:ring-[#F58A45] focus:ring-offset-2 focus:ring-offset-[#07152e]"
          >
            Go to Sign In
          </Link>

          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#07152e]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  )
}
