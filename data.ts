// scripts/data.ts

export const departmentsData = [
  { name: "Infant Education", officeLocation: "Infant Block", contactEmail: "infant@school.edu" },
  { name: "Junior Education", officeLocation: "Junior Block", contactEmail: "junior@school.edu" },
  { name: "Languages", officeLocation: "Languages Room", contactEmail: "languages@school.edu" },
  { name: "Mathematics", officeLocation: "Mathematics Room", contactEmail: "mathematics@school.edu" },
  { name: "Science and Technology", officeLocation: "Science Room", contactEmail: "science@school.edu" },
  { name: "Social Science", officeLocation: "Social Science Room", contactEmail: "socialscience@school.edu" },
  { name: "Physical Education and Arts", officeLocation: "Arts and Sports Block", contactEmail: "pearts@school.edu" },
  { name: "Information and Communication Technology", officeLocation: "ICT Room", contactEmail: "ict@school.edu" },
  { name: "Special Needs and Inclusive Education", officeLocation: "Resource Centre", contactEmail: "inclusive@school.edu" },
]

export const teacherNames: [string, string][] = [
  ["Linda", "Martinez"],
  ["Robert", "Taylor"],
  ["James", "Ncube"],
  ["Grace", "Moyo"],
  ["Peter", "Chikafu"],
  ["Sarah", "Johnson"],
  ["Michael", "Chen"],
  ["Emily", "Williams"],
  ["David", "Rodriguez"],
  ["Tanaka", "Chuma"],
  ["Rutendo", "Gwenzi"],
  ["Farai", "Mudzingwa"],
  ["Chipo", "Nyathi"],
  ["Blessing", "Sibanda"],
  ["Tapiwa", "Marufu"],
  ["Anesu", "Chirwa"],
  ["Vimbai", "Dube"],
  ["Kudzai", "Moyana"],
  ["Tafara", "Gumbo"],
  ["Nyasha", "Chirara"],
]

export const studentNames: [string, string][] = [
  ["Emily", "Johnson"],
  ["Michael", "Chen"],
  ["Sarah", "Williams"],
  ["James", "Rodriguez"],
  ["Tanaka", "Chuma"],
  ["Rutendo", "Gwenzi"],
  ["Farai", "Mudzingwa"],
  ["Chipo", "Nyathi"],
  ["Blessing", "Sibanda"],
  ["Tapiwa", "Marufu"],
  ["Anesu", "Chirwa"],
  ["Vimbai", "Dube"],
  ["Kudzai", "Moyana"],
  ["Tafara", "Gumbo"],
  ["Nyasha", "Chirara"],
  ["Tinashe", "Mupunga"],
  ["Ropafadzo", "Chikwava"],
  ["Tatenda", "Mhaka"],
  ["Munashe", "Gwaunza"],
  ["Nokutenda", "Mupfumi"],
]

export const subjectsList = [
  "English Language",
  "Indigenous Language",
  "Mathematics",
  "Science and Technology",
  "Social Science",
  "Physical Education and Arts",
  "Agriculture",
  "Information and Communication Technology",
  "Heritage Studies",
  "Religious and Moral Education",
  "Guidance and Counselling",
  "Health and Life Skills",
  "Special Needs and Inclusive Education",
]

export const qualifications = [
  "Certificate in Education (Primary)",
  "Diploma in Education (Primary)",
  "Diploma in Education (Early Childhood Development)",
  "Diploma in Education (Infant Education)",
  "Diploma in Education (Junior Education)",
  "Diploma in Education (Special Needs Education)",
  "Bachelor of Education in Primary Education",
  "Bachelor of Education Honours in Primary Education",
  "Bachelor of Education in Early Childhood Development",
  "Bachelor of Education in Specialised Needs Education",
  "Bachelor of Education in Science and Mathematics - Mathematics",
  "Bachelor of Education in Curriculum and Arts Education - English",
  "Bachelor of Science Education Honours in Computer Science",
  "Postgraduate Diploma in Education (PGDE)",
  "Master of Education in Primary Education",
  "Doctor of Philosophy in Education",
]

export const levelsForms = [
  { level: "Infant Level", form: "ECD A" },
  { level: "Infant Level", form: "ECD B" },
  { level: "Infant Level", form: "Grade 1" },
  { level: "Infant Level", form: "Grade 2" },
  { level: "Junior Level", form: "Grade 3" },
  { level: "Junior Level", form: "Grade 4" },
  { level: "Junior Level", form: "Grade 5" },
  { level: "Junior Level", form: "Grade 6" },
  { level: "Junior Level", form: "Grade 7" },
]

export const examDefs = [
  { name: "Mid-Term Test", term: "Term 1", monthOffset: 2 },
  { name: "End of Term Exam", term: "Term 1", monthOffset: 3 },
  { name: "Mock Exam", term: "Term 2", monthOffset: 6 },
  { name: "Final Exam", term: "Term 2", monthOffset: 7 },
  { name: "Internal Assessment", term: "Term 1", monthOffset: 1 },
  { name: "Practice Test", term: "Term 2", monthOffset: 5 },
  { name: "CAT Test", term: "Term 1", monthOffset: 1.5 },
  { name: "Project Evaluation", term: "Term 2", monthOffset: 5.5 },
  { name: "Oral Assessment", term: "Term 1", monthOffset: 2.5 },
  { name: "Practical Exam", term: "Term 2", monthOffset: 6.5 },
  { name: "Written Test", term: "Term 1", monthOffset: 0.5 },
  { name: "Comprehensive Exam", term: "Term 2", monthOffset: 7.5 },
  { name: "Quiz Series", term: "Term 1", monthOffset: 1.5 },
  { name: "Semester Exam", term: "Term 2", monthOffset: 6 },
  { name: "Diagnostic Test", term: "Term 1", monthOffset: 2.5 },
  { name: "Progress Test", term: "Term 2", monthOffset: 5.5 },
  { name: "Terminal Exam", term: "Term 1", monthOffset: 3.5 },
  { name: "Board Mock", term: "Term 2", monthOffset: 7 },
  { name: "Class Test", term: "Term 1", monthOffset: 0.5 },
  { name: "Final Assessment", term: "Term 2", monthOffset: 8 },
]

export const disciplineDefs = [
  { incident: "Late to class", actionTaken: "Verbal warning", remarks: "First offense" },
  { incident: "Uniform violation", actionTaken: "Written warning", remarks: "Repeat noted" },
  { incident: "Unauthorized phone use", actionTaken: "Phone confiscated", remarks: "Returned end of day" },
  { incident: "Disruptive behavior", actionTaken: "Parent meeting scheduled", remarks: "Follow-up required" },
  { incident: "Bullying", actionTaken: "Suspension", remarks: "1 day suspension" },
  { incident: "Cheating on exam", actionTaken: "Zero marks awarded", remarks: "Parent notified" },
  { incident: "Littering", actionTaken: "Cleanup duty", remarks: "Community service" },
  { incident: "Fighting", actionTaken: "Suspension", remarks: "3 days suspension" },
  { incident: "Insubordination", actionTaken: "Detention", remarks: "2 hours detention" },
  { incident: "Forgery", actionTaken: "Disciplinary hearing", remarks: "Referral to head" },
  { incident: "Theft", actionTaken: "Suspension", remarks: "Recovery of item" },
  { incident: "Truancy", actionTaken: "Parent conference", remarks: "Absent without leave" },
  { incident: "Verbal abuse", actionTaken: "Community service", remarks: "Apology required" },
  { incident: "Damage to property", actionTaken: "Compensation ordered", remarks: "School property" },
  { incident: "Smoking", actionTaken: "Suspension", remarks: "Health violation" },
  { incident: "Use of foul language", actionTaken: "Written warning", remarks: "Second offense" },
  { incident: "Failure to complete homework", actionTaken: "Detention", remarks: "Pattern observed" },
  { incident: "Disturbing class", actionTaken: "Seat moved", remarks: "Temporary measure" },
  { incident: "Hate speech", actionTaken: "Disciplinary hearing", remarks: "Serious offense" },
  { incident: "Bribery", actionTaken: "Suspension pending investigation", remarks: "Student involved" },
]

export const roles = [
  "admin",
  "teacher",
  "student",
  "applicant",
]

export const feeCategories = [
  "Tuition Fee",
  "Sports Fee",
  "Lab Fee",
  "Library Fee",
  "Technology Fee",
  "Boarding Fee",
  "Transport Fee",
  "Uniform Fee",
  "Activity Fee",
  "Exam Fee",
  "PTA Levy",
  "Building Levy",
  "Insurance Fee",
  "Book Fee",
  "Stationery Fee",
]

export const paymentMethods = [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
]

export const statusOptions = [
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]

// Hostel names
export const hostelNames = [
  "Milton Hostel",
  "Livingstone Hostel",
  "Victoria Hostel",
  "Zambezi Hostel",
  "Kariba Hostel",
  "Nyanga Hostel",
  "Chimanimani Hostel",
  "Mana Pools Hostel",
]

// Transport routes
export const transportRoutes = [
  { description: "Route 1 - City Center to School", startPoint: "City Center", endPoint: "School" },
  { description: "Route 2 - Suburb A to School", startPoint: "Suburb A", endPoint: "School" },
  { description: "Route 3 - Suburb B to School", startPoint: "Suburb B", endPoint: "School" },
  { description: "Route 4 - Township to School", startPoint: "Township", endPoint: "School" },
  { description: "Route 5 - Rural Area to School", startPoint: "Rural Area", endPoint: "School" },
  { description: "Route 6 - Farm to School", startPoint: "Farm Area", endPoint: "School" },
]