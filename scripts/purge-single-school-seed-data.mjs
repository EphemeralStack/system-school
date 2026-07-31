import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import {
  Client,
  Query,
  TablesDB,
} from "node-appwrite";

dotenv.config({
  path: path.resolve(".env.appwrite-seeder"),
  override: false,
});

dotenv.config({
  path: path.resolve(".env.local"),
  override: false,
});

dotenv.config({
  path: path.resolve(".env"),
  override: false,
});

const BACKUP_ROOT =
  path.resolve("appwrite-backups");

const PAGE_SIZE = 100;

const DEFAULT_ENDPOINT =
  "https://syd.cloud.appwrite.io/v1";

const DEFAULT_PROJECT_ID =
  "6a466db90017775cb15a";

const DEFAULT_DATABASE_ID =
  "6a4679b4003a283bf7c5";

const RETAINED_SCHOOL_ID =
  "6a525bba003dd373df45";

const EXPECTED_DELETE_COUNT = 500;
const EXPECTED_KEEP_COUNT = 20;

const DELETE_PRIORITY = new Map([
  ["marks", 10],
  ["attendance", 20],
  ["timetable", 30],
  ["teacher_subjects", 40],
  ["student_subjects", 50],
  ["payments", 60],
  ["fees", 70],
  ["discipline", 80],
  ["hostel_students", 90],
  ["student_transport", 100],
  ["classes", 110],
  ["subjects", 120],
  ["teachers", 130],
  ["students", 140],
  ["applicants", 150],
  ["admins", 160],
  ["users", 170],
  ["departments", 180],
  ["hostels", 190],
  ["transport_routes", 200],
  ["exams", 210],
  ["calendar", 220],
  ["inventory", 230],
  ["announcements", 240],
  ["school", 999],
]);

function firstEnvironmentValue(
  ...names
) {
  for (const name of names) {
    const value =
      process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function requiredEnvironmentValue(
  label,
  ...names
) {
  const value =
    firstEnvironmentValue(
      ...names,
    );

  if (!value) {
    throw new Error(
      `${label} is missing. Add one of: ${names.join(", ")}`,
    );
  }

  return value;
}

function normalizedName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function rowId(row) {
  return String(
    row?.$id ??
      row?.id ??
      "",
  ).trim();
}

function tableId(entry) {
  return String(
    entry?.table?.$id ??
      entry?.table?.id ??
      "",
  ).trim();
}

function tableName(entry) {
  return String(
    entry?.table?.name ??
      entry?.table?.Name ??
      tableId(entry),
  ).trim();
}

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function parseArguments() {
  const args =
    process.argv.slice(2);

  const execute =
    args.includes("--execute");

  const confirmArgument =
    args.find((argument) =>
      argument.startsWith(
        "--confirm=",
      ),
    );

  const backupArgument =
    args.find((argument) =>
      argument.startsWith(
        "--backup=",
      ),
    );

  return {
    execute,
    confirm:
      confirmArgument
        ?.slice(
          "--confirm=".length,
        )
        .trim() ?? "",
    backupDirectory:
      backupArgument
        ? path.resolve(
            backupArgument.slice(
              "--backup=".length,
            ),
          )
        : null,
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteJson(
  filePath,
  value,
) {
  const temporaryPath =
    `${filePath}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(
      value,
      null,
      2,
    )}\n`,
    "utf8",
  );

  await fs.rename(
    temporaryPath,
    filePath,
  );
}

async function latestCompletedBackup() {
  if (!(await exists(BACKUP_ROOT))) {
    throw new Error(
      `Backup root does not exist: ${BACKUP_ROOT}`,
    );
  }

  const entries =
    await fs.readdir(
      BACKUP_ROOT,
      {
        withFileTypes: true,
      },
    );

  const candidates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory =
      path.join(
        BACKUP_ROOT,
        entry.name,
      );

    const snapshotPath =
      path.join(
        directory,
        "complete-backend-snapshot.json",
      );

    const planPath =
      path.join(
        directory,
        "single-school-cleanup-plan",
        "single-school-cleanup-plan.json",
      );

    const incompletePath =
      path.join(
        directory,
        ".INCOMPLETE",
      );

    if (
      await exists(snapshotPath) &&
      await exists(planPath) &&
      !(await exists(incompletePath))
    ) {
      const stats =
        await fs.stat(directory);

      candidates.push({
        directory,
        modifiedAt:
          stats.mtimeMs,
      });
    }
  }

  candidates.sort(
    (left, right) =>
      right.modifiedAt -
      left.modifiedAt,
  );

  if (
    candidates.length === 0
  ) {
    throw new Error(
      "No completed backup with a cleanup plan was found.",
    );
  }

  return candidates[0].directory;
}

async function loadJson(filePath) {
  return JSON.parse(
    await fs.readFile(
      filePath,
      "utf8",
    ),
  );
}

async function hashFile(filePath) {
  const bytes =
    await fs.readFile(filePath);

  return crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");
}

function setEquals(left, right) {
  if (
    left.size !== right.size
  ) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function differences(
  expected,
  actual,
) {
  return {
    missing:
      [...expected].filter(
        (value) =>
          !actual.has(value),
      ),
    unexpected:
      [...actual].filter(
        (value) =>
          !expected.has(value),
      ),
  };
}

async function listAllRows(
  tablesDB,
  databaseId,
  currentTableId,
) {
  const rows = [];
  let offset = 0;
  let total = null;

  while (true) {
    const response =
      await tablesDB.listRows({
        databaseId,
        tableId:
          currentTableId,
        queries: [
          Query.limit(
            PAGE_SIZE,
          ),
          Query.offset(
            offset,
          ),
        ],
        total: true,
        ttl: 0,
      });

    const page =
      asArray(
        response?.rows,
      );

    if (
      total === null &&
      Number.isFinite(
        response?.total,
      )
    ) {
      total = response.total;
    }

    rows.push(...page);

    if (
      page.length <
        PAGE_SIZE ||
      (
        total !== null &&
        rows.length >= total
      )
    ) {
      break;
    }

    offset += page.length;
  }

  if (
    total !== null &&
    rows.length !== total
  ) {
    throw new Error(
      `Incomplete row list for table ${currentTableId}: expected ${total}, received ${rows.length}.`,
    );
  }

  return rows;
}

function buildPlanEntries(plan) {
  const entries = [];

  for (
    const table of asArray(
      plan?.tables,
    )
  ) {
    const currentTableId =
      String(
        table?.tableId ?? "",
      ).trim();

    const currentTableName =
      String(
        table?.tableName ??
          currentTableId,
      ).trim();

    for (
      const deletion of asArray(
        table?.deletions,
      )
    ) {
      const currentRowId =
        String(
          deletion?.rowId ?? "",
        ).trim();

      if (
        !currentTableId ||
        !currentRowId
      ) {
        throw new Error(
          "The cleanup plan contains an incomplete deletion entry.",
        );
      }

      entries.push({
        tableId:
          currentTableId,
        tableName:
          currentTableName,
        rowId:
          currentRowId,
        classification:
          deletion
            ?.classification ??
          "",
        reasons:
          asArray(
            deletion?.reasons,
          ),
      });
    }
  }

  entries.sort(
    (left, right) => {
      const leftPriority =
        DELETE_PRIORITY.get(
          normalizedName(
            left.tableName,
          ),
        ) ?? 500;

      const rightPriority =
        DELETE_PRIORITY.get(
          normalizedName(
            right.tableName,
          ),
        ) ?? 500;

      if (
        leftPriority !==
        rightPriority
      ) {
        return (
          leftPriority -
          rightPriority
        );
      }

      return left.rowId.localeCompare(
        right.rowId,
      );
    },
  );

  return entries;
}

function validatePlan(
  plan,
  entries,
) {
  const deleteCount =
    Number(
      plan?.totals
        ?.deleteRows,
    );

  const keepCount =
    Number(
      plan?.totals
        ?.keepRows,
    );

  const conflictCount =
    Number(
      plan?.totals
        ?.conflicts,
    );

  if (
    plan
      ?.retainedSchoolId !==
    RETAINED_SCHOOL_ID
  ) {
    throw new Error(
      `Unexpected retained school ID: ${plan?.retainedSchoolId}`,
    );
  }

  if (
    deleteCount !==
      EXPECTED_DELETE_COUNT ||
    entries.length !==
      EXPECTED_DELETE_COUNT
  ) {
    throw new Error(
      `Expected exactly ${EXPECTED_DELETE_COUNT} deletions, but the plan contains ${entries.length}.`,
    );
  }

  if (
    keepCount !==
    EXPECTED_KEEP_COUNT
  ) {
    throw new Error(
      `Expected exactly ${EXPECTED_KEEP_COUNT} retained rows, but the plan says ${keepCount}.`,
    );
  }

  if (conflictCount !== 0) {
    throw new Error(
      `The plan has ${conflictCount} reference conflict(s). Purge aborted.`,
    );
  }

  const schoolDeletion =
    entries.find(
      (entry) =>
        entry.rowId ===
        RETAINED_SCHOOL_ID,
    );

  if (schoolDeletion) {
    throw new Error(
      "The retained Bindura Primary School row appears in the deletion plan.",
    );
  }

  const keys = new Set();

  for (const entry of entries) {
    const key =
      `${entry.tableId}:${entry.rowId}`;

    if (keys.has(key)) {
      throw new Error(
        `Duplicate deletion entry: ${key}`,
      );
    }

    keys.add(key);
  }
}

function snapshotTables(snapshot) {
  return asArray(
    snapshot?.tables,
  ).map((entry) => ({
    tableId: tableId(entry),
    tableName:
      tableName(entry),
    rowIds: new Set(
      asArray(
        entry?.rows,
      )
        .map(rowId)
        .filter(Boolean),
    ),
  }));
}

function successKey(entry) {
  return `${entry.tableId}:${entry.rowId}`;
}

async function preflight({
  tablesDB,
  databaseId,
  snapshot,
  state,
}) {
  const succeededKeys =
    new Set(
      asArray(
        state?.succeeded,
      ).map(successKey),
    );

  console.log("");
  console.log(
    "Verifying live database against backup...",
  );

  const tables =
    snapshotTables(snapshot);

  for (
    let index = 0;
    index < tables.length;
    index += 1
  ) {
    const table =
      tables[index];

    const expected =
      new Set(
        [...table.rowIds].filter(
          (currentRowId) =>
            !succeededKeys.has(
              `${table.tableId}:${currentRowId}`,
            ),
        ),
      );

    const liveRows =
      await listAllRows(
        tablesDB,
        databaseId,
        table.tableId,
      );

    const actual =
      new Set(
        liveRows
          .map(rowId)
          .filter(Boolean),
      );

    process.stdout.write(
      `\r  [${index + 1}/${tables.length}] ${table.tableName}: ${actual.size} rows`,
    );

    if (
      !setEquals(
        expected,
        actual,
      )
    ) {
      process.stdout.write(
        "\n",
      );

      const diff =
        differences(
          expected,
          actual,
        );

      throw new Error(
        [
          `Live table "${table.tableName}" no longer matches the backup.`,
          `Missing IDs: ${diff.missing.slice(0, 10).join(", ") || "none"}`,
          `Unexpected IDs: ${diff.unexpected.slice(0, 10).join(", ") || "none"}`,
          "Create a fresh backup and cleanup plan before continuing.",
        ].join("\n"),
      );
    }
  }

  process.stdout.write("\n");

  const schoolTable =
    tables.find(
      (table) =>
        normalizedName(
          table.tableName,
        ) === "school",
    );

  if (
    !schoolTable ||
    !schoolTable.rowIds.has(
      RETAINED_SCHOOL_ID,
    )
  ) {
    throw new Error(
      "The retained Bindura Primary School row was not found in the backup.",
    );
  }

  console.log(
    "Preflight verification passed.",
  );
}

function newExecutionState({
  backupDirectory,
  planHash,
  entries,
}) {
  return {
    format:
      "single-school-seed-purge-state-v1",
    status:
      "ready",
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    backupDirectory,
    planHash,
    retainedSchoolId:
      RETAINED_SCHOOL_ID,
    expectedDeleteCount:
      EXPECTED_DELETE_COUNT,
    expectedKeepCount:
      EXPECTED_KEEP_COUNT,
    totalPlanned:
      entries.length,
    succeeded: [],
    failed: [],
  };
}

async function verifyFinalState({
  tablesDB,
  databaseId,
  snapshot,
  entries,
}) {
  const deleteKeys =
    new Set(
      entries.map(
        successKey,
      ),
    );

  let remainingRows = 0;

  for (
    const table of snapshotTables(
      snapshot,
    )
  ) {
    const liveRows =
      await listAllRows(
        tablesDB,
        databaseId,
        table.tableId,
      );

    const actualIds =
      new Set(
        liveRows
          .map(rowId)
          .filter(Boolean),
      );

    for (
      const currentRowId of
      actualIds
    ) {
      if (
        deleteKeys.has(
          `${table.tableId}:${currentRowId}`,
        )
      ) {
        throw new Error(
          `Deleted row still exists: ${table.tableName}/${currentRowId}`,
        );
      }
    }

    remainingRows +=
      actualIds.size;
  }

  if (
    remainingRows !==
    EXPECTED_KEEP_COUNT
  ) {
    throw new Error(
      `Expected ${EXPECTED_KEEP_COUNT} rows after purge, but found ${remainingRows}.`,
    );
  }

  const schoolEntry =
    snapshotTables(
      snapshot,
    ).find(
      (table) =>
        normalizedName(
          table.tableName,
        ) === "school",
    );

  if (!schoolEntry) {
    throw new Error(
      "School table was not found.",
    );
  }

  const retainedSchool =
    await tablesDB.getRow({
      databaseId,
      tableId:
        schoolEntry.tableId,
      rowId:
        RETAINED_SCHOOL_ID,
    });

  if (
    rowId(
      retainedSchool,
    ) !== RETAINED_SCHOOL_ID
  ) {
    throw new Error(
      "The retained school row could not be verified.",
    );
  }

  return remainingRows;
}

async function main() {
  const args =
    parseArguments();

  const backupDirectory =
    args.backupDirectory ??
    (await latestCompletedBackup());

  const snapshotPath =
    path.join(
      backupDirectory,
      "complete-backend-snapshot.json",
    );

  const planDirectory =
    path.join(
      backupDirectory,
      "single-school-cleanup-plan",
    );

  const planPath =
    path.join(
      planDirectory,
      "single-school-cleanup-plan.json",
    );

  const statePath =
    path.join(
      planDirectory,
      "purge-execution-state.json",
    );

  if (
    !(await exists(
      snapshotPath,
    )) ||
    !(await exists(planPath))
  ) {
    throw new Error(
      `Required backup files are missing from ${backupDirectory}`,
    );
  }

  const [
    snapshot,
    plan,
    planHash,
  ] = await Promise.all([
    loadJson(snapshotPath),
    loadJson(planPath),
    hashFile(planPath),
  ]);

  const entries =
    buildPlanEntries(plan);

  validatePlan(
    plan,
    entries,
  );

  let state =
    await exists(statePath)
      ? await loadJson(statePath)
      : newExecutionState({
          backupDirectory,
          planHash,
          entries,
        });

  if (
    state.planHash !== planHash
  ) {
    throw new Error(
      "The cleanup plan changed after the execution state was created.",
    );
  }

  const endpoint =
    firstEnvironmentValue(
      "APPWRITE_ENDPOINT",
      "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    ) || DEFAULT_ENDPOINT;

  const projectId =
    firstEnvironmentValue(
      "APPWRITE_PROJECT_ID",
      "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    ) || DEFAULT_PROJECT_ID;

  const databaseId =
    firstEnvironmentValue(
      "APPWRITE_DATABASE_ID",
      "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    ) || DEFAULT_DATABASE_ID;

  const apiKey =
    requiredEnvironmentValue(
      "Appwrite API key",
      "APPWRITE_API_KEY",
      "APPWRITE_KEY",
      "APPWRITE_SERVER_API_KEY",
    );

  const client =
    new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

  const tablesDB =
    new TablesDB(client);

  console.log("");
  console.log(
    "SINGLE-SCHOOL SEED PURGE",
  );
  console.log(
    "========================",
  );
  console.log(
    `Backup:       ${backupDirectory}`,
  );
  console.log(
    `Delete rows:  ${entries.length}`,
  );
  console.log(
    `Retain rows:  ${EXPECTED_KEEP_COUNT}`,
  );
  console.log(
    `Retain school:${RETAINED_SCHOOL_ID}`,
  );
  console.log(
    `Mode:         ${args.execute ? "EXECUTE" : "DRY RUN"}`,
  );

  await preflight({
    tablesDB,
    databaseId,
    snapshot,
    state,
  });

  const succeededKeys =
    new Set(
      asArray(
        state.succeeded,
      ).map(successKey),
    );

  const pending =
    entries.filter(
      (entry) =>
        !succeededKeys.has(
          successKey(entry),
        ),
    );

  console.log(
    `Already deleted: ${succeededKeys.size}`,
  );
  console.log(
    `Pending:         ${pending.length}`,
  );

  if (!args.execute) {
    console.log("");
    console.log(
      "DRY RUN COMPLETE",
    );
    console.log(
      "No rows were deleted.",
    );
    console.log("");
    console.log(
      `Execution confirmation: DELETE_${pending.length}_SEEDED_ROWS`,
    );
    return;
  }

  const requiredConfirmation =
    `DELETE_${pending.length}_SEEDED_ROWS`;

  if (
    args.confirm !==
    requiredConfirmation
  ) {
    throw new Error(
      `Execution requires --confirm=${requiredConfirmation}`,
    );
  }

  state.status = "running";
  state.startedAt ??=
    new Date().toISOString();
  state.updatedAt =
    new Date().toISOString();

  await atomicWriteJson(
    statePath,
    state,
  );

  console.log("");
  console.log(
    "Deleting seeded rows...",
  );

  for (
    let index = 0;
    index < pending.length;
    index += 1
  ) {
    const entry =
      pending[index];

    try {
      await tablesDB.deleteRow({
        databaseId,
        tableId:
          entry.tableId,
        rowId:
          entry.rowId,
      });

      state.succeeded.push({
        ...entry,
        deletedAt:
          new Date().toISOString(),
      });

      state.failed =
        asArray(
          state.failed,
        ).filter(
          (failure) =>
            successKey(failure) !==
            successKey(entry),
        );

      state.updatedAt =
        new Date().toISOString();

      await atomicWriteJson(
        statePath,
        state,
      );

      process.stdout.write(
        `\r  ${index + 1}/${pending.length} deleted`,
      );
    } catch (error) {
      process.stdout.write("\n");

      const failure = {
        ...entry,
        failedAt:
          new Date().toISOString(),
        message:
          error instanceof Error
            ? error.message
            : String(error),
      };

      state.failed.push(
        failure,
      );

      state.status =
        "failed";

      state.updatedAt =
        new Date().toISOString();

      await atomicWriteJson(
        statePath,
        state,
      );

      throw new Error(
        [
          `Deletion failed at ${entry.tableName}/${entry.rowId}.`,
          failure.message,
          `Progress was saved to ${statePath}.`,
          "Run the same execute command again to resume safely.",
        ].join("\n"),
      );
    }
  }

  process.stdout.write("\n");

  console.log(
    "Verifying final database state...",
  );

  const remainingRows =
    await verifyFinalState({
      tablesDB,
      databaseId,
      snapshot,
      entries,
    });

  state.status =
    "complete";

  state.completedAt =
    new Date().toISOString();

  state.updatedAt =
    new Date().toISOString();

  state.remainingRows =
    remainingRows;

  await atomicWriteJson(
    statePath,
    state,
  );

  console.log("");
  console.log(
    "SEED PURGE COMPLETE",
  );
  console.log(
    "===================",
  );
  console.log(
    `Deleted:       ${state.succeeded.length}`,
  );
  console.log(
    `Remaining:     ${remainingRows}`,
  );
  console.log(
    `Retained school: ${RETAINED_SCHOOL_ID}`,
  );
  console.log(
    `Execution log: ${statePath}`,
  );
}

await main();
