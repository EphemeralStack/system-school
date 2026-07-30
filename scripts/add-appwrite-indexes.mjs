// scripts/add-appwrite-indexes.mjs
//
// Idempotent Appwrite TablesDB index migration for the School Management Suite.
//
// Safety:
// - Dry-run is ON by default.
// - Creates indexes only; never deletes tables, columns, rows, or indexes.
// - Detects equivalent existing indexes and skips them.
// - Detects conflicting index keys and leaves them untouched.
// - Uses the existing .env.appwrite-inspector file.
// - Never writes the API key into reports.
//
// Required temporary API-key scopes:
//   databases.read
//   tables.read
//   columns.read
//   indexes.read
//   indexes.write

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import * as sdk from "node-appwrite";

const ENV_FILE =
  process.env.APPWRITE_INSPECT_ENV_FILE || ".env.appwrite-inspector";

dotenv.config({ path: ENV_FILE });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const PAGE_SIZE = 100;
const POLL_INTERVAL_MS = 1500;
const INDEX_TIMEOUT_MS = 120000;

const INDEX_TYPE = {
  key: sdk.TablesDBIndexType?.Key ?? "key",
  unique: sdk.TablesDBIndexType?.Unique ?? "unique",
  fulltext: sdk.TablesDBIndexType?.Fulltext ?? "fulltext",
};

const ORDER = {
  asc: sdk.OrderBy?.Asc ?? "ASC",
  desc: sdk.OrderBy?.Desc ?? "DESC",
};

/**
 * Baseline indexes derived from the current Appwrite schema and its
 * foreign-key-like ID columns, lookup fields, status/date filters, and
 * one-to-one or associative-table constraints.
 *
 * This intentionally avoids speculative full-text indexes. Those should
 * be added after auditing the exact Query.search() calls in the frontend.
 */
const INDEX_PLAN = {
  school: [
    key("idx_school_status", ["Status"]),
    key("idx_school_name", ["Name"]),
  ],

  users: [
    unique("uq_users_email", ["Email"]),
    key("idx_users_role", ["Role"]),
    key("idx_users_name", ["LastName", "FirstName"]),
  ],

  admins: [
    unique("uq_admins_user", ["userId"]),
    key("idx_admins_status", ["Status"]),
    key("idx_admins_area", ["AssignedArea"]),
  ],

  applicants: [
    unique("uq_applicants_user", ["userId"]),
    unique("uq_applicants_number", ["ApplicationNo"]),
    key("idx_applicants_status", ["Status"]),
    key("idx_applicants_level_status", [
      "LevelOrFormApplied",
      "Status",
    ]),
  ],

  students: [
    unique("uq_students_user", ["userId"]),
    key("idx_students_school_class", ["schoolId", "classId"]),
    key("idx_students_class_status", ["classId", "Status"]),
    key("idx_students_school_status", ["schoolId", "Status"]),
  ],

  teachers: [
    unique("uq_teachers_user", ["userId"]),
    key("idx_teachers_school_dept", ["schoolId", "departmentId"]),
    key("idx_teachers_school_status", ["schoolId", "Status"]),
    key("idx_teachers_department", ["departmentId"]),
  ],

  departments: [
    unique("uq_departments_school_name", ["schoolId", "Name"]),
    key("idx_departments_school", ["schoolId"]),
    key("idx_departments_head", ["headTeacherId"]),
  ],

  subjects: [
    unique("uq_subjects_school_code", ["schoolId", "SubjectCode"]),
    key("idx_subjects_school_dept", ["schoolId", "departmentId"]),
    key("idx_subjects_department", ["departmentId"]),
    key("idx_subjects_name", ["SubjectName"]),
  ],

  classes: [
    key("idx_classes_teacher", ["teacherId"]),
    key("idx_classes_level", ["LevelOrForm"]),
    key("idx_classes_name", ["name"]),
  ],

  teacher_subjects: [
    unique("uq_teacher_assignment", [
      "schoolId",
      "teacherId",
      "subjectId",
      "classId",
    ]),
    key("idx_tsub_school_teacher", ["schoolId", "teacherId"]),
    key("idx_tsub_school_class", ["schoolId", "classId"]),
    key("idx_tsub_subject", ["subjectId"]),
  ],

  student_subjects: [
    unique("uq_student_enrolment", [
      "schoolId",
      "studentId",
      "subjectId",
    ]),
    key("idx_ssub_school_student", ["schoolId", "studentId"]),
    key("idx_ssub_subject", ["subjectId"]),
  ],

  attendance: [
    unique("uq_attendance_record", ["studentId", "classId", "Date"]),
    key("idx_attendance_class_date", ["classId", "Date"], ["asc", "desc"]),
    key("idx_attendance_student_date", ["studentId", "Date"], ["asc", "desc"]),
    key("idx_attendance_status_date", ["Status", "Date"], ["asc", "desc"]),
  ],

  timetable: [
    key("idx_timetable_class_day", ["classId", "Day"]),
    key("idx_timetable_teacher_day", ["teacherId", "Day"]),
    key("idx_timetable_school_period", ["schoolId", "Year", "Term"]),
    key("idx_timetable_subject", ["subjectId"]),
    key("idx_timetable_day_slot", ["Day", "TimeSlot"]),
  ],

  exams: [
    key("idx_exams_school_period", ["schoolId", "Year", "Term"]),
    key("idx_exams_date", ["ExamDate"], ["desc"]),
    key("idx_exams_school", ["schoolId"]),
  ],

  marks: [
    unique("uq_marks_result", ["examId", "studentId", "subjectId"]),
    key("idx_marks_student_exam", ["studentId", "examId"]),
    key("idx_marks_subject_exam", ["subjectId", "examId"]),
    key("idx_marks_teacher_exam", ["teacherId", "examId"]),
    key("idx_marks_school", ["schoolId"]),
  ],

  fees: [
    key("idx_fees_student_period", ["studentId", "Year", "Term"]),
    key("idx_fees_school_period", ["schoolId", "Year", "Term"]),
    key("idx_fees_student", ["studentId"]),
  ],

  payments: [
    key("idx_payments_fee", ["feeId"]),
    key("idx_payments_status_date", ["Status", "Date"], ["asc", "desc"]),
    key("idx_payments_school_date", ["schoolId", "Date"], ["asc", "desc"]),
    key("idx_payments_date", ["Date"], ["desc"]),
  ],

  discipline: [
    key("idx_discipline_student_date", ["studentId", "Date"], ["asc", "desc"]),
    key("idx_discipline_school_date", ["schoolId", "Date"], ["asc", "desc"]),
    key("idx_discipline_student", ["studentId"]),
  ],

  hostel_students: [
    key("idx_hstud_student", ["studentId"]),
    key("idx_hstud_hostel_room", ["hostelId", "RoomNumber"]),
    key("idx_hstud_school_hostel", ["schoolId", "hostelId"]),
  ],

  hostels: [
    unique("uq_hostels_school_name", ["schoolId", "Name"]),
    key("idx_hostels_supervisor", ["supervisorId"]),
    key("idx_hostels_school_gender", ["schoolId", "Gender"]),
  ],

  student_transport: [
    key("idx_strans_student", ["studentId"]),
    key("idx_strans_school_route", ["schoolId", "routeId"]),
    key("idx_strans_route", ["routeId"]),
  ],

  transport_routes: [
    key("idx_routes_school", ["schoolId"]),
    key("idx_routes_start_end", ["StartPoint", "EndPoint"]),
  ],

  announcements: [
    key("idx_announcements_date", ["Date"], ["desc"]),
    key("idx_announcements_poster", ["postedBy"]),
  ],

  calendar: [
    key("idx_calendar_school_date", ["schoolId", "Date"], ["asc", "desc"]),
    key("idx_calendar_date", ["Date"], ["desc"]),
    key("idx_calendar_poster", ["postedBy"]),
  ],

  inventory: [
    key("idx_inventory_school_name", ["schoolId", "Name"]),
    key("idx_inventory_manager", ["managedBy"]),
    key("idx_inventory_location", ["Location"]),
  ],
};

function key(name, columns, orders = []) {
  return { name, type: "key", columns, orders };
}

function unique(name, columns, orders = []) {
  return { name, type: "unique", columns, orders };
}

function requiredEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(
    `Missing required environment variable. Set one of: ${names.join(", ")}`
  );
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return fallback;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/+$/, "");
}

function normalizeType(type) {
  return String(type ?? "").trim().toLowerCase();
}

function indexColumns(index) {
  const columns = index?.columns ?? index?.attributes ?? [];
  return Array.isArray(columns) ? columns.map(String) : [];
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isEquivalentIndex(existing, desired) {
  return (
    normalizeType(existing.type) === normalizeType(desired.type) &&
    arraysEqual(indexColumns(existing), desired.columns)
  );
}

function resolveOrders(definition) {
  if (!definition.orders?.length) {
    return definition.columns.map(() => ORDER.asc);
  }

  if (definition.orders.length !== definition.columns.length) {
    throw new Error(
      `Index "${definition.name}" has ${definition.columns.length} columns but ` +
        `${definition.orders.length} order values.`
    );
  }

  return definition.orders.map((order) =>
    String(order).toLowerCase() === "desc" ? ORDER.desc : ORDER.asc
  );
}

function looksLikeId(columnKey) {
  return /(^id$|id$)/i.test(columnKey);
}

function lengthForColumn(column) {
  const type = normalizeType(column.type);
  const key = String(column.key ?? "");

  if (!["text", "string", "varchar"].includes(type)) {
    return 0;
  }

  if (looksLikeId(key)) return 36;
  if (/email/i.test(key)) return 254;
  if (/url|address|description|message|remarks|incident|action/i.test(key)) {
    return 191;
  }
  if (/code|number|no$|phone|status|role|day|term|method|gender/i.test(key)) {
    return 64;
  }

  return 128;
}

function buildLengths(definition, columnsByKey) {
  if (definition.type === "fulltext") return [];

  return definition.columns.map((columnKey) => {
    const column = columnsByKey.get(columnKey);
    return column ? lengthForColumn(column) : 0;
  });
}

async function paginate(fetchPage, itemKey) {
  const items = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage([
      sdk.Query.limit(PAGE_SIZE),
      sdk.Query.offset(offset),
    ]);

    const batch = Array.isArray(page?.[itemKey]) ? page[itemKey] : [];
    items.push(...batch);

    const total = Number(page?.total ?? items.length);

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

async function waitForIndex(tablesDB, databaseId, tableId, indexKey) {
  const startedAt = Date.now();
  let lastStatus = "unknown";

  while (Date.now() - startedAt < INDEX_TIMEOUT_MS) {
    try {
      const index = await tablesDB.getIndex({
        databaseId,
        tableId,
        key: indexKey,
      });

      lastStatus = String(index.status ?? "unknown").toLowerCase();

      if (lastStatus === "available") {
        return index;
      }

      if (["failed", "stuck"].includes(lastStatus)) {
        throw new Error(index.error || `Index status is "${lastStatus}".`);
      }
    } catch (error) {
      // A newly queued index can briefly be unavailable. Retry 404s only.
      if (error?.code !== 404) throw error;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for index "${indexKey}". Last status: ${lastStatus}`
  );
}

async function main() {
  const endpoint = normalizeEndpoint(
    requiredEnv("APPWRITE_ENDPOINT", "NEXT_PUBLIC_APPWRITE_ENDPOINT")
  );

  const projectId = requiredEnv(
    "APPWRITE_PROJECT_ID",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID"
  );

  const apiKey = requiredEnv("APPWRITE_API_KEY");

  const databaseId = requiredEnv(
    "APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID"
  );

  const dryRun = parseBoolean(process.env.APPWRITE_INDEX_DRY_RUN, true);
  const onlyTable = process.env.APPWRITE_INDEX_ONLY_TABLE?.trim() || "";

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDB = new sdk.TablesDB(client);

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    databaseId,
    dryRun,
    onlyTable: onlyTable || null,
    created: [],
    skippedEquivalent: [],
    skippedMissingTable: [],
    skippedMissingColumns: [],
    conflicts: [],
    failures: [],
  };

  console.log("");
  console.log("School Management Suite — Appwrite index migration");
  console.log(`Project: ${projectId}`);
  console.log(`Database: ${databaseId}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "APPLY"}`);
  if (onlyTable) console.log(`Only table: ${onlyTable}`);
  console.log("");

  const tables = await paginate(
    (queries) =>
      tablesDB.listTables({
        databaseId,
        queries,
        total: true,
      }),
    "tables"
  );

  const tablesByName = new Map(tables.map((table) => [table.name, table]));

  for (const [tableName, definitions] of Object.entries(INDEX_PLAN)) {
    if (onlyTable && tableName !== onlyTable) continue;

    const table = tablesByName.get(tableName);

    if (!table) {
      console.log(`⚠ ${tableName}: table not found`);
      report.skippedMissingTable.push(tableName);
      continue;
    }

    console.log(`\n[${tableName}]`);

    const columns = await paginate(
      (queries) =>
        tablesDB.listColumns({
          databaseId,
          tableId: table.$id,
          queries,
          total: true,
        }),
      "columns"
    );

    const existingIndexes = await paginate(
      (queries) =>
        tablesDB.listIndexes({
          databaseId,
          tableId: table.$id,
          queries,
          total: true,
        }),
      "indexes"
    );

    const columnsByKey = new Map(
      columns.map((column) => [column.key, column])
    );

    for (const definition of definitions) {
      const missingColumns = definition.columns.filter(
        (columnKey) => !columnsByKey.has(columnKey)
      );

      if (missingColumns.length > 0) {
        console.log(
          `  ⚠ ${definition.name}: missing column(s): ${missingColumns.join(", ")}`
        );
        report.skippedMissingColumns.push({
          table: tableName,
          index: definition.name,
          missingColumns,
        });
        continue;
      }

      const sameKey = existingIndexes.find(
        (index) => index.key === definition.name
      );

      if (sameKey) {
        if (isEquivalentIndex(sameKey, definition)) {
          console.log(`  ↷ ${definition.name}: already exists`);
          report.skippedEquivalent.push({
            table: tableName,
            index: definition.name,
            reason: "same key and definition",
          });
        } else {
          console.log(
            `  ⚠ ${definition.name}: key exists with a different definition`
          );
          report.conflicts.push({
            table: tableName,
            desired: definition,
            existing: {
              key: sameKey.key,
              type: sameKey.type,
              columns: indexColumns(sameKey),
              status: sameKey.status,
            },
          });
        }
        continue;
      }

      const equivalent = existingIndexes.find((index) =>
        isEquivalentIndex(index, definition)
      );

      if (equivalent) {
        console.log(
          `  ↷ ${definition.name}: equivalent index "${equivalent.key}" exists`
        );
        report.skippedEquivalent.push({
          table: tableName,
          index: definition.name,
          equivalentIndex: equivalent.key,
          reason: "equivalent definition",
        });
        continue;
      }

      if (dryRun) {
        console.log(
          `  + ${definition.name} [${definition.type}] (${definition.columns.join(", ")})`
        );
        report.created.push({
          table: tableName,
          index: definition.name,
          type: definition.type,
          columns: definition.columns,
          dryRun: true,
        });
        continue;
      }

      try {
        const orders = resolveOrders(definition);
        const lengths = buildLengths(definition, columnsByKey);

        console.log(
          `  … creating ${definition.name} [${definition.type}] (${definition.columns.join(", ")})`
        );

        await tablesDB.createIndex({
          databaseId,
          tableId: table.$id,
          key: definition.name,
          type: INDEX_TYPE[definition.type],
          columns: definition.columns,
          orders,
          lengths,
        });

        await waitForIndex(
          tablesDB,
          databaseId,
          table.$id,
          definition.name
        );

        console.log(`  ✓ ${definition.name}`);
        report.created.push({
          table: tableName,
          index: definition.name,
          type: definition.type,
          columns: definition.columns,
          dryRun: false,
        });

        // Keep the in-memory list current for later duplicate checks.
        existingIndexes.push({
          key: definition.name,
          type: definition.type,
          columns: definition.columns,
          status: "available",
        });
      } catch (error) {
        const failure = {
          table: tableName,
          index: definition.name,
          type: definition.type,
          columns: definition.columns,
          message:
            error instanceof Error ? error.message : String(error),
          code: error?.code ?? null,
          appwriteType: error?.type ?? null,
        };

        console.log(`  ✗ ${definition.name}: ${failure.message}`);
        report.failures.push(failure);
      }
    }
  }

  const outputDirectory = path.resolve(
    process.env.APPWRITE_OUTPUT_DIR?.trim() || "appwrite-inspection"
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  const reportPath = path.join(
    outputDirectory,
    "appwrite-index-migration-report.json"
  );

  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  console.log("");
  console.log("Migration pass complete.");
  console.log(`Created/planned: ${report.created.length}`);
  console.log(`Equivalent indexes skipped: ${report.skippedEquivalent.length}`);
  console.log(`Conflicts: ${report.conflicts.length}`);
  console.log(`Failures: ${report.failures.length}`);
  console.log(`Report: ${reportPath}`);
  console.log("");

  if (dryRun) {
    console.log(
      "No backend changes were made. Set APPWRITE_INDEX_DRY_RUN=false to apply."
    );
  } else if (report.failures.length > 0 || report.conflicts.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("");
  console.error("Index migration failed.");
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error(
    "Check the endpoint, project/database IDs, API key, and TablesDB index scopes."
  );
  process.exitCode = 1;
});
