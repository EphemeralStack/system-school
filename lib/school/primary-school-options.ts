export const ZIMBABWE_PRIMARY_GRADES = [
  'ECD A',
  'ECD B',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
] as const

export type ZimbabwePrimaryGrade =
  (typeof ZIMBABWE_PRIMARY_GRADES)[number]

export const ZIMBABWE_PRIMARY_STAGES = [
  'Infant Level',
  'Junior Level',
] as const

export type ZimbabwePrimaryStage =
  (typeof ZIMBABWE_PRIMARY_STAGES)[number]

export function isZimbabwePrimaryGrade(
  value: string
): value is ZimbabwePrimaryGrade {
  return (
    ZIMBABWE_PRIMARY_GRADES as
      readonly string[]
  ).includes(value)
}

export function isZimbabwePrimaryStage(
  value: string
): value is ZimbabwePrimaryStage {
  return (
    ZIMBABWE_PRIMARY_STAGES as
      readonly string[]
  ).includes(value)
}

export function primaryStageForGrade(
  grade: string
): ZimbabwePrimaryStage | '' {
  if (
    grade === 'ECD A' ||
    grade === 'ECD B' ||
    grade === 'Grade 1' ||
    grade === 'Grade 2'
  ) {
    return 'Infant Level'
  }

  if (
    grade === 'Grade 3' ||
    grade === 'Grade 4' ||
    grade === 'Grade 5' ||
    grade === 'Grade 6' ||
    grade === 'Grade 7'
  ) {
    return 'Junior Level'
  }

  return ''
}

export interface SchoolOptionGroup {
  label: string
  options: readonly string[]
}

export const ZIMBABWE_PRIMARY_SUBJECT_GROUPS:
  readonly SchoolOptionGroup[] = [
    {
      label: 'Core Primary Learning Areas',
      options: [
        'English Language',
        'Indigenous Language',
        'Mathematics',
        'Science and Technology',
        'Social Science',
        'Physical Education and Arts',
      ],
    },
    {
      label: 'Primary Enrichment and Support Areas',
      options: [
        'Agriculture',
        'Information and Communication Technology',
        'Heritage Studies',
        'Religious and Moral Education',
        'Guidance and Counselling',
        'Health and Life Skills',
        'Special Needs and Inclusive Education',
      ],
    },
  ]

export const ZIMBABWE_TEACHER_QUALIFICATION_GROUPS:
  readonly SchoolOptionGroup[] = [
    {
      label: 'Primary, Infant and ECD Qualifications',
      options: [
        'Certificate in Education (Primary)',
        'Diploma in Education (Primary)',
        'Diploma in Education (Early Childhood Development)',
        'Diploma in Education (Infant Education)',
        'Diploma in Education (Junior Education)',
        'Bachelor of Education in Primary Education',
        'Bachelor of Education Honours in Primary Education',
        'Bachelor of Education in Early Childhood Development',
        'Bachelor of Science Education Honours in Early Childhood Development',
        'Bachelor of Education Honours in Development and Management of Early Childhood Schools',
        'Bachelor of Education Honours in Development and Management of Junior Schools',
        'Bachelor of Education Honours in Primary Education and Management Practices',
      ],
    },
    {
      label: 'Languages, Humanities and Social Sciences',
      options: [
        'Diploma in Education (English Language)',
        'Diploma in Education (Indigenous Languages)',
        'Bachelor of Education in Curriculum and Arts Education - English',
        'Bachelor of Education in Curriculum and Arts Education - Shona',
        'Bachelor of Education in Curriculum and Arts Education - Ndebele',
        'Bachelor of Education in Curriculum and Arts Education - History',
        'Bachelor of Education in Curriculum and Arts Education - Religious Education',
        'Bachelor of Education Honours in English',
        'Bachelor of Education Honours in African Languages',
        'Bachelor of Education Honours in Geography',
        'Bachelor of Education Honours in History',
      ],
    },
    {
      label: 'Mathematics, Science and Technology',
      options: [
        'Diploma in Science Education',
        'Diploma in Science Education - Mathematics and Geography',
        'Diploma in Science Education - Sciences',
        'Bachelor of Education in Science and Mathematics - Mathematics',
        'Bachelor of Education in Science and Mathematics - Biology',
        'Bachelor of Education in Science and Mathematics - Chemistry',
        'Bachelor of Education in Science and Mathematics - Physics',
        'Bachelor of Science Education Honours in Mathematics',
        'Bachelor of Science Education Honours in Biological Sciences',
        'Bachelor of Science Education Honours in Chemistry',
        'Bachelor of Science Education Honours in Physics',
        'Bachelor of Science Education Honours in Geography',
        'Bachelor of Science Education Honours in Computer Science',
        'Bachelor of Science Education Honours in Agriculture',
      ],
    },
    {
      label: 'Technical, Practical, Arts and Inclusive Education',
      options: [
        'Diploma in Education (Special Needs Education)',
        'Bachelor of Education in Specialised Needs Education',
        'Bachelor of Education in Technical Education - Agriculture',
        'Bachelor of Education in Technical Education - Home Economics',
        'Bachelor of Education in Technical Education - Design and Technology',
        'Bachelor of Education in Teacher Education - Art and Design',
        'Bachelor of Education in Teacher Education - Music',
        'Bachelor of Education Honours in Physical Education and Sport',
        'Bachelor of Education Honours in Information and Communication Technology',
      ],
    },
    {
      label: 'Professional and Postgraduate Education',
      options: [
        'Graduate Certificate in Education (Grad.CE)',
        'Graduate Diploma in Education (GDE)',
        'Postgraduate Certificate in Education (PGCE)',
        'Postgraduate Diploma in Education (PGDE)',
        'Bachelor of Education in Educational Management',
        'Bachelor of Education Honours in Educational Leadership and Governance',
        'Master of Education in Primary Education',
        'Master of Education in Early Childhood Development',
        'Master of Education in Special Needs Education',
        'Master of Education in Educational Leadership and Management',
        'Master of Science Education',
        'Doctor of Philosophy in Education',
        'Other recognised teaching qualification',
      ],
    },
  ]

export const ZIMBABWE_TEACHER_QUALIFICATIONS =
  ZIMBABWE_TEACHER_QUALIFICATION_GROUPS.flatMap(
    (group) => group.options
  )

export function isZimbabweTeacherQualification(
  value: string
): boolean {
  return (
    ZIMBABWE_TEACHER_QUALIFICATIONS as
      readonly string[]
  ).includes(value)
}
