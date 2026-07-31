import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import {
  Client,
  Query,
  TablesDB,
  Users,
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

const PAGE_SIZE = 100;

const DEFAULT_ENDPOINT =
  "https://syd.cloud.appwrite.io/v1";

const DEFAULT_PROJECT_ID =
  "6a466db90017775cb15a";

const DEFAULT_DATABASE_ID =
  "6a4679b4003a283bf7c5";

const REFERENCES = [
  ["admins", "userId", "users"],
  ["applicants", "userId", "users"],
  ["students", "userId", "users"],
  ["students", "classId", "classes"],
  ["teachers", "userId", "users"],
  ["teachers", "departmentId", "departments"],
  ["departments", "headTeacherId", "teachers"],
  ["subjects", "departmentId", "departments"],
  ["classes", "teacherId", "teachers"],
  ["teacher_subjects", "teacherId", "teachers"],
  ["teacher_subjects", "subjectId", "subjects"],
  ["teacher_subjects", "classId", "classes"],
  ["student_subjects", "studentId", "students"],
  ["student_subjects", "subjectId", "subjects"],
  ["attendance", "studentId", "students"],
  ["attendance", "classId", "classes"],
  ["timetable", "classId", "classes"],
  ["timetable", "subjectId", "subjects"],
  ["timetable", "teacherId", "teachers"],
  ["marks", "studentId", "students"],
  ["marks", "subjectId", "subjects"],
  ["marks", "teacherId", "teachers"],
  ["marks", "examId", "exams"],
  ["fees", "studentId", "students"],
  ["payments", "feeId", "fees"],
  ["discipline", "studentId", "students"],
  ["hostel_students", "studentId", "students"],
  ["hostel_students", "hostelId", "hostels"],
  ["hostels", "supervisorId", "teachers"],
  ["student_transport", "studentId", "students"],
  ["student_transport", "routeId", "transport_routes"],
];

function firstEnvironmentValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function requiredEnvironmentValue(label, ...names) {
  const value = firstEnvironmentValue(...names);

  if (!value) {
    throw new Error(
      `${label} is missing. Add one of: ${names.join(", ")}`,
    );
  }

  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function resourceId(resource) {
  return String(
    resource?.$id ??
      resource?.id ??
      "",
  ).trim();
}

function tableName(table) {
  return String(
    table?.name ??
      table?.Name ??
      resourceId(table),
  ).trim();
}

function jsonReplacer(_key, value) {
  return typeof value === "bigint"
    ? value.toString()
    : value;
}

function jsonText(value) {
  return `${JSON.stringify(
    value,
    jsonReplacer,
    2,
  )}\n`;
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function isTransient(error) {
  const code = String(
    error?.cause?.code ??
      error?.code ??
      "",
  );

  const status = Number(
    error?.code ??
      error?.status ??
      0,
  );

  const message = String(
    error instanceof Error
      ? error.message
      : error,
  ).toLowerCase();

  return (
    [
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "ECONNRESET",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ENETUNREACH",
    ].includes(code) ||
    message.includes("fetch failed") ||
    message.includes("connect timeout") ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

async function retry(label, operation) {
  const attempts = 8;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isTransient(error) ||
        attempt === attempts
      ) {
        throw error;
      }

      const delay = Math.min(
        2000 * 2 ** (attempt - 1),
        20000,
      );

      console.warn(
        `${label} temporarily failed. Retrying in ${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw new Error(
    `${label} failed after retries.`,
  );
}

async function listAll({
  responseKey,
  fetchPage,
}) {
  const items = [];
  let offset = 0;
  let total = null;

  while (true) {
    const response = await retry(
      `Reading ${responseKey} at offset ${offset}`,
      () =>
        fetchPage([
          Query.limit(PAGE_SIZE),
          Query.offset(offset),
        ]),
    );

    const page = asArray(
      response?.[responseKey],
    );

    if (
      total === null &&
      Number.isFinite(response?.total)
    ) {
      total = response.total;
    }

    items.push(...page);

    if (
      page.length < PAGE_SIZE ||
      (total !== null &&
        items.length >= total)
    ) {
      break;
    }

    offset += page.length;
  }

  if (
    total !== null &&
    items.length !== total
  ) {
    throw new Error(
      `Incomplete ${responseKey} list: expected ${total}, received ${items.length}.`,
    );
  }

  return items;
}

async function loadDatabase({
  tablesDB,
  databaseId,
}) {
  const tables = await listAll({
    responseKey: "tables",
    fetchPage: (queries) =>
      tablesDB.listTables({
        databaseId,
        queries,
        total: true,
      }),
  });

  const catalog = new Map();

  for (
    let index = 0;
    index < tables.length;
    index += 1
  ) {
    const table = tables[index];
    const id = resourceId(table);
    const name = tableName(table);

    const [columns, indexes, rows] =
      await Promise.all([
        listAll({
          responseKey: "columns",
          fetchPage: (queries) =>
            tablesDB.listColumns({
              databaseId,
              tableId: id,
              queries,
              total: true,
            }),
        }),
        listAll({
          responseKey: "indexes",
          fetchPage: (queries) =>
            tablesDB.listIndexes({
              databaseId,
              tableId: id,
              queries,
              total: true,
            }),
        }),
        listAll({
          responseKey: "rows",
          fetchPage: (queries) =>
            tablesDB.listRows({
              databaseId,
              tableId: id,
              queries,
              total: true,
              ttl: 0,
            }),
        }),
      ]);

    catalog.set(normalize(name), {
      table,
      id,
      name,
      columns,
      indexes,
      rows,
    });

    process.stdout.write(
      `\r  [${index + 1}/${tables.length}] ${name}: ${rows.length} rows`,
    );
  }

  process.stdout.write("\n");

  return catalog;
}

function valueFor(row, field) {
  if (
    Object.prototype.hasOwnProperty.call(
      row,
      field,
    )
  ) {
    return row[field];
  }

  const wanted = normalize(field);

  for (
    const [key, value] of
    Object.entries(row)
  ) {
    if (normalize(key) === wanted) {
      return value;
    }
  }

  return undefined;
}

function referenceAudit(catalog) {
  const checks = [];
  const orphans = [];

  for (
    const [
      sourceName,
      field,
      targetName,
    ] of REFERENCES
  ) {
    const source =
      catalog.get(normalize(sourceName));

    const target =
      catalog.get(normalize(targetName));

    if (!source || !target) {
      checks.push({
        sourceTable: sourceName,
        field,
        targetTable: targetName,
        status: "table-missing",
        populated: 0,
        orphanCount: 0,
      });

      continue;
    }

    const targetIds = new Set(
      target.rows
        .map(resourceId)
        .filter(Boolean),
    );

    let populated = 0;
    const checkOrphans = [];

    for (const row of source.rows) {
      const value = valueFor(
        row,
        field,
      );

      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        continue;
      }

      populated += 1;

      const referenceId =
        String(value).trim();

      if (!targetIds.has(referenceId)) {
        const orphan = {
          sourceTable: source.name,
          sourceTableId: source.id,
          sourceRowId: resourceId(row),
          field,
          referenceId,
          targetTable: target.name,
          targetTableId: target.id,
          sourceRow: row,
        };

        checkOrphans.push(orphan);
        orphans.push(orphan);
      }
    }

    checks.push({
      sourceTable: source.name,
      field,
      targetTable: target.name,
      status:
        checkOrphans.length > 0
          ? "orphans-found"
          : "valid",
      populated,
      orphanCount:
        checkOrphans.length,
    });
  }

  return {
    checks,
    orphans,
  };
}

async function loadAuthUsers(users) {
  try {
    const authUsers = await listAll({
      responseKey: "users",
      fetchPage: (queries) =>
        users.list({
          queries,
          total: true,
        }),
    });

    return {
      available: true,
      error: null,
      users: authUsers,
    };
  } catch (error) {
    const status = Number(
      error?.code ??
        error?.status ??
        0,
    );

    if (status === 401 || status === 403) {
      return {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
        users: [],
      };
    }

    throw error;
  }
}

function authAudit(
  catalog,
  authResult,
) {
  const profiles =
    catalog.get("users")?.rows ?? [];

  if (!authResult.available) {
    return {
      available: false,
      error: authResult.error,
      authUserCount: null,
      profileCount: profiles.length,
      authWithoutProfile: [],
      profilesWithoutAuth: [],
      emailMismatches: [],
      roleLinksToAuthWithoutProfile: [],
    };
  }

  const authUsers = authResult.users;

  const authById = new Map(
    authUsers.map((user) => [
      resourceId(user),
      user,
    ]),
  );

  const profileById = new Map(
    profiles.map((profile) => [
      resourceId(profile),
      profile,
    ]),
  );

  const authWithoutProfile =
    authUsers.filter(
      (user) =>
        !profileById.has(
          resourceId(user),
        ),
    );

  const profilesWithoutAuth =
    profiles.filter(
      (profile) =>
        !authById.has(
          resourceId(profile),
        ),
    );

  const emailMismatches = [];

  for (const profile of profiles) {
    const authUser =
      authById.get(
        resourceId(profile),
      );

    if (!authUser) {
      continue;
    }

    const profileEmail = normalize(
      valueFor(profile, "Email"),
    );

    const authEmail = normalize(
      authUser?.email,
    );

    if (
      profileEmail &&
      authEmail &&
      profileEmail !== authEmail
    ) {
      emailMismatches.push({
        userId: resourceId(profile),
        profileEmail,
        authEmail,
      });
    }
  }

  const roleLinksToAuthWithoutProfile = [];

  for (const roleTableName of [
    "admins",
    "teachers",
    "students",
    "applicants",
  ]) {
    const roleTable =
      catalog.get(roleTableName);

    if (!roleTable) {
      continue;
    }

    for (const row of roleTable.rows) {
      const userId = String(
        valueFor(row, "userId") ??
          "",
      ).trim();

      if (
        userId &&
        authById.has(userId) &&
        !profileById.has(userId)
      ) {
        roleLinksToAuthWithoutProfile.push({
          roleTable:
            roleTable.name,
          roleRowId:
            resourceId(row),
          userId,
          authUser:
            authById.get(userId),
          roleRow: row,
        });
      }
    }
  }

  return {
    available: true,
    error: null,
    authUserCount: authUsers.length,
    profileCount: profiles.length,
    authWithoutProfile,
    profilesWithoutAuth,
    emailMismatches,
    roleLinksToAuthWithoutProfile,
  };
}

function tableSummaries(catalog) {
  return [...catalog.values()]
    .map((entry) => ({
      tableId: entry.id,
      tableName: entry.name,
      rowCount: entry.rows.length,
      columnCount:
        entry.columns.length,
      indexCount:
        entry.indexes.length,
    }))
    .sort((left, right) =>
      left.tableName.localeCompare(
        right.tableName,
      ),
    );
}

function markdown(report) {
  const lines = [
    "# Single-School Data Integrity Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Tables: ${report.summary.tables}`,
    `- Database rows: ${report.summary.databaseRows}`,
    `- Broken references: ${report.summary.brokenReferences}`,
    `- Auth inspection available: ${report.summary.authAvailable ? "yes" : "no"}`,
    `- Auth users without profiles: ${report.summary.authWithoutProfile ?? "not inspected"}`,
    `- Profiles without Auth users: ${report.summary.profilesWithoutAuth ?? "not inspected"}`,
    `- Email mismatches: ${report.summary.emailMismatches ?? "not inspected"}`,
    "",
    "## Broken references",
    "",
  ];

  if (
    report.references.orphans.length === 0
  ) {
    lines.push(
      "No broken database references were found.",
    );
  } else {
    for (
      const orphan of
      report.references.orphans
    ) {
      lines.push(
        `- ${orphan.sourceTable}/${orphan.sourceRowId}.${orphan.field} -> ${orphan.targetTable}/${orphan.referenceId}`,
      );
    }
  }

  lines.push(
    "",
    "## Authentication alignment",
    "",
  );

  if (!report.auth.available) {
    lines.push(
      `Auth users were not inspected: ${report.auth.error}`,
    );
  } else {
    lines.push(
      `- Auth users: ${report.auth.authUserCount}`,
      `- Database profiles: ${report.auth.profileCount}`,
      `- Auth users without profiles: ${report.auth.authWithoutProfile.length}`,
      `- Profiles without Auth users: ${report.auth.profilesWithoutAuth.length}`,
      `- Email mismatches: ${report.auth.emailMismatches.length}`,
      `- Role rows linked to Auth users without profiles: ${report.auth.roleLinksToAuthWithoutProfile.length}`,
    );
  }

  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
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

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDB =
    new TablesDB(client);

  const users =
    new Users(client);

  console.log("");
  console.log(
    "SINGLE-SCHOOL DATA INTEGRITY AUDIT",
  );
  console.log(
    "==================================",
  );

  const catalog =
    await loadDatabase({
      tablesDB,
      databaseId,
    });

  const references =
    referenceAudit(catalog);

  console.log(
    "Reading Appwrite Auth users...",
  );

  const authResult =
    await loadAuthUsers(users);

  const auth =
    authAudit(
      catalog,
      authResult,
    );

  const tables =
    tableSummaries(catalog);

  const databaseRows =
    tables.reduce(
      (sum, table) =>
        sum + table.rowCount,
      0,
    );

  const report = {
    generatedAt:
      new Date().toISOString(),
    endpoint,
    projectId,
    databaseId,
    summary: {
      tables: tables.length,
      databaseRows,
      brokenReferences:
        references.orphans.length,
      authAvailable:
        auth.available,
      authWithoutProfile:
        auth.available
          ? auth.authWithoutProfile.length
          : null,
      profilesWithoutAuth:
        auth.available
          ? auth.profilesWithoutAuth.length
          : null,
      emailMismatches:
        auth.available
          ? auth.emailMismatches.length
          : null,
    },
    tables,
    references,
    auth,
  };

  const outputDirectory =
    path.resolve(
      "appwrite-integrity-audits",
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-"),
    );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  await Promise.all([
    fs.writeFile(
      path.join(
        outputDirectory,
        "single-school-data-integrity-audit.json",
      ),
      jsonText(report),
      "utf8",
    ),
    fs.writeFile(
      path.join(
        outputDirectory,
        "single-school-data-integrity-audit.md",
      ),
      markdown(report),
      "utf8",
    ),
  ]);

  console.log("");
  console.log(
    "DATA INTEGRITY AUDIT COMPLETE",
  );
  console.log(
    "=============================",
  );
  console.log(
    `Tables:                         ${tables.length}`,
  );
  console.log(
    `Database rows:                  ${databaseRows}`,
  );
  console.log(
    `Broken references:              ${references.orphans.length}`,
  );
  console.log(
    `Auth inspection available:      ${auth.available ? "yes" : "no"}`,
  );
  console.log(
    `Auth users without profiles:    ${auth.available ? auth.authWithoutProfile.length : "not inspected"}`,
  );
  console.log(
    `Profiles without Auth users:    ${auth.available ? auth.profilesWithoutAuth.length : "not inspected"}`,
  );
  console.log(
    `Email mismatches:                ${auth.available ? auth.emailMismatches.length : "not inspected"}`,
  );
  console.log(
    `Role links missing DB profiles: ${auth.available ? auth.roleLinksToAuthWithoutProfile.length : "not inspected"}`,
  );
  console.log(
    `Report folder:                  ${outputDirectory}`,
  );
}

await main();
