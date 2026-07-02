// create-collections.ts
import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Collection definitions
const collections = [
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'userId', type: 'string', required: true, size: 36, default: '' },
      { key: 'applicationNo', type: 'string', required: true, size: 50, default: '' },
      { key: 'levelOrFormApplied', type: 'string', required: false, size: 20, default: '' },
      { key: 'status', type: 'string', required: false, size: 50, default: 'pending' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'userId', type: 'key' },
      { key: 'applicationNo', type: 'unique' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'userId', type: 'string', required: true, size: 36, default: '' },
      { key: 'classId', type: 'string', required: false, size: 36, default: '' },
      { key: 'level', type: 'string', required: false, size: 20, default: '' },
      { key: 'form', type: 'string', required: false, size: 20, default: '' },
      { key: 'enrollmentDate', type: 'string', required: false, size: 255, default: '' },
      { key: 'status', type: 'string', required: false, size: 50, default: 'active' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'userId', type: 'key' },
      { key: 'classId', type: 'key' },
      { key: 'status', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'userId', type: 'string', required: true, size: 36, default: '' },
      { key: 'departmentId', type: 'string', required: false, size: 36, default: '' },
      { key: 'hireDate', type: 'string', required: false, size: 255, default: '' },
      { key: 'qualification', type: 'string', required: false, size: 150, default: '' },
      { key: 'subjectSpecialization', type: 'string', required: false, size: 150, default: '' },
      { key: 'status', type: 'string', required: false, size: 50, default: 'active' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'userId', type: 'key' },
      { key: 'departmentId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'name', type: 'string', required: true, size: 100, default: '' },
      { key: 'headTeacherId', type: 'string', required: false, size: 36, default: '' },
      { key: 'officeLocation', type: 'string', required: false, size: 100, default: '' },
      { key: 'contactEmail', type: 'string', required: false, size: 255, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'headTeacherId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'subjectName', type: 'string', required: true, size: 100, default: '' },
      { key: 'subjectCode', type: 'string', required: true, size: 20, default: '' },
      { key: 'departmentId', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'departmentId', type: 'key' },
      { key: 'subjectCode', type: 'unique' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'teacherId', type: 'string', required: false, size: 36, default: '' },
      { key: 'levelOrForm', type: 'string', required: true, size: 20, default: '' },
      { key: 'year', type: 'integer', required: true, default: 2024 },
      { key: 'room', type: 'string', required: false, size: 20, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'teacherId', type: 'key' },
      { key: 'year', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_TEACHER_SUBJECTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'teacherId', type: 'string', required: true, size: 36, default: '' },
      { key: 'subjectId', type: 'string', required: true, size: 36, default: '' },
      { key: 'classId', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'teacherId', type: 'key' },
      { key: 'subjectId', type: 'key' },
      { key: 'classId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_STUDENT_SUBJECTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'subjectId', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'subjectId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'classId', type: 'string', required: true, size: 36, default: '' },
      { key: 'date', type: 'string', required: true, size: 255, default: '' },
      { key: 'status', type: 'string', required: true, size: 50, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'classId', type: 'key' },
      { key: 'date', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_TIMETABLE_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'classId', type: 'string', required: true, size: 36, default: '' },
      { key: 'subjectId', type: 'string', required: true, size: 36, default: '' },
      { key: 'teacherId', type: 'string', required: true, size: 36, default: '' },
      { key: 'day', type: 'string', required: true, size: 50, default: '' },
      { key: 'timeSlot', type: 'string', required: true, size: 20, default: '' },
      { key: 'term', type: 'string', required: false, size: 20, default: '' },
      { key: 'year', type: 'integer', required: false, default: 2024 },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'classId', type: 'key' },
      { key: 'subjectId', type: 'key' },
      { key: 'teacherId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_EXAMS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'examName', type: 'string', required: true, size: 100, default: '' },
      { key: 'examDate', type: 'string', required: false, size: 255, default: '' },
      { key: 'term', type: 'string', required: false, size: 20, default: '' },
      { key: 'year', type: 'integer', required: false, default: 2024 },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'year', type: 'key' },
      { key: 'term', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_MARKS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'subjectId', type: 'string', required: true, size: 36, default: '' },
      { key: 'teacherId', type: 'string', required: true, size: 36, default: '' },
      { key: 'examId', type: 'string', required: true, size: 36, default: '' },
      { key: 'score', type: 'float', required: true, default: 0 },
      { key: 'grade', type: 'string', required: false, size: 5, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'examId', type: 'key' },
      { key: 'subjectId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'levelOrForm', type: 'string', required: false, size: 20, default: '' },
      { key: 'term', type: 'string', required: false, size: 20, default: '' },
      { key: 'description', type: 'string', required: false, size: 255, default: '' },
      { key: 'amountDue', type: 'float', required: true, default: 0 },
      { key: 'year', type: 'integer', required: false, default: 2024 },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'year', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'feeId', type: 'string', required: true, size: 36, default: '' },
      { key: 'amount', type: 'float', required: true, default: 0 },
      { key: 'date', type: 'string', required: true, size: 255, default: '' },
      { key: 'method', type: 'string', required: false, size: 50, default: '' },
      { key: 'status', type: 'string', required: false, size: 50, default: 'pending' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'feeId', type: 'key' },
      { key: 'date', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_DISCIPLINE_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'incident', type: 'string', required: true, size: 255, default: '' },
      { key: 'date', type: 'string', required: true, size: 255, default: '' },
      { key: 'actionTaken', type: 'string', required: false, size: 255, default: '' },
      { key: 'remarks', type: 'string', required: false, size: 500, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'date', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_HOSTEL_STUDENTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'hostelId', type: 'string', required: true, size: 36, default: '' },
      { key: 'dateAssigned', type: 'string', required: false, size: 255, default: '' },
      { key: 'roomNumber', type: 'string', required: false, size: 20, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'hostelId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_HOSTELS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'name', type: 'string', required: true, size: 100, default: '' },
      { key: 'capacity', type: 'integer', required: false, default: 0 },
      { key: 'gender', type: 'string', required: false, size: 50, default: '' },
      { key: 'supervisorId', type: 'string', required: false, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'supervisorId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_STUDENT_TRANSPORT_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'studentId', type: 'string', required: true, size: 36, default: '' },
      { key: 'routeId', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'studentId', type: 'key' },
      { key: 'routeId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_TRANSPORT_ROUTES_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'description', type: 'string', required: false, size: 255, default: '' },
      { key: 'startPoint', type: 'string', required: false, size: 100, default: '' },
      { key: 'endPoint', type: 'string', required: false, size: 100, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'title', type: 'string', required: true, size: 150, default: '' },
      { key: 'message', type: 'string', required: true, size: 1000, default: '' },
      { key: 'date', type: 'string', required: true, size: 255, default: '' },
      { key: 'postedBy', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'postedBy', type: 'key' },
      { key: 'date', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'title', type: 'string', required: true, size: 150, default: '' },
      { key: 'date', type: 'string', required: true, size: 255, default: '' },
      { key: 'description', type: 'string', required: false, size: 500, default: '' },
      { key: 'postedBy', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'postedBy', type: 'key' },
      { key: 'date', type: 'key' }
    ]
  },
  {
    name: process.env.NEXT_PUBLIC_APPWRITE_INVENTORY_COLLECTION_ID!,
    attributes: [
      { key: 'schoolId', type: 'string', required: true, size: 36, default: '' },
      { key: 'name', type: 'string', required: true, size: 150, default: '' },
      { key: 'quantity', type: 'integer', required: false, default: 0 },
      { key: 'location', type: 'string', required: false, size: 100, default: '' },
      { key: 'managedBy', type: 'string', required: true, size: 36, default: '' },
    ],
    indexes: [
      { key: 'schoolId', type: 'key' },
      { key: 'managedBy', type: 'key' }
    ]
  }
];

// Function to create all collections
async function createCollections() {
  console.log('🚀 Starting collection creation...\n');
  console.log(`📌 Database ID: ${DATABASE_ID}`);
  console.log(`📌 Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}\n`);

  for (const collection of collections) {
    try {
      // Create the collection
      const result = await databases.createCollection(
        DATABASE_ID,
        ID.unique(),
        collection.name
      );
      console.log(`✅ Created collection: ${collection.name} (${result.$id})`);

      // Create attributes
      for (const attr of collection.attributes) {
        try {
          if (attr.type === 'string') {
            // Ensure default is a string
            const defaultValue = typeof attr.default === 'string' ? attr.default : '';
            await databases.createStringAttribute(
              DATABASE_ID,
              result.$id,
              attr.key,
              attr.size || 255,
              attr.required,
              defaultValue
            );
          } else if (attr.type === 'integer') {
            // Ensure default is a number
            const defaultValue = typeof attr.default === 'number' ? attr.default : undefined;
            await databases.createIntegerAttribute(
              DATABASE_ID,
              result.$id,
              attr.key,
              attr.required,
              defaultValue
            );
          } else if (attr.type === 'float') {
            // Ensure default is a number
            const defaultValue = typeof attr.default === 'number' ? attr.default : undefined;
            await databases.createFloatAttribute(
              DATABASE_ID,
              result.$id,
              attr.key,
              attr.required,
              defaultValue
            );
          }
          console.log(`  ✅ Added attribute: ${attr.key} (${attr.type})`);
        } catch (attrError: any) {
          console.log(`  ⚠️ Attribute ${attr.key} may already exist: ${attrError.message}`);
        }
      }

      // Create indexes - using type assertion to fix the type error
      for (const index of collection.indexes) {
        try {
          const indexKey = Array.isArray(index.key) ? index.key : [index.key];
          await databases.createIndex(
            DATABASE_ID,
            result.$id,
            `${collection.name}_${indexKey.join('_')}`,
            index.type as any, // Type assertion to bypass the type check
            indexKey
          );
          console.log(`  ✅ Added index: ${indexKey.join(', ')} (${index.type})`);
        } catch (indexError: any) {
          console.log(`  ⚠️ Index may already exist: ${indexError.message}`);
        }
      }

      console.log(`✅ Completed collection: ${collection.name}\n`);
    } catch (error: any) {
      console.error(`❌ Error creating collection ${collection.name}:`, error.message);
      console.log('Continuing with next collection...\n');
    }
  }
}

// Execute the script
createCollections()
  .then(() => {
    console.log('🎉 All collections created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });