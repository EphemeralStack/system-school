import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { Client, Query, TablesDB } from "node-appwrite";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const EXECUTE = process.argv.includes("--execute");
const env = (...names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
};
const required = (label, ...names) => {
  const value = env(...names);
  if (!value) throw new Error(`Missing ${label}. Set one of: ${names.join(", ")}`);
  return value;
};

const ENDPOINT = env("APPWRITE_ENDPOINT", "NEXT_PUBLIC_APPWRITE_ENDPOINT") || "https://syd.cloud.appwrite.io/v1";
const PROJECT_ID = env("APPWRITE_PROJECT_ID", "NEXT_PUBLIC_APPWRITE_PROJECT_ID") || "6a466db90017775cb15a";
const DATABASE_ID = env("APPWRITE_DATABASE_ID", "NEXT_PUBLIC_APPWRITE_DATABASE_ID") || "6a4679b4003a283bf7c5";
const API_KEY = required(
  "Appwrite server API key",
  "SCHOOL_APPWRITE_SERVER_API_KEY",
  "APPWRITE_SERVER_API_KEY",
  "APPWRITE_API_KEY",
  "APPWRITE_KEY",
);

const TABLES = {
  users: env("SCHOOL_APPWRITE_USERS_TABLE_ID", "NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID") || "6a467bca0028aa4c101d",
  teachers: env("SCHOOL_APPWRITE_TEACHERS_TABLE_ID", "NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID") || "6a468fef0015ef8b6700",
  classes: env("SCHOOL_APPWRITE_CLASSES_TABLE_ID", "NEXT_PUBLIC_APPWRITE_CLASSES_COLLECTION_ID") || "6a46954400004dcdad0a",
};

const OUTPUT_DIR = path.resolve("appwrite-integrity-repairs", "teacher-class-backfill");
const text = (value) => typeof value === "string" ? value.trim() : "";

async function listAllRows(tablesDB, tableId) {
  const rows = [];
  let offset = 0;

  while (true) {
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [Query.limit(100), Query.offset(offset)],
      total: true,
      ttl: 0,
    });

    rows.push(...result.rows);

    if (result.rows.length < 100 || rows.length >= result.total) {
      return rows;
    }

    offset += result.rows.length;
  }
}

async function findClassColumn(tablesDB) {
  const result = await tablesDB.listColumns({
    databaseId: DATABASE_ID,
    tableId: TABLES.teachers,
    queries: [Query.limit(100)],
  });

  const columns = result.columns || [];
  const exact = columns.find((column) => column.key === "class");
  const insensitive = columns.filter(
    (column) => text(column.key).toLowerCase() === "class",
  );

  const column = exact || (insensitive.length === 1 ? insensitive[0] : null);

  if (!column) {
    throw new Error(
      `No unambiguous teachers.class column was found. Available: ${columns.map((column) => column.key).join(", ")}`,
    );
  }

  return column;
}

function getMode(column) {
  const type = text(column.type).toLowerCase();

  if (type === "relationship") return "relationship";

  if (["string", "varchar", "text", "mediumtext", "longtext"].includes(type)) {
    return "text";
  }

  throw new Error(
    `Unsupported teachers.${column.key} type "${column.type}". Use relationship or text.`,
  );
}

function isArrayRelationship(column) {
  if (column.array === true) return true;

  const relationType = text(column.relationType).toLowerCase();

  return [
    "onetomany",
    "manytomany",
    "one_to_many",
    "many_to_many",
  ].includes(relationType);
}

function relatedId(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.$id === "string") {
    return value.$id.trim();
  }
  if (Array.isArray(value) && value.length === 1) {
    return relatedId(value[0]);
  }
  return "";
}

function matches({ current, expected, mode, array }) {
  if (mode === "text") return text(current) === expected;

  if (array) {
    if (!Array.isArray(current)) return false;
    const ids = current.map(relatedId).filter(Boolean);
    return ids.length === 1 && ids[0] === expected;
  }

  return relatedId(current) === expected;
}

function teacherName(teacher, usersById) {
  const user = usersById.get(text(teacher.userId));

  if (!user) {
    return text(teacher.SubjectSpecialization) || `Teacher ${teacher.$id}`;
  }

  const name = [text(user.FirstName), text(user.LastName)].filter(Boolean).join(" ");

  return name || text(user.Email) || `Teacher ${teacher.$id}`;
}

async function saveReport(report, suffix) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const file = path.join(OUTPUT_DIR, `${suffix}-report.json`);

  await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return file;
}

async function main() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const tablesDB = new TablesDB(client);

  console.log("");
  console.log("Teacher-class column backfill");
  console.log("=============================");
  console.log(`Mode:      ${EXECUTE ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Endpoint:  ${ENDPOINT}`);
  console.log(`Project:   ${PROJECT_ID}`);
  console.log(`Database:  ${DATABASE_ID}`);
  console.log("");

  const [column, users, teachers, classes] = await Promise.all([
    findClassColumn(tablesDB),
    listAllRows(tablesDB, TABLES.users),
    listAllRows(tablesDB, TABLES.teachers),
    listAllRows(tablesDB, TABLES.classes),
  ]);

  const mode = getMode(column);
  const array = mode === "relationship" && isArrayRelationship(column);
  const relatedTableId = text(column.relatedTable || column.relatedTableId);

  if (mode === "relationship" && relatedTableId && relatedTableId !== TABLES.classes) {
    throw new Error(
      `teachers.${column.key} points to ${relatedTableId}, not classes ${TABLES.classes}.`,
    );
  }

  const usersById = new Map(users.map((row) => [row.$id, row]));
  const teachersById = new Map(teachers.map((row) => [row.$id, row]));
  const classesByTeacherId = new Map();
  const classesWithoutTeacher = [];
  const brokenClassTeacherLinks = [];

  for (const classRow of classes) {
    const teacherId = text(classRow.teacherId);

    if (!teacherId) {
      classesWithoutTeacher.push({
        classId: classRow.$id,
        className: text(classRow.name) || classRow.$id,
      });
      continue;
    }

    if (!teachersById.has(teacherId)) {
      brokenClassTeacherLinks.push({
        classId: classRow.$id,
        className: text(classRow.name) || classRow.$id,
        teacherId,
      });
      continue;
    }

    const assigned = classesByTeacherId.get(teacherId) || [];
    assigned.push(classRow);
    classesByTeacherId.set(teacherId, assigned);
  }

  const updates = [];
  const alreadyCorrect = [];
  const unmatchedTeachers = [];
  const ambiguousTeachers = [];

  for (const teacher of teachers) {
    const assigned = classesByTeacherId.get(teacher.$id) || [];
    const name = teacherName(teacher, usersById);

    if (assigned.length === 0) {
      unmatchedTeachers.push({ teacherId: teacher.$id, teacherName: name });
      continue;
    }

    if (assigned.length > 1) {
      ambiguousTeachers.push({
        teacherId: teacher.$id,
        teacherName: name,
        classes: assigned.map((row) => ({
          classId: row.$id,
          className: text(row.name) || row.$id,
        })),
      });
      continue;
    }

    const classRow = assigned[0];
    const className = text(classRow.name) || classRow.$id;
    const expectedScalar = mode === "relationship" ? classRow.$id : className;
    const expectedValue = array ? [expectedScalar] : expectedScalar;

    if (
      mode === "text" &&
      Number.isFinite(column.size) &&
      className.length > column.size
    ) {
      throw new Error(
        `Class name "${className}" exceeds teachers.${column.key} size ${column.size}.`,
      );
    }

    if (
      matches({
        current: teacher[column.key],
        expected: expectedScalar,
        mode,
        array,
      })
    ) {
      alreadyCorrect.push({
        teacherId: teacher.$id,
        teacherName: name,
        classId: classRow.$id,
        className,
      });
      continue;
    }

    updates.push({
      teacherId: teacher.$id,
      teacherName: name,
      classId: classRow.$id,
      className,
      expectedValue,
    });
  }

  console.log(`Column:                 ${column.key}`);
  console.log(`Column type:            ${column.type}`);
  console.log(`Storage mode:           ${mode}${array ? " array" : ""}`);
  console.log(`Teachers:               ${teachers.length}`);
  console.log(`Classes:                ${classes.length}`);
  console.log(`Updates required:       ${updates.length}`);
  console.log(`Already correct:        ${alreadyCorrect.length}`);
  console.log(`Teachers without class: ${unmatchedTeachers.length}`);
  console.log(`Ambiguous teachers:     ${ambiguousTeachers.length}`);
  console.log(`Classes without teacher:${classesWithoutTeacher.length}`);
  console.log(`Broken class links:     ${brokenClassTeacherLinks.length}`);
  console.log("");

  if (updates.length > 0) {
    console.log("Planned links:");

    for (const update of updates) {
      console.log(`  - ${update.teacherName} -> ${update.className}`);
    }

    console.log("");
  }

  const reportBase = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? "execute" : "dry-run",
    column: {
      key: column.key,
      type: column.type,
      storageMode: mode,
      array,
      relatedTableId: relatedTableId || null,
    },
    totals: {
      teachers: teachers.length,
      classes: classes.length,
      updatesRequired: updates.length,
      alreadyCorrect: alreadyCorrect.length,
      unmatchedTeachers: unmatchedTeachers.length,
      ambiguousTeachers: ambiguousTeachers.length,
      classesWithoutTeacher: classesWithoutTeacher.length,
      brokenClassTeacherLinks: brokenClassTeacherLinks.length,
    },
    updates,
    alreadyCorrect,
    unmatchedTeachers,
    ambiguousTeachers,
    classesWithoutTeacher,
    brokenClassTeacherLinks,
  };

  if (!EXECUTE) {
    const reportPath = await saveReport(reportBase, "dry-run");

    console.log("DRY RUN COMPLETE");
    console.log("No Appwrite rows were changed.");
    console.log(`Report: ${reportPath}`);
    console.log("");
    console.log("Run with --execute after reviewing the plan.");
    return;
  }

  let updated = 0;

  for (const update of updates) {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.teachers,
      rowId: update.teacherId,
      data: {
        [column.key]: update.expectedValue,
      },
    });

    updated += 1;
    console.log(`[${updated}/${updates.length}] ${update.teacherName} -> ${update.className}`);
  }

  const refreshed = await listAllRows(tablesDB, TABLES.teachers);
  const refreshedById = new Map(refreshed.map((row) => [row.$id, row]));

  const verificationFailures = updates.filter((update) => {
    const teacher = refreshedById.get(update.teacherId);

    if (!teacher) return true;

    return !matches({
      current: teacher[column.key],
      expected: mode === "relationship" ? update.classId : update.className,
      mode,
      array,
    });
  });

  const report = {
    ...reportBase,
    completedAt: new Date().toISOString(),
    execution: {
      updated,
      verificationFailures: verificationFailures.length,
    },
    verificationFailures,
  };

  const reportPath = await saveReport(report, "execution");

  console.log("");
  console.log("TEACHER-CLASS BACKFILL COMPLETE");
  console.log("===============================");
  console.log(`Updated:               ${updated}`);
  console.log(`Verification failures: ${verificationFailures.length}`);
  console.log(`Teachers unmatched:    ${unmatchedTeachers.length}`);
  console.log(`Report:                 ${reportPath}`);

  if (verificationFailures.length > 0) {
    throw new Error("One or more teacher-class links failed verification.");
  }
}

main().catch((error) => {
  console.error("");
  console.error("TEACHER-CLASS BACKFILL FAILED");
  console.error("=============================");
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  process.exitCode = 1;
});
