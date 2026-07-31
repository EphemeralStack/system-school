// scripts/seed-primary-school-to-20.mjs
//
// Brings the database to exactly:
//   - 20 teacher rows
//   - 20 class rows
//
// It preserves existing teachers/classes and creates only the missing totals.
// It also makes sure each of the 20 classes has one distinct valid teacher.
//
// Safety:
//   - Dry-run by default.
//   - Use --execute to write.
//   - Never deletes existing teachers or classes.
//   - Uses real department rows.
//   - Creates matching Auth + users + teachers records for new teachers.
//   - Writes temporary credentials to an ignored private folder.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import {
  Client,
  ID,
  Permission,
  Query,
  Role,
  TablesDB,
  Users,
} from "node-appwrite";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const EXECUTE =
  process.argv.includes("--execute");

const TARGET_TEACHERS = 20;
const TARGET_CLASSES = 20;

const ENDPOINT =
  firstEnvironmentValue(
    "APPWRITE_ENDPOINT",
    "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  ) ||
  "https://syd.cloud.appwrite.io/v1";

const PROJECT_ID =
  firstEnvironmentValue(
    "APPWRITE_PROJECT_ID",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  ) ||
  "6a466db90017775cb15a";

const DATABASE_ID =
  firstEnvironmentValue(
    "APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
  ) ||
  "6a4679b4003a283bf7c5";

const API_KEY =
  requiredEnvironmentValue(
    "Appwrite server API key",
    "SCHOOL_APPWRITE_SERVER_API_KEY",
    "APPWRITE_SERVER_API_KEY",
    "APPWRITE_API_KEY",
    "APPWRITE_KEY",
  );

const TABLES = {
  users:
    firstEnvironmentValue(
      "SCHOOL_APPWRITE_USERS_TABLE_ID",
      "NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID",
    ) ||
    "6a467bca0028aa4c101d",

  teachers:
    firstEnvironmentValue(
      "SCHOOL_APPWRITE_TEACHERS_TABLE_ID",
      "NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID",
    ) ||
    "6a468fef0015ef8b6700",

  departments:
    firstEnvironmentValue(
      "SCHOOL_APPWRITE_DEPARTMENTS_TABLE_ID",
      "NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID",
    ) ||
    "6a46906e003010e3ae68",

  classes:
    firstEnvironmentValue(
      "SCHOOL_APPWRITE_CLASSES_TABLE_ID",
      "NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID",
    ) ||
    "6a46954400004dcdad0a",
};

const OUTPUT_ROOT =
  path.resolve(
    "appwrite-auth-provisioning",
    "primary-school-total-20",
  );

const PRIMARY_LEVELS =
  new Set([
    "ECD A",
    "ECD B",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
  ]);

const CLASS_TEMPLATES = [
  { name: "ECD A Sunflowers", level: "ECD A", room: "ECD-A1" },
  { name: "ECD A Rainbows", level: "ECD A", room: "ECD-A2" },
  { name: "ECD B Stars", level: "ECD B", room: "ECD-B1" },
  { name: "ECD B Explorers", level: "ECD B", room: "ECD-B2" },
  { name: "Grade 1A", level: "Grade 1", room: "G1-A" },
  { name: "Grade 1B", level: "Grade 1", room: "G1-B" },
  { name: "Grade 2A", level: "Grade 2", room: "G2-A" },
  { name: "Grade 2B", level: "Grade 2", room: "G2-B" },
  { name: "Grade 3A", level: "Grade 3", room: "G3-A" },
  { name: "Grade 3B", level: "Grade 3", room: "G3-B" },
  { name: "Grade 4A", level: "Grade 4", room: "G4-A" },
  { name: "Grade 4B", level: "Grade 4", room: "G4-B" },
  { name: "Grade 5A", level: "Grade 5", room: "G5-A" },
  { name: "Grade 5B", level: "Grade 5", room: "G5-B" },
  { name: "Grade 6A", level: "Grade 6", room: "G6-A" },
  { name: "Grade 6B", level: "Grade 6", room: "G6-B" },
  { name: "Grade 6C", level: "Grade 6", room: "G6-C" },
  { name: "Grade 7A", level: "Grade 7", room: "G7-A" },
  { name: "Grade 7B", level: "Grade 7", room: "G7-B" },
  { name: "Grade 7C", level: "Grade 7", room: "G7-C" },
];

const TARGET_CLASS_DISTRIBUTION = new Map([
  ["ECD A", 2],
  ["ECD B", 2],
  ["Grade 1", 2],
  ["Grade 2", 2],
  ["Grade 3", 2],
  ["Grade 4", 2],
  ["Grade 5", 2],
  ["Grade 6", 3],
  ["Grade 7", 3],
]);

const TEACHER_TEMPLATES = [
  ["Tariro", "Moyo", "Diploma in Education (Early Childhood Development)"],
  ["Rudo", "Ncube", "Bachelor of Education in Early Childhood Development"],
  ["Tapiwa", "Dube", "Diploma in Education (Early Childhood Development)"],
  ["Nyasha", "Sibanda", "Bachelor of Education in Early Childhood Development"],
  ["Farai", "Chikore", "Diploma in Education (Infant Education)"],
  ["Rutendo", "Mlambo", "Bachelor of Education in Primary Education"],
  ["Tinashe", "Marufu", "Diploma in Education (Infant Education)"],
  ["Shamiso", "Ndlovu", "Bachelor of Education Honours in Primary Education"],
  ["Tendai", "Zhou", "Diploma in Education (Junior Education)"],
  ["Chipo", "Mupfumi", "Bachelor of Education in Primary Education"],
  ["Brian", "Muchengeti", "Diploma in Education (Primary)"],
  ["Memory", "Gumbo", "Bachelor of Education Honours in Primary Education"],
  ["Kelvin", "Maposa", "Diploma in Education (Primary)"],
  ["Faith", "Nyoni", "Bachelor of Education in Primary Education"],
  ["Blessing", "Chirenje", "Diploma in Education (Primary)"],
  ["Linda", "Mataruse", "Bachelor of Education Honours in Primary Education"],
  ["Simbarashe", "Mutasa", "Postgraduate Diploma in Education (PGDE)"],
  ["Patricia", "Chuma", "Diploma in Education (Primary)"],
  ["Tatenda", "Mahachi", "Bachelor of Education in Primary Education"],
  ["Nomsa", "Mhlanga", "Bachelor of Education Honours in Primary Education"],
].map(([firstName, lastName, qualification], index) => ({
  seedNumber: index + 1,
  firstName,
  lastName,
  qualification,
  email:
    `primary.teacher${String(index + 1).padStart(2, "0")}@binduraprimary.co.zw`,
  phone:
    `+2637715${String(index + 1).padStart(5, "0")}`,
  hireDate:
    index % 2 === 0
      ? "2025-01-06"
      : "2025-05-05",
}));

function firstEnvironmentValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
}

function requiredEnvironmentValue(label, ...names) {
  const value = firstEnvironmentValue(...names);

  if (!value) {
    throw new Error(
      `Missing ${label}. Set one of: ${names.join(", ")}`,
    );
  }

  return value;
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}


function getExistingClassNormalization(classRow) {
  const currentName =
    normalizeText(classRow.name);

  const currentLevel =
    normalizeText(
      classRow.LevelOrForm,
    );

  const formMatch =
    currentLevel.match(
      /^Form\s+([1-7])$/i,
    );

  if (!formMatch) {
    return {
      classId:
        classRow.$id,
      currentName,
      currentLevel,
      targetName:
        currentName,
      targetLevel:
        currentLevel,
      changed:
        false,
    };
  }

  const gradeNumber =
    formMatch[1];

  const targetLevel =
    `Grade ${gradeNumber}`;

  let targetName =
    currentName;

  if (
    new RegExp(
      `^${gradeNumber}\\s+`,
      "i",
    ).test(currentName)
  ) {
    targetName =
      `Grade ${currentName}`;
  } else if (
    !currentName
      .toLowerCase()
      .startsWith("grade ")
  ) {
    targetName =
      currentName
        ? `${targetLevel} ${currentName}`
        : targetLevel;
  }

  return {
    classId:
      classRow.$id,
    currentName,
    currentLevel,
    targetName,
    targetLevel,
    changed:
      targetName !== currentName ||
      targetLevel !== currentLevel,
  };
}

function generateTemporaryPassword(length = 24) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const all = uppercase + lowercase + digits + symbols;

  const randomCharacter = (characters) =>
    characters[crypto.randomInt(0, characters.length)];

  const characters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(digits),
    randomCharacter(symbols),
  ];

  while (characters.length < length) {
    characters.push(randomCharacter(all));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);

    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

function ownerAndAdminPermissions(userId) {
  const owner = Role.user(userId);
  const admin = Role.label("admin");

  return [
    Permission.read(owner),
    Permission.update(owner),
    Permission.read(admin),
    Permission.update(admin),
    Permission.delete(admin),
  ];
}

function classPermissions() {
  const admin = Role.label("admin");

  return [
    Permission.read(admin),
    Permission.update(admin),
    Permission.delete(admin),
    Permission.read(Role.label("teacher")),
    Permission.read(Role.label("student")),
  ];
}

async function listAllRows(tablesDB, tableId) {
  const rows = [];
  let offset = 0;

  while (true) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [
        Query.limit(100),
        Query.offset(offset),
      ],
      total: true,
      ttl: 0,
    });

    rows.push(...response.rows);

    if (
      response.rows.length < 100 ||
      rows.length >= response.total
    ) {
      return rows;
    }

    offset += response.rows.length;
  }
}

async function listAllAuthUsers(users) {
  const collected = [];
  let offset = 0;

  while (true) {
    const response = await users.list({
      queries: [
        Query.limit(100),
        Query.offset(offset),
      ],
      total: true,
    });

    collected.push(...response.users);

    if (
      response.users.length < 100 ||
      collected.length >= response.total
    ) {
      return collected;
    }

    offset += response.users.length;
  }
}

function csvEscape(value) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

async function writeOutputs(credentials, report) {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "seed-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  if (credentials.length === 0) return;

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "temporary-credentials.json"),
    `${JSON.stringify(credentials, null, 2)}\n`,
    "utf8",
  );

  const headers = [
    "teacherName",
    "email",
    "temporaryPassword",
    "authUserId",
    "teacherRowId",
    "department",
    "qualification",
  ];

  const lines = [
    headers.join(","),
    ...credentials.map((row) =>
      headers.map((key) => csvEscape(row[key])).join(","),
    ),
  ];

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "temporary-credentials.csv"),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

async function createSeedTeacher({
  template,
  department,
  users,
  tablesDB,
  authByEmail,
  userRowsById,
  teacherRows,
}) {
  const normalizedEmail = normalizeEmail(template.email);

  let authUser = authByEmail.get(normalizedEmail);
  let temporaryPassword = "";
  let authCreated = false;
  let userRowCreated = false;
  let teacherRowCreated = false;

  if (!authUser) {
    const userId = ID.unique();
    temporaryPassword = generateTemporaryPassword();

    authUser = await users.create({
      userId,
      email: template.email,
      password: temporaryPassword,
      name: `${template.firstName} ${template.lastName}`,
    });

    authCreated = true;

    await users.updateLabels({
      userId,
      labels: ["teacher"],
    });

    await users.updatePrefs({
      userId,
      prefs: {
        Role: "teacher",
        FirstName: template.firstName,
        LastName: template.lastName,
        phone: template.phone,
        mustChangePassword: true,
        seededPrimaryTeacher: true,
      },
    });

    authByEmail.set(normalizedEmail, authUser);
  }

  const userId = authUser.$id;

  if (!userRowsById.has(userId)) {
    const userRow = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.users,
      rowId: userId,
      data: {
        FirstName: template.firstName,
        LastName: template.lastName,
        Email: template.email,
        Phone: template.phone,
        Role: "teacher",
      },
      permissions: ownerAndAdminPermissions(userId),
    });

    userRowsById.set(userId, userRow);
    userRowCreated = true;
  }

  let teacherRow = teacherRows.find(
    (row) => normalizeText(row.userId) === userId,
  );

  if (!teacherRow) {
    teacherRow = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.teachers,
      rowId: userId,
      data: {
        userId,
        departmentId: department.id,
        HireDate: template.hireDate,
        Qualification: template.qualification,
        SubjectSpecialization: department.name,
        Status: "active",
      },
      permissions: ownerAndAdminPermissions(userId),
    });

    teacherRows.push(teacherRow);
    teacherRowCreated = true;
  }

  return {
    teacherRow,
    credential:
      authCreated && temporaryPassword
        ? {
            teacherName:
              `${template.firstName} ${template.lastName}`,
            email: template.email,
            temporaryPassword,
            authUserId: userId,
            teacherRowId: teacherRow.$id,
            department: department.name,
            qualification: template.qualification,
          }
        : null,
    created: {
      auth: authCreated,
      userRow: userRowCreated,
      teacherRow: teacherRowCreated,
    },
  };
}

async function main() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const users = new Users(client);
  const tablesDB = new TablesDB(client);

  console.log("");
  console.log("Zimbabwe primary totals seeder");
  console.log("==============================");
  console.log(`Mode:      ${EXECUTE ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Endpoint:  ${ENDPOINT}`);
  console.log(`Project:   ${PROJECT_ID}`);
  console.log(`Database:  ${DATABASE_ID}`);
  console.log("");

  const [
    departments,
    userRows,
    teacherRows,
    classRows,
    authUsers,
  ] = await Promise.all([
    listAllRows(tablesDB, TABLES.departments),
    listAllRows(tablesDB, TABLES.users),
    listAllRows(tablesDB, TABLES.teachers),
    listAllRows(tablesDB, TABLES.classes),
    listAllAuthUsers(users),
  ]);

  if (teacherRows.length > TARGET_TEACHERS) {
    throw new Error(
      `There are already ${teacherRows.length} teachers. This script will not delete teachers to reach ${TARGET_TEACHERS}.`,
    );
  }

  if (classRows.length > TARGET_CLASSES) {
    throw new Error(
      `There are already ${classRows.length} classes. This script will not delete classes to reach ${TARGET_CLASSES}.`,
    );
  }

  const usableDepartments = departments
    .map((row) => ({
      id: row.$id,
      name:
        normalizeText(row.Name) ||
        `Department ${row.$id}`,
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name),
    );

  if (usableDepartments.length === 0) {
    throw new Error(
      "No departments exist. Create at least one department before seeding teachers.",
    );
  }

  const teachersToCreate =
    TARGET_TEACHERS - teacherRows.length;

  const classesToCreate =
    TARGET_CLASSES - classRows.length;

  const validTeacherIds =
    new Set(teacherRows.map((row) => row.$id));

  const usedTeacherIds = new Set();
  const classesNeedingTeacher = [];

  for (const classRow of classRows) {
    const teacherId = normalizeText(classRow.teacherId);

    if (
      teacherId &&
      validTeacherIds.has(teacherId) &&
      !usedTeacherIds.has(teacherId)
    ) {
      usedTeacherIds.add(teacherId);
    } else {
      classesNeedingTeacher.push(classRow);
    }
  }

  const currentlyUnassignedTeachers =
    teacherRows.filter(
      (row) => !usedTeacherIds.has(row.$id),
    );

  const classNormalizations =
    classRows
      .map(
        getExistingClassNormalization,
      )
      .filter(
        (normalization) =>
          normalization.changed,
      );

  const normalizationById =
    new Map(
      classNormalizations.map(
        (normalization) => [
          normalization.classId,
          normalization,
        ],
      ),
    );

  const projectedClassRows =
    classRows.map((row) => {
      const normalization =
        normalizationById.get(
          row.$id,
        );

      if (!normalization) {
        return row;
      }

      return {
        ...row,
        name:
          normalization.targetName,
        LevelOrForm:
          normalization.targetLevel,
      };
    });

  const existingClassNames =
    new Set(
      projectedClassRows.map(
        (row) =>
          normalizeText(
            row.name,
          ).toLowerCase(),
      ),
    );

  const existingLevelCounts =
    new Map(
      [...PRIMARY_LEVELS].map(
        (level) => [
          level,
          0,
        ],
      ),
    );

  for (
    const classRow of
      projectedClassRows
  ) {
    const level =
      normalizeText(
        classRow.LevelOrForm,
      );

    if (
      existingLevelCounts.has(
        level,
      )
    ) {
      existingLevelCounts.set(
        level,
        (
          existingLevelCounts.get(
            level,
          ) || 0
        ) + 1,
      );
    }
  }

  const classTemplatesToCreate =
    [];

  for (
    const [
      level,
      targetCount,
    ] of
      TARGET_CLASS_DISTRIBUTION
  ) {
    const currentCount =
      existingLevelCounts.get(
        level,
      ) || 0;

    const requiredCount =
      Math.max(
        0,
        targetCount -
          currentCount,
      );

    const availableTemplates =
      CLASS_TEMPLATES.filter(
        (template) =>
          template.level ===
            level &&
          !existingClassNames.has(
            template.name
              .toLowerCase(),
          ),
      );

    if (
      availableTemplates.length <
      requiredCount
    ) {
      throw new Error(
        `Not enough ${level} class templates are available. Required ${requiredCount}, available ${availableTemplates.length}.`,
      );
    }

    const selectedTemplates =
      availableTemplates.slice(
        0,
        requiredCount,
      );

    classTemplatesToCreate.push(
      ...selectedTemplates,
    );

    for (
      const template of
        selectedTemplates
    ) {
      existingClassNames.add(
        template.name
          .toLowerCase(),
      );
    }
  }

  if (
    classTemplatesToCreate.length !==
    classesToCreate
  ) {
    throw new Error(
      `The primary grade distribution needs ${classTemplatesToCreate.length} new classes, but the database total requires ${classesToCreate}.`,
    );
  }

  const seededAuthEmails = new Set(
    authUsers.map((user) =>
      normalizeEmail(user.email),
    ),
  );

  const teacherTemplatesToCreate =
    TEACHER_TEMPLATES
      .filter(
        (template) =>
          !seededAuthEmails.has(
            normalizeEmail(template.email),
          ),
      )
      .slice(0, teachersToCreate);

  if (
    teacherTemplatesToCreate.length !==
    teachersToCreate
  ) {
    throw new Error(
      "Not enough unused teacher seed identities are available to reach 20 teachers.",
    );
  }

  const primaryWarnings =
    projectedClassRows
      .filter(
        (row) =>
          !PRIMARY_LEVELS.has(
            normalizeText(
              row.LevelOrForm,
            ),
          ),
      )
      .map((row) => ({
        id: row.$id,
        name:
          normalizeText(
            row.name,
          ) ||
          "Unnamed Class",
        level:
          normalizeText(
            row.LevelOrForm,
          ) ||
          "(blank)",
      }));

  console.log(`Existing teachers:          ${teacherRows.length}`);
  console.log(`Existing classes:           ${classRows.length}`);
  console.log(`Teachers to create:         ${teachersToCreate}`);
  console.log(`Classes to create:          ${classesToCreate}`);
  console.log(`Existing unassigned:        ${currentlyUnassignedTeachers.length}`);
  console.log(`Classes needing reassignment: ${classesNeedingTeacher.length}`);
  console.log(`Departments found:          ${usableDepartments.length}`);
  console.log("");
  console.log(`Final teachers after run:   ${TARGET_TEACHERS}`);
  console.log(`Final classes after run:    ${TARGET_CLASSES}`);
  console.log("");

  if (
    classNormalizations.length >
    0
  ) {
    console.log(
      "Existing classes to convert to primary terminology:",
    );

    for (
      const normalization of
        classNormalizations
    ) {
      console.log(
        `  - ${normalization.currentName}: ${normalization.currentLevel} -> ${normalization.targetName}: ${normalization.targetLevel}`,
      );
    }

    console.log("");
  }

  if (primaryWarnings.length > 0) {
    console.log(
      "Unsupported class values that cannot be converted automatically:",
    );

    for (
      const warning of
        primaryWarnings
    ) {
      console.log(
        `  - ${warning.name}: ${warning.level}`,
      );
    }

    console.log("");

    throw new Error(
      "Unsupported non-primary class values remain after normalization.",
    );
  }

  console.log(
    "Final planned class distribution:",
  );

  for (
    const [
      level,
      targetCount,
    ] of
      TARGET_CLASS_DISTRIBUTION
  ) {
    console.log(
      `  - ${level}: ${targetCount}`,
    );
  }

  console.log("");
  console.log("New teachers planned:");
  teacherTemplatesToCreate.forEach((template, index) => {
    const department =
      usableDepartments[index % usableDepartments.length];

    console.log(
      `  ${String(index + 1).padStart(2, "0")}. ${template.firstName} ${template.lastName} | ${department.name}`,
    );
  });

  console.log("");
  console.log("New classes planned:");
  classTemplatesToCreate.forEach((template, index) => {
    console.log(
      `  ${String(index + 1).padStart(2, "0")}. ${template.name} | ${template.level} | ${template.room}`,
    );
  });

  if (!EXECUTE) {
    console.log("");
    console.log("DRY RUN COMPLETE");
    console.log("No Appwrite records were changed.");
    console.log("");
    console.log(
      "Run with --execute after reviewing this exact-total plan.",
    );
    return;
  }

  for (
    const normalization of
      classNormalizations
  ) {
    await tablesDB.updateRow({
      databaseId:
        DATABASE_ID,
      tableId:
        TABLES.classes,
      rowId:
        normalization.classId,
      data: {
        name:
          normalization.targetName,
        LevelOrForm:
          normalization.targetLevel,
      },
    });

    console.log(
      `[normalize] ${normalization.currentName}: ${normalization.currentLevel} -> ${normalization.targetName}: ${normalization.targetLevel}`,
    );
  }

  const authByEmail = new Map(
    authUsers.map((user) => [
      normalizeEmail(user.email),
      user,
    ]),
  );

  const userRowsById = new Map(
    userRows.map((row) => [row.$id, row]),
  );

  const credentials = [];
  const creationResults = [];
  const newTeacherRows = [];

  for (
    let index = 0;
    index < teacherTemplatesToCreate.length;
    index += 1
  ) {
    const template =
      teacherTemplatesToCreate[index];

    const department =
      usableDepartments[index % usableDepartments.length];

    const result =
      await createSeedTeacher({
        template,
        department,
        users,
        tablesDB,
        authByEmail,
        userRowsById,
        teacherRows,
      });

    newTeacherRows.push(result.teacherRow);

    if (result.credential) {
      credentials.push(result.credential);
    }

    creationResults.push({
      teacherName:
        `${template.firstName} ${template.lastName}`,
      email: template.email,
      teacherRowId:
        result.teacherRow.$id,
      department:
        department.name,
      created:
        result.created,
    });

    console.log(
      `[teacher ${index + 1}/${teacherTemplatesToCreate.length}] ${template.firstName} ${template.lastName}: ready`,
    );
  }

  const assignmentPool = [
    ...currentlyUnassignedTeachers,
    ...newTeacherRows,
  ];

  const requiredAssignments =
    classesNeedingTeacher.length +
    classTemplatesToCreate.length;

  if (assignmentPool.length < requiredAssignments) {
    throw new Error(
      `Only ${assignmentPool.length} unassigned teachers are available for ${requiredAssignments} required class assignments.`,
    );
  }

  let poolIndex = 0;

  for (const classRow of classesNeedingTeacher) {
    const teacherRow = assignmentPool[poolIndex];
    poolIndex += 1;

    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.classes,
      rowId: classRow.$id,
      data: {
        teacherId: teacherRow.$id,
      },
    });

    console.log(
      `[repair] ${normalizeText(classRow.name) || classRow.$id} assigned to ${teacherRow.$id}`,
    );
  }

  const createdClasses = [];

  for (
    let index = 0;
    index < classTemplatesToCreate.length;
    index += 1
  ) {
    const template =
      classTemplatesToCreate[index];

    const teacherRow =
      assignmentPool[poolIndex];

    poolIndex += 1;

    const classRow =
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.classes,
        rowId: ID.unique(),
        data: {
          name: template.name,
          teacherId: teacherRow.$id,
          LevelOrForm: template.level,
          Room: template.room,
        },
        permissions: classPermissions(),
      });

    createdClasses.push({
      classId: classRow.$id,
      name: template.name,
      level: template.level,
      room: template.room,
      teacherRowId: teacherRow.$id,
    });

    console.log(
      `[class ${index + 1}/${classTemplatesToCreate.length}] ${template.name}: ready`,
    );
  }

  const [
    finalTeachers,
    finalClasses,
  ] = await Promise.all([
    listAllRows(tablesDB, TABLES.teachers),
    listAllRows(tablesDB, TABLES.classes),
  ]);

  const uniqueAssignedTeacherIds =
    new Set(
      finalClasses
        .map((row) =>
          normalizeText(row.teacherId),
        )
        .filter(Boolean),
    );

  const invalidFinalClasses =
    finalClasses.filter(
      (row) =>
        !PRIMARY_LEVELS.has(
          normalizeText(
            row.LevelOrForm,
          ),
        ),
    );

  const finalDistribution =
    Object.fromEntries(
      [...TARGET_CLASS_DISTRIBUTION.keys()].map(
        (level) => [
          level,
          finalClasses.filter(
            (row) =>
              normalizeText(
                row.LevelOrForm,
              ) === level,
          ).length,
        ],
      ),
    );

  const distributionComplete =
    [...TARGET_CLASS_DISTRIBUTION].every(
      ([
        level,
        targetCount,
      ]) =>
        finalDistribution[level] ===
        targetCount,
    );

  const complete =
    finalTeachers.length === TARGET_TEACHERS &&
    finalClasses.length === TARGET_CLASSES &&
    uniqueAssignedTeacherIds.size === TARGET_CLASSES &&
    invalidFinalClasses.length === 0 &&
    distributionComplete;

  const report = {
    completedAt:
      new Date().toISOString(),
    complete,
    target: {
      teachers: TARGET_TEACHERS,
      classes: TARGET_CLASSES,
    },
    before: {
      teachers: teacherRows.length - newTeacherRows.length,
      classes: classRows.length,
    },
    created: {
      teachers: newTeacherRows.length,
      classes: createdClasses.length,
      credentials: credentials.length,
    },
    normalizedExistingClasses:
      classNormalizations,
    final: {
      teachers:
        finalTeachers.length,
      classes:
        finalClasses.length,
      uniqueAssignedTeachers:
        uniqueAssignedTeacherIds.size,
      invalidPrimaryLevels:
        invalidFinalClasses.length,
      distribution:
        finalDistribution,
    },
    teacherResults:
      creationResults,
    classes:
      createdClasses,
  };

  await writeOutputs(credentials, report);

  console.log("");
  console.log("PRIMARY TOTALS SEED COMPLETE");
  console.log("============================");
  console.log(`Teachers:                ${finalTeachers.length}/20`);
  console.log(`Classes:                 ${finalClasses.length}/20`);
  console.log(`Unique assigned teachers:${uniqueAssignedTeacherIds.size}/20`);
  console.log(`Invalid primary levels:  ${invalidFinalClasses.length}`);
  console.log(`Distribution verified:   ${distributionComplete ? "yes" : "no"}`);
  console.log(`New credentials:         ${credentials.length}`);
  console.log(`Output folder:           ${OUTPUT_ROOT}`);
  console.log("");

  if (!complete) {
    throw new Error(
      "The final totals, primary-level distribution, or one-teacher-per-class verification did not pass.",
    );
  }

  console.log(
    "Keep temporary credential files private and do not commit them.",
  );
}

main().catch((error) => {
  console.error("");
  console.error("PRIMARY TOTALS SEED FAILED");
  console.error("==========================");
  console.error(
    error instanceof Error
      ? error.message
      : error,
  );
  console.error("");
  process.exitCode = 1;
});
