// scripts/seed-all-tables.mjs
//
// Seeds 20 deterministic, relationally-linked rows into every Appwrite
// TablesDB table found in the configured database.
//
// Safety:
// - Uses deterministic row IDs, so rerunning performs upserts.
// - Never deletes existing rows.
// - Never prints the API key.
// - Inspects the live table columns before writing.
// - Coerces values to the current data type and enum definitions.
// - Writes a detailed JSON report after completion.

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import {
  Client,
  Query,
  TablesDB,
} from "node-appwrite";

const ENV_FILE =
  process.env.APPWRITE_SEED_ENV_FILE ||
  ".env.appwrite-seeder";

dotenv.config({ path: ENV_FILE });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const PAGE_SIZE = 100;
const DEFAULT_ROWS_PER_TABLE = 20;

const EXPECTED_TABLE_ORDER = [
  "school",
  "users",
  "admins",
  "applicants",
  "departments",
  "teachers",
  "subjects",
  "classes",
  "students",
  "teacher_subjects",
  "student_subjects",
  "attendance",
  "timetable",
  "exams",
  "marks",
  "fees",
  "payments",
  "discipline",
  "hostels",
  "hostel_students",
  "transport_routes",
  "student_transport",
  "announcements",
  "calendar",
  "inventory",
];

const FIRST_NAMES = [
  "Tinashe",
  "Ruvimbo",
  "Takudzwa",
  "Nyasha",
  "Kudakwashe",
  "Rutendo",
  "Tanaka",
  "Anesu",
  "Tafadzwa",
  "Munashe",
  "Farai",
  "Chipo",
  "Tendai",
  "Rumbidzai",
  "Blessing",
  "Shamiso",
  "Kudzai",
  "Tatenda",
  "Nokutenda",
  "Simbarashe",
];

const LAST_NAMES = [
  "Moyo",
  "Ncube",
  "Dube",
  "Chikore",
  "Mutasa",
  "Sibanda",
  "Gumbo",
  "Mavhunga",
  "Chiweshe",
  "Maphosa",
  "Zhou",
  "Mare",
  "Muchengeti",
  "Makoni",
  "Mushonga",
  "Nyoni",
  "Chirume",
  "Mlambo",
  "Mupfumi",
  "Mugabe",
];

const CITIES = [
  "Harare",
  "Bulawayo",
  "Mutare",
  "Gweru",
  "Masvingo",
  "Bindura",
  "Chinhoyi",
  "Marondera",
  "Kwekwe",
  "Kadoma",
  "Victoria Falls",
  "Hwange",
  "Rusape",
  "Kariba",
  "Beitbridge",
  "Zvishavane",
  "Chiredzi",
  "Norton",
  "Chegutu",
  "Redcliff",
];

const DEPARTMENT_NAMES = [
  "Mathematics",
  "Languages",
  "Sciences",
  "Humanities",
  "Commerce",
  "Information Technology",
  "Agriculture",
  "Technical Studies",
  "Physical Education",
  "Creative Arts",
  "Guidance and Counselling",
  "Early Childhood Development",
  "Library Services",
  "Examinations",
  "Student Affairs",
  "Administration",
  "Finance",
  "Transport",
  "Boarding",
  "Health Services",
];

const SUBJECT_NAMES = [
  "Mathematics",
  "English Language",
  "Shona",
  "Combined Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Geography",
  "History",
  "Commerce",
  "Accounting",
  "Business Enterprise Skills",
  "Computer Science",
  "Agriculture",
  "Technical Graphics",
  "Wood Technology",
  "Food Technology",
  "Physical Education",
  "Religious Studies",
  "Art and Design",
];

const SUBJECT_CODES = [
  "MATH",
  "ENG",
  "SHO",
  "SCI",
  "BIO",
  "CHEM",
  "PHY",
  "GEO",
  "HIST",
  "COM",
  "ACC",
  "BES",
  "CS",
  "AGR",
  "TG",
  "WOOD",
  "FT",
  "PE",
  "RS",
  "ART",
];

const QUALIFICATIONS = [
  "BEd Mathematics",
  "BEd English",
  "BSc Education",
  "Diploma in Education",
  "BEd Science",
  "BCom Education",
  "BTech Education",
  "MEd Curriculum Studies",
];

const INCIDENTS = [
  "Late arrival",
  "Class disruption",
  "Incomplete homework",
  "Uniform violation",
  "Unauthorized absence",
  "Bullying complaint",
  "Property damage",
  "Mobile phone misuse",
];

const ACTIONS = [
  "Verbal warning",
  "Written warning",
  "Parent consultation",
  "Counselling session",
  "Detention",
  "Restitution assigned",
  "Behaviour contract",
  "Follow-up review",
];

const INVENTORY_ITEMS = [
  "Desktop Computer",
  "Laptop Computer",
  "Projector",
  "Science Microscope",
  "Chemistry Glassware Set",
  "Mathematics Textbook",
  "English Textbook",
  "Geography Atlas",
  "Football",
  "Netball",
  "Library Chair",
  "Classroom Desk",
  "Whiteboard",
  "Printer",
  "Network Router",
  "First Aid Kit",
  "Laboratory Coat",
  "Generator",
  "Water Tank",
  "School Bus Tyre",
];

const HOSTEL_NAMES = [
  "Jacaranda House",
  "Flame Lily House",
  "Baobab House",
  "Msasa House",
  "Acacia House",
  "Mopane House",
  "Nyanga House",
  "Matobo House",
  "Chimanimani House",
  "Zambezi House",
  "Mazowe House",
  "Save House",
  "Manyame House",
  "Mukuvisi House",
  "Kariba House",
  "Vumba House",
  "Inyanga House",
  "Great Zimbabwe House",
  "Khami House",
  "Domboshava House",
];

const ROUTE_POINTS = [
  ["Harare CBD", "Avondale"],
  ["Bindura CBD", "Chiwaridzo"],
  ["Bulawayo CBD", "Hillside"],
  ["Mutare CBD", "Sakubva"],
  ["Gweru CBD", "Mkoba"],
  ["Masvingo CBD", "Rujeko"],
  ["Chinhoyi CBD", "Cold Stream"],
  ["Marondera CBD", "Dombotombo"],
  ["Kwekwe CBD", "Mbizo"],
  ["Kadoma CBD", "Rimuka"],
];

const ROLES = [
  "admin",
  "teacher",
  "student",
  "applicant",
];

function requiredEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  throw new Error(
    `Missing required environment variable. Set one of: ${names.join(", ")}`
  );
}

function integerEnv(name, fallback, min, max) {
  const parsed = Number.parseInt(
    process.env[name] ?? "",
    10
  );

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(min, parsed)
  );
}

function booleanEnv(name, fallback) {
  const value =
    process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (
    ["1", "true", "yes", "on"].includes(value)
  ) {
    return true;
  }

  if (
    ["0", "false", "no", "off"].includes(value)
  ) {
    return false;
  }

  return fallback;
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pad(index) {
  return String(index + 1).padStart(2, "0");
}

function seedId(tableName, index) {
  const normalized =
    normalizeName(tableName) || "table";

  const suffix = `_${pad(index)}`;
  const prefix = `seed_${normalized}`;
  const maxPrefixLength = 36 - suffix.length;

  return `${prefix.slice(
    0,
    maxPrefixLength
  )}${suffix}`;
}

function ref(tableName, index) {
  return seedId(tableName, index);
}

function cycle(values, index) {
  return values[index % values.length];
}

function isoDate(index, yearOffset = 0) {
  const year = 2024 + yearOffset + (index % 3);
  const month = index % 12;
  const day = 2 + ((index * 3) % 25);

  return new Date(
    Date.UTC(year, month, day, 8, 0, 0)
  ).toISOString();
}

function dateOnly(index, yearOffset = 0) {
  return isoDate(index, yearOffset).slice(0, 10);
}

function schoolIndex(index) {
  return index % DEFAULT_ROWS_PER_TABLE;
}

function userName(index) {
  return {
    firstName: cycle(FIRST_NAMES, index),
    lastName: cycle(LAST_NAMES, index),
  };
}

function generatedAvatar(index) {
  const { firstName, lastName } =
    userName(index);

  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    `${firstName} ${lastName}`
  )}`;
}

function candidateForTable(tableName, index) {
  const table = normalizeName(tableName);
  const number = index + 1;
  const schoolRef = ref(
    "school",
    schoolIndex(index)
  );
  const userRef = ref("users", index);
  const adminRef = ref("admins", index);
  const applicantRef = ref(
    "applicants",
    index
  );
  const studentRef = ref(
    "students",
    index
  );
  const teacherRef = ref(
    "teachers",
    index
  );
  const departmentRef = ref(
    "departments",
    index
  );
  const subjectRef = ref(
    "subjects",
    index
  );
  const classRef = ref("classes", index);
  const examRef = ref("exams", index);
  const feeRef = ref("fees", index);
  const hostelRef = ref("hostels", index);
  const routeRef = ref(
    "transport_routes",
    index
  );

  const { firstName, lastName } =
    userName(index);

  const level = `Form ${(index % 6) + 1}`;
  const stream = String.fromCharCode(
    65 + (index % 4)
  );
  const term = `Term ${(index % 3) + 1}`;
  const year = 2026;
  const city = cycle(CITIES, index);

  const common = {
    schoolId: schoolRef,
    SchoolId: schoolRef,
    userId: userRef,
    UserId: userRef,
  };

  switch (table) {
    case "school":
      return {
        Name: `${city} StarLight Academy ${pad(index)}`,
        Address: `${number * 10} Education Avenue, ${city}, Zimbabwe`,
        ContactEmail: `school${pad(index)}@starlight.ac.zw`,
        ContactPhone: `+26377${String(
          1000000 + index
        ).slice(-7)}`,
        LogoUrl: `https://placehold.co/256x256/png?text=S${pad(index)}`,
        Status: cycle(
          ["active", "trial", "suspended"],
          index
        ),
      };

    case "users":
      return {
        FirstName: firstName,
        LastName: lastName,
        Email: `seed.user${pad(index)}@starlight.test`,
        Phone: `+26371${String(
          2000000 + index
        ).slice(-7)}`,
        Role: cycle(ROLES, index),
        avatar: generatedAvatar(index),
      };

    case "admins":
      return {
        ...common,
        Position: cycle(
          [
            "School Administrator",
            "Deputy Administrator",
            "Finance Administrator",
            "Academic Administrator",
            "Admissions Officer",
          ],
          index
        ),
        Status: cycle(
          [
            "active",
            "inactive",
            "Suspended",
            "On_leave",
            "Resigned",
          ],
          index
        ),
        AssignedArea: cycle(
          [
            "Global Configuration",
            "Finance",
            "Academic Affairs",
            "Admissions",
            "User Accounts",
          ],
          index
        ),
        avatar: generatedAvatar(index),
      };

    case "applicants":
      return {
        ...common,
        ApplicationNo: `APP-${year}-${String(
          number
        ).padStart(4, "0")}`,
        LevelOrFormApplied: level,
        Status: cycle(
          ["pending", "accepted", "rejected"],
          index
        ),
      };

    case "students":
      return {
        ...common,
        classId: classRef,
        ClassId: classRef,
        Level: level,
        Form: `${level}${stream}`,
        EnrollmentDate: isoDate(index, -2),
        Status: cycle(
          [
            "active",
            "active",
            "active",
            "graduated",
            "suspended",
            "withdrawn",
          ],
          index
        ),
      };

    case "teachers":
      return {
        ...common,
        departmentId: departmentRef,
        DepartmentId: departmentRef,
        HireDate: dateOnly(index, -5),
        Qualification: cycle(
          QUALIFICATIONS,
          index
        ),
        SubjectSpecialization:
          cycle(SUBJECT_NAMES, index),
        Status: cycle(
          ["active", "active", "on_leave", "retired"],
          index
        ),
      };

    case "departments":
      return {
        ...common,
        Name: `${cycle(
          DEPARTMENT_NAMES,
          index
        )} ${pad(index)}`,
        headTeacherId: teacherRef,
        HeadTeacherId: teacherRef,
        OfficeLocation: `Administration Block ${String.fromCharCode(
          65 + (index % 6)
        )}-${number}`,
        ContactEmail: `department${pad(index)}@starlight.ac.zw`,
      };

    case "subjects":
      return {
        ...common,
        SubjectName: cycle(
          SUBJECT_NAMES,
          index
        ),
        SubjectCode: `${cycle(
          SUBJECT_CODES,
          index
        )}${String(number).padStart(
          2,
          "0"
        )}`,
        departmentId: departmentRef,
        DepartmentId: departmentRef,
      };

    case "classes":
      return {
        ...common,
        teacherId: teacherRef,
        TeacherId: teacherRef,
        LevelOrForm: `${level}${stream}`,
        Year: year,
        Room: `Room ${number}`,
        name: `${level}${stream}`,
        Name: `${level}${stream}`,
        Capacity: 30 + (index % 16),
      };

    case "teacher_subjects":
      return {
        ...common,
        teacherId: teacherRef,
        TeacherId: teacherRef,
        subjectId: subjectRef,
        SubjectId: subjectRef,
        classId: classRef,
        ClassId: classRef,
      };

    case "student_subjects":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        subjectId: subjectRef,
        SubjectId: subjectRef,
      };

    case "attendance":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        classId: classRef,
        ClassId: classRef,
        Date: isoDate(index),
        Status: cycle(
          ["present", "absent", "late", "excused"],
          index
        ),
        Remarks: cycle(
          [
            "On time",
            "Medical appointment",
            "Arrived after assembly",
            "Guardian notified",
          ],
          index
        ),
      };

    case "timetable":
      return {
        ...common,
        classId: classRef,
        ClassId: classRef,
        subjectId: subjectRef,
        SubjectId: subjectRef,
        teacherId: teacherRef,
        TeacherId: teacherRef,
        Day: cycle(
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          index
        ),
        TimeSlot: `${String(
          8 + (index % 7)
        ).padStart(2, "0")}:00-${String(
          9 + (index % 7)
        ).padStart(2, "0")}:00`,
        StartTime: `${String(
          8 + (index % 7)
        ).padStart(2, "0")}:00`,
        EndTime: `${String(
          9 + (index % 7)
        ).padStart(2, "0")}:00`,
        Term: term,
        Year: year,
        Room: `Room ${number}`,
      };

    case "exams":
      return {
        ...common,
        ExamName: `${term} Examination ${pad(index)}`,
        Name: `${term} Examination ${pad(index)}`,
        ExamDate: isoDate(index, 1),
        Date: isoDate(index, 1),
        Term: term,
        Year: year,
      };

    case "marks": {
      const score = 45 + ((index * 7) % 56);

      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        subjectId: subjectRef,
        SubjectId: subjectRef,
        teacherId: teacherRef,
        TeacherId: teacherRef,
        examId: examRef,
        ExamId: examRef,
        Score: score,
        Mark: score,
        Percentage: score,
        MarksObtained: score,
        TotalMarks: 100,
        Grade:
          score >= 75
            ? "A"
            : score >= 65
              ? "B"
              : score >= 50
                ? "C"
                : "D",
        Remarks:
          score >= 75
            ? "Excellent performance"
            : score >= 50
              ? "Satisfactory performance"
              : "Needs improvement",
      };
    }

    case "fees":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        LevelOrForm: `${level}${stream}`,
        Term: term,
        Description: cycle(
          [
            "Tuition fees",
            "Boarding fees",
            "Technology levy",
            "Sports levy",
            "Laboratory levy",
          ],
          index
        ),
        AmountDue:
          350 + (index % 8) * 75,
        Year: year,
        Status: cycle(
          ["pending", "paid", "overdue"],
          index
        ),
      };

    case "payments":
      return {
        ...common,
        feeId: feeRef,
        FeeId: feeRef,
        Amount:
          200 + (index % 10) * 50,
        Date: isoDate(index),
        PaymentDate: isoDate(index),
        Method: cycle(
          [
            "Cash",
            "Bank Transfer",
            "EcoCash",
            "Card",
          ],
          index
        ),
        Status: cycle(
          [
            "Approved",
            "Pending",
            "Flagged",
            "Overdue",
          ],
          index
        ),
        Reference: `PAY-${year}-${String(
          number
        ).padStart(5, "0")}`,
        receivedBy: adminRef,
        ReceivedBy: adminRef,
      };

    case "discipline":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        Incident: cycle(
          INCIDENTS,
          index
        ),
        Date: isoDate(index),
        ActionTaken: cycle(
          ACTIONS,
          index
        ),
        Remarks: `Follow-up scheduled for case ${pad(index)}.`,
        teacherId: teacherRef,
        TeacherId: teacherRef,
      };

    case "hostels":
      return {
        ...common,
        Name: cycle(HOSTEL_NAMES, index),
        Capacity: 40 + (index % 8) * 10,
        Gender: cycle(
          ["male", "female", "mixed"],
          index
        ),
        supervisorId: teacherRef,
        SupervisorId: teacherRef,
      };

    case "hostel_students":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        hostelId: hostelRef,
        HostelId: hostelRef,
        DateAssigned: isoDate(index, -1),
        RoomNumber: `H${(index % 5) + 1}-${String(
          number
        ).padStart(2, "0")}`,
        BedNumber: `B${(index % 4) + 1}`,
      };

    case "transport_routes": {
      const [startPoint, endPoint] =
        cycle(ROUTE_POINTS, index);

      return {
        ...common,
        Description: `${startPoint} to ${endPoint} school route`,
        RouteName: `Route ${pad(index)}`,
        StartPoint: startPoint,
        EndPoint: endPoint,
        Driver: `${cycle(
          FIRST_NAMES,
          index + 3
        )} ${cycle(
          LAST_NAMES,
          index + 5
        )}`,
        Vehicle: `BUS-${String(
          100 + number
        )}`,
        Fee: 35 + (index % 6) * 5,
      };
    }

    case "student_transport":
      return {
        ...common,
        studentId: studentRef,
        StudentId: studentRef,
        routeId: routeRef,
        RouteId: routeRef,
        Status: cycle(
          ["active", "inactive"],
          index
        ),
      };

    case "announcements":
      return {
        ...common,
        Title: cycle(
          [
            "School Assembly",
            "Examination Timetable",
            "Sports Day",
            "Parent Consultation",
            "Library Week",
          ],
          index
        ),
        Message: `Important school announcement number ${pad(index)} for all members of the school community.`,
        Date: isoDate(index),
        postedBy: userRef,
        PostedBy: userRef,
        Target: cycle(
          [
            "all",
            "students",
            "teachers",
            "parents",
          ],
          index
        ),
      };

    case "calendar":
      return {
        ...common,
        Title: cycle(
          [
            "Opening Day",
            "Staff Meeting",
            "Examination Day",
            "Sports Festival",
            "Closing Day",
          ],
          index
        ),
        Date: isoDate(index, 1),
        Description: `Scheduled school calendar event ${pad(index)}.`,
        postedBy: userRef,
        PostedBy: userRef,
        Type: cycle(
          [
            "academic",
            "administrative",
            "sports",
            "holiday",
          ],
          index
        ),
      };

    case "inventory":
      return {
        ...common,
        Name: cycle(
          INVENTORY_ITEMS,
          index
        ),
        ItemName: cycle(
          INVENTORY_ITEMS,
          index
        ),
        Quantity: 5 + (index * 7) % 96,
        Location: cycle(
          [
            "Main Store",
            "Computer Laboratory",
            "Science Laboratory",
            "Library",
            "Sports Office",
          ],
          index
        ),
        managedBy: adminRef,
        ManagedBy: adminRef,
        Status: cycle(
          [
            "available",
            "in_use",
            "maintenance",
            "low_stock",
          ],
          index
        ),
        Condition: cycle(
          [
            "excellent",
            "good",
            "fair",
            "requires_service",
          ],
          index
        ),
        LastUpdated: isoDate(index),
      };

    default:
      return {
        ...common,
        Name: `${tableName} Seed ${pad(index)}`,
        Title: `${tableName} Seed ${pad(index)}`,
        Description: `Generated seed record ${pad(index)} for ${tableName}.`,
        Date: isoDate(index),
        Status: "active",
        Quantity: number,
      };
  }
}

function columnFormat(column) {
  return String(
    column.format ?? ""
  ).toLowerCase();
}

function columnType(column) {
  return String(
    column.type ?? "string"
  ).toLowerCase();
}

function enumValue(column, value) {
  const elements = Array.isArray(
    column.elements
  )
    ? column.elements.map(String)
    : [];

  if (elements.length === 0) {
    return String(value ?? "");
  }

  const normalized =
    String(value ?? "").toLowerCase();

  const exact = elements.find(
    (element) =>
      element.toLowerCase() === normalized
  );

  return exact ?? elements[0];
}

function validDate(value, index) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? isoDate(index)
    : parsed.toISOString();
}

function scalarValue(
  column,
  value,
  context
) {
  const type = columnType(column);
  const format = columnFormat(column);
  const key = String(column.key ?? "");
  const lowerKey = key.toLowerCase();

  if (
    format === "enum" ||
    type === "enum"
  ) {
    return enumValue(column, value);
  }

  if (
    type === "integer" ||
    type === "bigint"
  ) {
    const numeric = Number(value);

    return Number.isFinite(numeric)
      ? Math.round(numeric)
      : context.index + 1;
  }

  if (
    type === "float" ||
    type === "double"
  ) {
    const numeric = Number(value);

    return Number.isFinite(numeric)
      ? numeric
      : context.index + 0.5;
  }

  if (type === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    return [
      "1",
      "true",
      "yes",
      "active",
    ].includes(
      String(value ?? "").toLowerCase()
    );
  }

  if (
    type === "datetime" ||
    format === "datetime"
  ) {
    return validDate(value, context.index);
  }

  if (
    format === "email" ||
    type === "email" ||
    lowerKey.includes("email")
  ) {
    const supplied = String(value ?? "");

    if (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        supplied
      )
    ) {
      return supplied;
    }

    return `seed.${normalizeName(
      context.tableName
    )}.${pad(
      context.index
    )}@starlight.test`;
  }

  if (
    format === "url" ||
    type === "url" ||
    lowerKey.includes("url")
  ) {
    const supplied = String(value ?? "");

    try {
      return new URL(supplied).toString();
    } catch {
      return `https://example.com/seed/${normalizeName(
        context.tableName
      )}/${pad(context.index)}`;
    }
  }

  if (
    format === "ip" ||
    type === "ip"
  ) {
    return `192.0.2.${
      (context.index % 200) + 1
    }`;
  }

  if (
    type === "relationship" ||
    lowerKey.endsWith("id")
  ) {
    return String(
      value ??
        `seed_reference_${pad(
          context.index
        )}`
    );
  }

  let output = String(
    value ??
      `${context.tableName} seed ${pad(
        context.index
      )}`
  );

  const size = Number(column.size);

  if (
    Number.isFinite(size) &&
    size > 0 &&
    output.length > size
  ) {
    output = output.slice(0, size);
  }

  return output;
}

function fallbackValue(column, context) {
  const key = String(
    column.key ?? ""
  ).toLowerCase();

  if (key.includes("name")) {
    return `${context.tableName} ${pad(
      context.index
    )}`;
  }

  if (key.includes("title")) {
    return `${context.tableName} Title ${pad(
      context.index
    )}`;
  }

  if (
    key.includes("description") ||
    key.includes("message") ||
    key.includes("remarks")
  ) {
    return `Generated seed content ${pad(
      context.index
    )} for ${context.tableName}.`;
  }

  if (
    key.includes("date") ||
    key.includes("time")
  ) {
    return isoDate(context.index);
  }

  if (
    key.includes("quantity") ||
    key.includes("capacity") ||
    key.includes("amount") ||
    key.includes("score") ||
    key.includes("year")
  ) {
    return context.index + 1;
  }

  if (key.includes("status")) {
    return "active";
  }

  return `${context.tableName}_${normalizeName(
    column.key
  )}_${pad(context.index)}`;
}

function buildRowData({
  table,
  columns,
  index,
}) {
  const candidate = candidateForTable(
    table.name,
    index
  );

  const context = {
    tableName: table.name,
    index,
  };

  const data = {};

  for (const column of columns) {
    const key = String(column.key ?? "");

    if (!key) {
      continue;
    }

    let value = candidate[key];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      if (
        column.required === true
      ) {
        value = fallbackValue(
          column,
          context
        );
      } else {
        continue;
      }
    }

    if (column.array === true) {
      const source = Array.isArray(value)
        ? value
        : [value];

      data[key] = source.map((item) =>
        scalarValue(
          {
            ...column,
            array: false,
          },
          item,
          context
        )
      );
    } else {
      data[key] = scalarValue(
        column,
        value,
        context
      );
    }
  }

  return data;
}

async function paginate(fetchPage, key) {
  const items = [];
  let offset = 0;
  let total = 0;

  while (true) {
    const result = await fetchPage([
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    const batch = Array.isArray(
      result?.[key]
    )
      ? result[key]
      : [];

    items.push(...batch);
    total = Number(
      result?.total ??
        items.length
    );

    if (
      batch.length === 0 ||
      batch.length < PAGE_SIZE ||
      items.length >= total
    ) {
      break;
    }

    offset = items.length;
  }

  return items;
}

async function listAllTables(
  tablesDB,
  databaseId
) {
  return paginate(
    (queries) =>
      tablesDB.listTables({
        databaseId,
        queries,
        total: true,
      }),
    "tables"
  );
}

async function listAllColumns(
  tablesDB,
  databaseId,
  tableId
) {
  return paginate(
    (queries) =>
      tablesDB.listColumns({
        databaseId,
        tableId,
        queries,
        total: true,
      }),
    "columns"
  );
}

function tableSort(left, right) {
  const leftName = normalizeName(left.name);
  const rightName =
    normalizeName(right.name);

  const leftIndex =
    EXPECTED_TABLE_ORDER.indexOf(
      leftName
    );

  const rightIndex =
    EXPECTED_TABLE_ORDER.indexOf(
      rightName
    );

  const safeLeft =
    leftIndex === -1
      ? Number.MAX_SAFE_INTEGER
      : leftIndex;

  const safeRight =
    rightIndex === -1
      ? Number.MAX_SAFE_INTEGER
      : rightIndex;

  if (safeLeft !== safeRight) {
    return safeLeft - safeRight;
  }

  return leftName.localeCompare(rightName);
}

function selectedTables(tables) {
  const only = process.env
    .SEED_ONLY_TABLES?.split(",")
    .map(normalizeName)
    .filter(Boolean);

  if (!only?.length) {
    return tables;
  }

  const allowed = new Set(only);

  return tables.filter((table) =>
    allowed.has(
      normalizeName(table.name)
    )
  );
}

function serializeError(error) {
  const raw =
    error && typeof error === "object"
      ? error
      : {};

  return {
    message:
      error instanceof Error
        ? error.message
        : String(error),
    code: raw.code ?? null,
    type: raw.type ?? null,
  };
}

async function delay(milliseconds) {
  if (milliseconds <= 0) {
    return;
  }

  await new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );
}

async function main() {
  const endpoint = requiredEnv(
    "APPWRITE_ENDPOINT",
    "NEXT_PUBLIC_APPWRITE_ENDPOINT"
  ).replace(/\/+$/, "");

  const projectId = requiredEnv(
    "APPWRITE_PROJECT_ID",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID"
  );

  const databaseId = requiredEnv(
    "APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID"
  );

  const apiKey = requiredEnv(
    "APPWRITE_API_KEY"
  );

  const rowsPerTable = integerEnv(
    "SEED_ROWS_PER_TABLE",
    DEFAULT_ROWS_PER_TABLE,
    1,
    100
  );

  const dryRun = booleanEnv(
    "SEED_DRY_RUN",
    false
  );

  const verify = booleanEnv(
    "SEED_VERIFY",
    true
  );

  const delayMs = integerEnv(
    "SEED_DELAY_MS",
    20,
    0,
    5000
  );

  const reportDirectory =
    process.env
      .SEED_REPORT_DIRECTORY?.trim() ||
    "appwrite-seed-output";

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDB = new TablesDB(client);

  console.log("");
  console.log(
    "StarLight Appwrite database seeder"
  );
  console.log(
    "=================================="
  );
  console.log(`Database: ${databaseId}`);
  console.log(
    `Rows per table: ${rowsPerTable}`
  );
  console.log(
    `Mode: ${
      dryRun ? "DRY RUN" : "WRITE"
    }`
  );
  console.log("");

  const allTables =
    await listAllTables(
      tablesDB,
      databaseId
    );

  const tables = selectedTables(
    [...allTables].sort(tableSort)
  );

  if (tables.length === 0) {
    throw new Error(
      "No tables were found for seeding."
    );
  }

  const report = {
    generatedAt:
      new Date().toISOString(),
    project: {
      endpoint,
      projectId,
      databaseId,
    },
    settings: {
      rowsPerTable,
      dryRun,
      verify,
      selectedTables:
        tables.map(
          (table) => table.name
        ),
    },
    summary: {
      tablesFound: allTables.length,
      tablesSelected: tables.length,
      rowsPlanned:
        tables.length * rowsPerTable,
      rowsSucceeded: 0,
      rowsFailed: 0,
    },
    tables: [],
  };

  for (
    let tableIndex = 0;
    tableIndex < tables.length;
    tableIndex += 1
  ) {
    const table = tables[tableIndex];

    console.log(
      `[${tableIndex + 1}/${tables.length}] ${table.name} (${table.$id})`
    );

    const tableReport = {
      tableId: table.$id,
      tableName: table.name,
      columns: [],
      planned: rowsPerTable,
      succeeded: 0,
      failed: 0,
      totalRowsAfterSeed: null,
      rows: [],
    };

    try {
      const columns =
        await listAllColumns(
          tablesDB,
          databaseId,
          table.$id
        );

      tableReport.columns =
        columns.map((column) => ({
          key: column.key,
          type: column.type,
          required: column.required,
          array: column.array,
          format:
            column.format ?? null,
          elements:
            column.elements ?? null,
        }));

      for (
        let rowIndex = 0;
        rowIndex < rowsPerTable;
        rowIndex += 1
      ) {
        const rowId = seedId(
          table.name,
          rowIndex
        );

        const data = buildRowData({
          table,
          columns,
          index: rowIndex,
        });

        try {
          if (!dryRun) {
            await tablesDB.upsertRow({
              databaseId,
              tableId: table.$id,
              rowId,
              data,
            });

            await delay(delayMs);
          }

          tableReport.succeeded += 1;
          report.summary.rowsSucceeded += 1;

          tableReport.rows.push({
            rowId,
            status: dryRun
              ? "validated"
              : "upserted",
          });

          process.stdout.write(
            `  ${rowIndex + 1}/${rowsPerTable}\r`
          );
        } catch (error) {
          const serialized =
            serializeError(error);

          tableReport.failed += 1;
          report.summary.rowsFailed += 1;

          tableReport.rows.push({
            rowId,
            status: "failed",
            error: serialized,
            data,
          });

          console.error(
            `\n  Failed ${rowId}: ${serialized.message}`
          );
        }
      }

      if (
        verify &&
        !dryRun
      ) {
        try {
          const result =
            await tablesDB.listRows({
              databaseId,
              tableId: table.$id,
              queries: [
                Query.limit(1),
              ],
              total: true,
              ttl: 0,
            });

          tableReport.totalRowsAfterSeed =
            Number(
              result.total ?? 0
            );
        } catch (error) {
          tableReport.verificationError =
            serializeError(error);
        }
      }
    } catch (error) {
      const serialized =
        serializeError(error);

      tableReport.failed =
        rowsPerTable;
      report.summary.rowsFailed +=
        rowsPerTable;

      tableReport.tableError =
        serialized;

      console.error(
        `  Table failed: ${serialized.message}`
      );
    }

    console.log(
      `  Completed: ${tableReport.succeeded}/${rowsPerTable} successful` +
        `${
          tableReport.totalRowsAfterSeed !== null
            ? `; table total=${tableReport.totalRowsAfterSeed}`
            : ""
        }`
    );
    console.log("");

    report.tables.push(tableReport);
  }

  const expectedSet = new Set(
    EXPECTED_TABLE_ORDER
  );

  const foundSet = new Set(
    allTables.map((table) =>
      normalizeName(table.name)
    )
  );

  report.expectedTablesMissing =
    [...expectedSet].filter(
      (name) => !foundSet.has(name)
    );

  const outputDirectory =
    path.resolve(reportDirectory);

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    }
  );

  const reportPath = path.join(
    outputDirectory,
    "appwrite-seed-report.json"
  );

  await fs.writeFile(
    reportPath,
    `${JSON.stringify(
      report,
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    "=================================="
  );
  console.log(
    `Tables seeded: ${report.summary.tablesSelected}`
  );
  console.log(
    `Rows planned: ${report.summary.rowsPlanned}`
  );
  console.log(
    `Rows successful: ${report.summary.rowsSucceeded}`
  );
  console.log(
    `Rows failed: ${report.summary.rowsFailed}`
  );
  console.log(
    `Report: ${reportPath}`
  );
  console.log("");

  if (
    report.expectedTablesMissing.length
  ) {
    console.warn(
      `Expected tables not found: ${report.expectedTablesMissing.join(
        ", "
      )}`
    );
  }

  if (
    report.summary.rowsFailed > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("");
  console.error("Seeding failed.");
  console.error(
    error instanceof Error
      ? error.message
      : error
  );
  console.error("");
  console.error(
    "Check the endpoint, project ID, database ID, API key, and API-key scopes."
  );

  process.exitCode = 1;
});
