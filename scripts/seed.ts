// scripts/seed.ts
//
// Seeds baseline data for: departments, teachers, classes, subjects,
// students, teacher_subjects, exams, and discipline records.
//
// Mirrors the clear-then-reseed pattern you found, with one deliberate
// change: it does NOT wipe the Schools collection, and it does NOT wipe
// the whole Users collection — only the Users documents it created itself
// (Role: "teacher" or "student"). Blanket-clearing Users would also delete
// any real admin/applicant accounts you've registered through the app,
// and blanket-clearing Schools would break multi-tenancy for everything
// else in the dashboard. Everything else follows the reference pattern.

import { ID, Query, Client, Databases } from "node-appwrite";
import dotenv from "dotenv";
import {
  departmentsData,
  teacherNames,
  studentNames,
  subjectsList,
  qualifications,
  levelsForms,
  examDefs,
  disciplineDefs,
  feeCategories,
  paymentMethods,
  statusOptions,
  hostelNames,
  transportRoutes,
} from "../data";

// Load environment variables
dotenv.config();

// ============================================================
// Appwrite Configuration
// ============================================================
const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  apiKey: process.env.APPWRITE_SERVER_API_KEY!,
  schoolsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SCHOOLS_COLLECTION_ID!,
  departmentsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID!,
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
  teachersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
  studentsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
  classesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
  subjectsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID!,
  teacherSubjectsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID!,
  examsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EXAMS_COLLECTION_ID!,
  disciplineCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DISCIPLINE_COLLECTION_ID!,
  feesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID!,
  paymentsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID!,
  hostelsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_HOSTELS_COLLECTION_ID!,
  hostelStudentsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_HOSTEL_STUDENTS_COLLECTION_ID!,
  transportRoutesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRANSPORT_ROUTES_COLLECTION_ID!,
  studentTransportCollectionId: process.env.NEXT_PUBLIC_APPWRITE_STUDENT_TRANSPORT_COLLECTION_ID!,
  attendanceCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID!,
  timetableCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TIMETABLE_COLLECTION_ID!,
  marksCollectionId: process.env.NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID!,
  announcementsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID!,
  calendarCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_COLLECTION_ID!,
  inventoryCollectionId: process.env.NEXT_PUBLIC_APPWRITE_INVENTORY_COLLECTION_ID!,
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

// ============================================================
// Collection Constants
// ============================================================
const COLLECTIONS = {
  SCHOOLS: config.schoolsCollectionId,
  DEPARTMENTS: config.departmentsCollectionId,
  USERS: config.usersCollectionId,
  TEACHERS: config.teachersCollectionId,
  STUDENTS: config.studentsCollectionId,
  CLASSES: config.classesCollectionId,
  SUBJECTS: config.subjectsCollectionId,
  TEACHER_SUBJECTS: config.teacherSubjectsCollectionId,
  EXAMS: config.examsCollectionId,
  DISCIPLINE: config.disciplineCollectionId,
  FEES: config.feesCollectionId,
  PAYMENTS: config.paymentsCollectionId,
  HOSTELS: config.hostelsCollectionId,
  HOSTEL_STUDENTS: config.hostelStudentsCollectionId,
  TRANSPORT_ROUTES: config.transportRoutesCollectionId,
  STUDENT_TRANSPORT: config.studentTransportCollectionId,
  ATTENDANCE: config.attendanceCollectionId,
  TIMETABLE: config.timetableCollectionId,
  MARKS: config.marksCollectionId,
  ANNOUNCEMENTS: config.announcementsCollectionId,
  CALENDAR: config.calendarCollectionId,
  INVENTORY: config.inventoryCollectionId,
};

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

async function clearCollection(collectionId: string) {
  try {
    const documents = await databases.listDocuments(config.databaseId, collectionId);
    for (const doc of documents.documents) {
      await databases.deleteDocument(config.databaseId, collectionId, doc.$id);
    }
  } catch (error) {
    console.log(`Skipping clear for ${collectionId} (may not exist yet)`);
  }
}

async function clearSeededUsers() {
  // Only remove Users docs with Role "teacher" or "student" — never touch
  // admins or applicants, since those are real accounts, not seed data.
  for (const role of ["teacher", "student"]) {
    try {
      const matches = await databases.listDocuments(config.databaseId, COLLECTIONS.USERS, [
        Query.equal("Role", role),
      ]);
      for (const doc of matches.documents) {
        await databases.deleteDocument(config.databaseId, COLLECTIONS.USERS, doc.$id);
      }
    } catch (error) {
      console.log(`Skipping clear for users with role ${role}`);
    }
  }
}

export default async function seed() {
  try {
    console.log("🚀 Starting seed...");

    // 1. Clear previously seeded data (excluding Schools, Admins, Applicants)
    const collectionsToClear = [
      "DEPARTMENTS",
      "TEACHERS",
      "CLASSES",
      "SUBJECTS",
      "STUDENTS",
      "TEACHER_SUBJECTS",
      "EXAMS",
      "DISCIPLINE",
      "FEES",
      "PAYMENTS",
      "HOSTELS",
      "HOSTEL_STUDENTS",
      "TRANSPORT_ROUTES",
      "STUDENT_TRANSPORT",
      "ATTENDANCE",
      "TIMETABLE",
      "MARKS",
      "ANNOUNCEMENTS",
      "CALENDAR",
      "INVENTORY",
    ] as const;

    for (const key of collectionsToClear) {
      await clearCollection(COLLECTIONS[key]);
    }
    await clearSeededUsers();
    console.log("✅ Cleared previously seeded data.");

    // 2. Resolve the school (must already exist — created via "Add School
    // Details" on the admin dashboard)
    const schools = await databases.listDocuments(config.databaseId, COLLECTIONS.SCHOOLS, [
      Query.limit(1),
    ]);
    if (schools.documents.length === 0) {
      throw new Error(
        '❌ No school found. Complete "Add School Details" in the admin dashboard first, then re-run the seed.'
      );
    }
    const schoolId = schools.documents[0].$id;
    console.log(`📚 Using school: ${schoolId}`);

    // 3. Seed Departments
    const departments = [];
    for (const dept of departmentsData) {
      const department = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.DEPARTMENTS,
        ID.unique(),
        {
          schoolId,
          Name: dept.name,
          headTeacherId: "",
          OfficeLocation: dept.officeLocation,
          ContactEmail: dept.contactEmail,
        }
      );
      departments.push(department);
    }
    console.log(`✅ Seeded ${departments.length} departments.`);

    // 4. Seed Teachers (users + teacher docs)
    const teachers = [];
    for (let i = 0; i < teacherNames.length; i++) {
      const [FirstName, LastName] = teacherNames[i];
      const Email = `${FirstName}.${LastName}@school.edu`.toLowerCase();
      const department = pick(departments, i);

      const userDoc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.USERS,
        ID.unique(),
        {
          FirstName,
          LastName,
          Email,
          Phone: `+263771${String(100000 + i).slice(-6)}`,
          Role: "teacher",
          avatar: "",
          schoolId,
        }
      );

      const teacherDoc = await databases.createDocument(
        config.databaseId,
        COLLECTIONS.TEACHERS,
        ID.unique(),
        {
          schoolId,
          userId: userDoc.$id,
          departmentId: department.$id,
          HireDate: new Date(2020 + (i % 5), 0, 15).toISOString(),
          Qualification: pick(qualifications, i),
          SubjectSpecialization: pick(subjectsList, i),
          Status: "active",
          FirstName,
          LastName,
          Email,
        }
      );
      teachers.push(teacherDoc);
    }
    console.log(`✅ Seeded ${teachers.length} teachers.`);

    // 5. Patch each department with its first-assigned teacher as head
    for (let d = 0; d < departments.length; d++) {
      const headTeacher = teachers[d % teachers.length];
      if (headTeacher) {
        await databases.updateDocument(config.databaseId, COLLECTIONS.DEPARTMENTS, departments[d].$id, {
          headTeacherId: headTeacher.$id,
        });
      }
    }
    console.log("✅ Assigned head teachers to departments.");

    // 6. Seed Classes (one per teacher)
    const classes = [];
    for (let i = 0; i < teachers.length; i++) {
      const { form } = pick(levelsForms, i);
      const classDoc = await databases.createDocument(config.databaseId, COLLECTIONS.CLASSES, ID.unique(), {
        teacherId: teachers[i].$id,
        LevelOrForm: form,
        Year: 2026,
        Room: `Room ${100 + i}`,
        schoolId,
      });
      classes.push(classDoc);
    }
    console.log(`✅ Seeded ${classes.length} classes.`);

    // 7. Seed Subjects
    const subjects = [];
    for (let i = 0; i < subjectsList.length; i++) {
      const subjectDoc = await databases.createDocument(config.databaseId, COLLECTIONS.SUBJECTS, ID.unique(), {
        schoolId,
        SubjectName: subjectsList[i],
        SubjectCode: `SUB-${(i + 1).toString().padStart(3, "0")}`,
        departmentId: pick(departments, i).$id,
      });
      subjects.push(subjectDoc);
    }
    console.log(`✅ Seeded ${subjects.length} subjects.`);

    // 8. Seed Students (users + student docs)
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
      const [FirstName, LastName] = studentNames[i];
      const Email = `${FirstName}.${LastName}@student.school.edu`.toLowerCase();
      const { level, form } = pick(levelsForms, i);

      const userDoc = await databases.createDocument(config.databaseId, COLLECTIONS.USERS, ID.unique(), {
        FirstName,
        LastName,
        Email,
        Phone: `+263772${String(200000 + i).slice(-6)}`,
        Role: "student",
        avatar: "",
        schoolId,
      });

      const studentDoc = await databases.createDocument(config.databaseId, COLLECTIONS.STUDENTS, ID.unique(), {
        userId: userDoc.$id,
        classId: pick(classes, i).$id,
        Level: level,
        Form: form,
        EnrollmentDate: new Date(2025, 0, 10 + i).toISOString(),
        Status: "active",
        schoolId,
        FirstName,
        LastName,
        Email,
      });
      students.push(studentDoc);
    }
    console.log(`✅ Seeded ${students.length} students.`);

    // 9. Seed Teacher <-> Subject <-> Class links
    let linkCount = 0;
    for (let i = 0; i < teachers.length; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.TEACHER_SUBJECTS, ID.unique(), {
        schoolId,
        teacherId: teachers[i].$id,
        subjectId: pick(subjects, i).$id,
        classId: pick(classes, i).$id,
      });
      linkCount++;

      if (i % 2 === 0) {
        await databases.createDocument(config.databaseId, COLLECTIONS.TEACHER_SUBJECTS, ID.unique(), {
          schoolId,
          teacherId: teachers[i].$id,
          subjectId: pick(subjects, i + 3).$id,
          classId: pick(classes, i).$id,
        });
        linkCount++;
      }
    }
    console.log(`✅ Seeded ${linkCount} teacher_subjects links.`);

    // 10. Seed Exams
    let examCount = 0;
    for (const exam of examDefs) {
      await databases.createDocument(config.databaseId, COLLECTIONS.EXAMS, ID.unique(), {
        schoolId,
        ExamName: exam.name,
        ExamDate: new Date(2026, exam.monthOffset, 15).toISOString(),
        Term: exam.term,
        Year: 2026,
      });
      examCount++;
    }
    console.log(`✅ Seeded ${examCount} exams.`);

    // 11. Seed Discipline records
    let disciplineCount = 0;
    for (let i = 0; i < disciplineDefs.length; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.DISCIPLINE, ID.unique(), {
        schoolId,
        studentId: pick(students, i).$id,
        Incident: disciplineDefs[i].incident,
        Date: new Date(2026, 4, 13 + i).toISOString(),
        ActionTaken: disciplineDefs[i].actionTaken,
        Remarks: disciplineDefs[i].remarks,
      });
      disciplineCount++;
    }
    console.log(`✅ Seeded ${disciplineCount} discipline records.`);

    // 12. Seed Hostels
    const hostels = [];
    for (let i = 0; i < hostelNames.length; i++) {
      const hostel = await databases.createDocument(config.databaseId, COLLECTIONS.HOSTELS, ID.unique(), {
        schoolId,
        Name: hostelNames[i],
        Capacity: 50 + (i * 10),
        Gender: i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "mixed",
        supervisorId: pick(teachers, i).$id || "",
      });
      hostels.push(hostel);
    }
    console.log(`✅ Seeded ${hostels.length} hostels.`);

    // 13. Seed Hostel Students
    for (let i = 0; i < students.length && i < 15; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.HOSTEL_STUDENTS, ID.unique(), {
        schoolId,
        studentId: students[i].$id,
        hostelId: pick(hostels, i).$id,
        DateAssigned: new Date(2026, 1, 10 + i).toISOString(),
        RoomNumber: `Room ${101 + i}`,
      });
    }
    console.log("✅ Seeded hostel assignments.");

    // 14. Seed Transport Routes
    for (const route of transportRoutes) {
      await databases.createDocument(config.databaseId, COLLECTIONS.TRANSPORT_ROUTES, ID.unique(), {
        schoolId,
        Description: route.description,
        StartPoint: route.startPoint,
        EndPoint: route.endPoint,
      });
    }
    console.log(`✅ Seeded ${transportRoutes.length} transport routes.`);

    // 15. Seed Student Transport
    const routes = await databases.listDocuments(config.databaseId, COLLECTIONS.TRANSPORT_ROUTES);
    if (routes.documents.length > 0) {
      for (let i = 0; i < students.length && i < 10; i++) {
        await databases.createDocument(config.databaseId, COLLECTIONS.STUDENT_TRANSPORT, ID.unique(), {
          schoolId,
          studentId: students[i].$id,
          routeId: pick(routes.documents, i).$id,
        });
      }
      console.log("✅ Seeded student transport assignments.");
    }

    // 16. Seed Attendance
    let attendanceCount = 0;
    for (let i = 0; i < students.length; i++) {
      const statuses = ["present", "present", "present", "absent", "late", "excused"];
      for (let d = 0; d < 5; d++) {
        await databases.createDocument(config.databaseId, COLLECTIONS.ATTENDANCE, ID.unique(), {
          schoolId,
          studentId: students[i].$id,
          classId: pick(classes, i).$id,
          Date: new Date(2026, 5, 10 + d).toISOString(),
          Status: pick(statuses, i + d),
        });
        attendanceCount++;
      }
    }
    console.log(`✅ Seeded ${attendanceCount} attendance records.`);

    // 17. Seed Marks
    let marksCount = 0;
    const exams = await databases.listDocuments(config.databaseId, COLLECTIONS.EXAMS);
    if (exams.documents.length > 0) {
      for (let i = 0; i < students.length; i++) {
        for (let j = 0; j < Math.min(3, exams.documents.length); j++) {
          const score = 60 + Math.floor(Math.random() * 35);
          const grade = score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
          await databases.createDocument(config.databaseId, COLLECTIONS.MARKS, ID.unique(), {
            schoolId,
            studentId: students[i].$id,
            subjectId: pick(subjects, i).$id,
            teacherId: pick(teachers, i).$id,
            examId: exams.documents[j].$id,
            Score: score,
            Grade: grade,
          });
          marksCount++;
        }
      }
      console.log(`✅ Seeded ${marksCount} marks records.`);
    }

    // 18. Seed Fees
    let feesCount = 0;
    for (let i = 0; i < students.length; i++) {
      const fee = await databases.createDocument(config.databaseId, COLLECTIONS.FEES, ID.unique(), {
        schoolId,
        studentId: students[i].$id,
        LevelOrForm: pick(levelsForms, i).form,
        Term: "Term 1",
        Description: pick(feeCategories, i),
        AmountDue: 150 + (i % 10) * 50,
        Year: 2026,
      });
      feesCount++;

      if (i % 3 !== 0) {
        await databases.createDocument(config.databaseId, COLLECTIONS.PAYMENTS, ID.unique(), {
          schoolId,
          feeId: fee.$id,
          Amount: fee.AmountDue * (0.5 + Math.random() * 0.5),
          Date: new Date(2026, 0, 20 + i).toISOString(),
          Method: pick(paymentMethods, i),
          Status: pick(statusOptions, i),
        });
      }
    }
    console.log(`✅ Seeded ${feesCount} fee records.`);

    // 19. Seed Announcements
    const announcementMessages = [
      "School will be closed on Friday for staff development.",
      "Parent-Teacher Conference scheduled for next month.",
      "Mid-term exams start on the 15th. Prepare accordingly.",
      "Sports day rescheduled due to weather conditions.",
      "New library books have arrived. Check them out.",
      "School website undergoing maintenance this weekend.",
      "Science fair registration now open.",
      "Music festival auditions this Friday.",
    ];
    for (let i = 0; i < announcementMessages.length; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.ANNOUNCEMENTS, ID.unique(), {
        schoolId,
        Title: `Announcement ${i + 1}`,
        Message: announcementMessages[i],
        Date: new Date(2026, 5, 10 + i).toISOString(),
        postedBy: pick(teachers, i).$id || "",
      });
    }
    console.log(`✅ Seeded ${announcementMessages.length} announcements.`);

    // 20. Seed Calendar Events
    const calendarEvents = [
      { title: "School Assembly", description: "All students attend assembly" },
      { title: "PTA Meeting", description: "Parent-Teacher Association meeting" },
      { title: "Sports Day", description: "Annual sports competition" },
      { title: "Science Fair", description: "Student science projects exhibition" },
      { title: "Graduation Ceremony", description: "Form 4 graduation" },
      { title: "Mid-Term Break", description: "School closed for mid-term" },
      { title: "Staff Meeting", description: "Monthly staff meeting" },
      { title: "Open Day", description: "School open to the public" },
    ];
    for (let i = 0; i < calendarEvents.length; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.CALENDAR, ID.unique(), {
        schoolId,
        Title: calendarEvents[i].title,
        Date: new Date(2026, 4 + i, 15 + i).toISOString(),
        Description: calendarEvents[i].description,
        postedBy: pick(teachers, i).$id || "",
      });
    }
    console.log(`✅ Seeded ${calendarEvents.length} calendar events.`);

    // 21. Seed Inventory
    const inventoryItems = [
      { name: "Desks", quantity: 200, location: "Classrooms" },
      { name: "Chairs", quantity: 300, location: "Classrooms" },
      { name: "Whiteboards", quantity: 25, location: "Classrooms" },
      { name: "Projectors", quantity: 15, location: "Media Room" },
      { name: "Laptops", quantity: 50, location: "ICT Lab" },
      { name: "Textbooks", quantity: 500, location: "Library" },
      { name: "Lab Equipment", quantity: 100, location: "Science Lab" },
      { name: "Sports Equipment", quantity: 80, location: "Sports Complex" },
    ];
    for (let i = 0; i < inventoryItems.length; i++) {
      await databases.createDocument(config.databaseId, COLLECTIONS.INVENTORY, ID.unique(), {
        schoolId,
        Name: inventoryItems[i].name,
        Quantity: inventoryItems[i].quantity,
        Location: inventoryItems[i].location,
        managedBy: pick(teachers, i).$id || "",
      });
    }
    console.log(`✅ Seeded ${inventoryItems.length} inventory items.`);

    console.log("🎉 Data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  }
}

// Run the seed
seed()
  .then(() => {
    console.log("✅ Seed script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed script failed:", error);
    process.exit(1);
  });