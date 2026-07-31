import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BACKUP_ROOT = path.resolve("appwrite-backups");

const SCHOOL_COLUMN_KEYS = new Set([
  "schoolid",
  "school_id",
  "school",
]);

const KNOWN_REFERENCE_TARGETS = {
  userid: ["users"],
  adminid: ["admins"],
  applicantid: ["applicants"],
  studentid: ["students"],
  teacherid: ["teachers"],
  departmentid: ["departments"],
  subjectid: ["subjects"],
  classid: ["classes"],
  examid: ["exams"],
  feeid: ["fees"],
  paymentid: ["payments"],
  timetableid: ["timetable", "timetables"],
  announcementid: ["announcements"],
  hostelid: ["hostels"],
  routeid: ["transport_routes", "routes"],
  transportrouteid: ["transport_routes"],
  inventoryid: ["inventory"],
};

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceId(resource, fallback = "") {
  return (
    resource?.$id ??
    resource?.id ??
    resource?.key ??
    fallback
  );
}

function resourceName(resource, fallback = "") {
  return (
    resource?.name ??
    resource?.Name ??
    resource?.key ??
    fallback
  );
}

function columnKey(column) {
  return String(
    column?.key ??
      column?.name ??
      column?.column ??
      column?.$id ??
      "",
  );
}

function indexAttributes(index) {
  const candidates = [
    index?.attributes,
    index?.columns,
    index?.keys,
    index?.fields,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(String);
    }
  }

  return [];
}

function rowValue(row, key) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const normalizedWanted = normalizeKey(key);

  for (const [candidateKey, value] of Object.entries(row)) {
    if (normalizeKey(candidateKey) === normalizedWanted) {
      return value;
    }
  }

  return undefined;
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function latestCompletedBackup() {
  if (!(await exists(BACKUP_ROOT))) {
    throw new Error(
      `Backup root not found: ${BACKUP_ROOT}`,
    );
  }

  const entries = await fs.readdir(
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

    const directory = path.join(
      BACKUP_ROOT,
      entry.name,
    );

    const snapshotPath = path.join(
      directory,
      "complete-backend-snapshot.json",
    );

    const incompletePath = path.join(
      directory,
      ".INCOMPLETE",
    );

    if (
      (await exists(snapshotPath)) &&
      !(await exists(incompletePath))
    ) {
      const stats = await fs.stat(directory);

      candidates.push({
        directory,
        modifiedAt: stats.mtimeMs,
      });
    }
  }

  candidates.sort(
    (left, right) =>
      right.modifiedAt - left.modifiedAt,
  );

  if (candidates.length === 0) {
    throw new Error(
      "No completed Appwrite backup was found.",
    );
  }

  return candidates[0].directory;
}

async function loadSnapshot(backupDirectory) {
  const snapshotPath = path.join(
    backupDirectory,
    "complete-backend-snapshot.json",
  );

  const raw = await fs.readFile(
    snapshotPath,
    "utf8",
  );

  return JSON.parse(raw);
}

function buildTableMap(snapshot) {
  const map = new Map();

  for (const entry of asArray(snapshot?.tables)) {
    const table = entry?.table ?? {};
    const id = resourceId(table);
    const name = resourceName(table, id);

    const normalizedName = normalizeKey(name);

    map.set(normalizedName, {
      id,
      name,
      table,
      columns: asArray(entry?.columns),
      indexes: asArray(entry?.indexes),
      rows: asArray(entry?.rows),
    });

    if (id) {
      map.set(normalizeKey(id), {
        id,
        name,
        table,
        columns: asArray(entry?.columns),
        indexes: asArray(entry?.indexes),
        rows: asArray(entry?.rows),
      });
    }
  }

  return map;
}

function uniqueTables(tableMap) {
  const seen = new Set();
  const result = [];

  for (const table of tableMap.values()) {
    const key = table.id || table.name;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(table);
  }

  return result;
}

function findSchoolColumns(tables) {
  const findings = [];

  for (const table of tables) {
    for (const column of table.columns) {
      const key = columnKey(column);
      const normalized = normalizeKey(key);

      if (SCHOOL_COLUMN_KEYS.has(normalized)) {
        findings.push({
          tableId: table.id,
          tableName: table.name,
          columnId: resourceId(column),
          columnKey: key,
          columnType:
            column?.type ??
            column?.format ??
            column?.dataType ??
            "",
          required:
            column?.required ??
            false,
          default:
            column?.default ??
            null,
        });
      }
    }
  }

  return findings;
}

function findSchoolIndexes(tables) {
  const findings = [];

  for (const table of tables) {
    for (const index of table.indexes) {
      const attributes = indexAttributes(index);
      const containsSchool =
        attributes.some((attribute) =>
          SCHOOL_COLUMN_KEYS.has(
            normalizeKey(attribute),
          ),
        );

      if (containsSchool) {
        findings.push({
          tableId: table.id,
          tableName: table.name,
          indexId: resourceId(index),
          indexName: resourceName(
            index,
            resourceId(index),
          ),
          type:
            index?.type ?? "",
          attributes,
          orders:
            asArray(index?.orders),
        });
      }
    }
  }

  return findings;
}

function findSchoolTables(tables) {
  return tables.filter((table) => {
    const name = normalizeKey(table.name);

    return (
      name === "school" ||
      name === "schools" ||
      name === "schoolsettings" ||
      name === "school_settings"
    );
  });
}

function analyzeSchoolValues(
  tables,
  schoolColumns,
) {
  const columnByTable = new Map();

  for (const finding of schoolColumns) {
    const list =
      columnByTable.get(finding.tableId) ?? [];

    list.push(finding.columnKey);
    columnByTable.set(
      finding.tableId,
      list,
    );
  }

  const findings = [];

  for (const table of tables) {
    const keys =
      columnByTable.get(table.id) ?? [];

    if (keys.length === 0) {
      continue;
    }

    for (const key of keys) {
      const counts = new Map();

      for (const row of table.rows) {
        const value = rowValue(row, key);
        const normalizedValue =
          value === undefined ||
          value === null ||
          String(value).trim() === ""
            ? "(empty)"
            : String(value);

        counts.set(
          normalizedValue,
          (counts.get(normalizedValue) ?? 0) + 1,
        );
      }

      findings.push({
        tableId: table.id,
        tableName: table.name,
        columnKey: key,
        values: [...counts.entries()]
          .map(([value, count]) => ({
            value,
            count,
          }))
          .sort(
            (left, right) =>
              right.count - left.count,
          ),
      });
    }
  }

  return findings;
}

function inferReferenceTarget(
  columnKeyValue,
  tableMap,
) {
  const normalized =
    normalizeKey(columnKeyValue);

  const candidates =
    KNOWN_REFERENCE_TARGETS[normalized] ??
    [];

  for (const candidate of candidates) {
    const table =
      tableMap.get(
        normalizeKey(candidate),
      );

    if (table) {
      return table;
    }
  }

  return null;
}

function analyzeReferences(
  tables,
  tableMap,
) {
  const findings = [];

  for (const sourceTable of tables) {
    for (const column of sourceTable.columns) {
      const key = columnKey(column);
      const normalized = normalizeKey(key);

      if (
        !normalized.endsWith("id") ||
        normalized === "schoolid" ||
        normalized === "id"
      ) {
        continue;
      }

      const targetTable =
        inferReferenceTarget(
          key,
          tableMap,
        );

      if (!targetTable) {
        findings.push({
          sourceTableId: sourceTable.id,
          sourceTableName:
            sourceTable.name,
          columnKey: key,
          targetTableId: null,
          targetTableName: null,
          status: "unresolved-target",
          populatedValues:
            sourceTable.rows.filter(
              (row) => {
                const value =
                  rowValue(row, key);

                return (
                  value !== undefined &&
                  value !== null &&
                  String(value).trim() !== ""
                );
              },
            ).length,
          orphanCount: null,
          orphanSamples: [],
        });

        continue;
      }

      const targetIds = new Set(
        targetTable.rows
          .map((row) =>
            String(
              resourceId(row),
            ).trim(),
          )
          .filter(Boolean),
      );

      const orphanValues = [];

      for (const row of sourceTable.rows) {
        const value = rowValue(
          row,
          key,
        );

        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          continue;
        }

        const normalizedValue =
          String(value).trim();

        if (
          !targetIds.has(
            normalizedValue,
          )
        ) {
          orphanValues.push({
            sourceRowId:
              resourceId(row),
            value:
              normalizedValue,
          });
        }
      }

      findings.push({
        sourceTableId:
          sourceTable.id,
        sourceTableName:
          sourceTable.name,
        columnKey: key,
        targetTableId:
          targetTable.id,
        targetTableName:
          targetTable.name,
        status:
          orphanValues.length > 0
            ? "orphans-found"
            : "valid",
        populatedValues:
          sourceTable.rows.filter(
            (row) => {
              const value =
                rowValue(row, key);

              return (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
              );
            },
          ).length,
        orphanCount:
          orphanValues.length,
        orphanSamples:
          orphanValues.slice(0, 20),
      });
    }
  }

  return findings;
}

function duplicateGroups(
  rows,
  keys,
) {
  const groups = new Map();

  for (const row of rows) {
    const values = keys.map(
      (key) => {
        const value =
          rowValue(row, key);

        return value === undefined ||
          value === null
          ? ""
          : String(value).trim();
      },
    );

    if (
      values.some(
        (value) => value === "",
      )
    ) {
      continue;
    }

    const groupKey =
      JSON.stringify(values);

    const existing =
      groups.get(groupKey) ?? [];

    existing.push(
      resourceId(row),
    );

    groups.set(
      groupKey,
      existing,
    );
  }

  return [...groups.entries()]
    .filter(
      ([, ids]) =>
        ids.length > 1,
    )
    .map(([value, rowIds]) => ({
      values:
        JSON.parse(value),
      rowIds,
      count:
        rowIds.length,
    }));
}

function findDuplicateCandidates(
  tables,
) {
  const plans = [
    {
      table: "users",
      keys: ["Email"],
    },
    {
      table: "applicants",
      keys: ["ApplicationNo"],
    },
    {
      table: "subjects",
      keys: ["SubjectCode"],
    },
    {
      table: "teacher_subjects",
      keys: [
        "teacherId",
        "subjectId",
        "classId",
      ],
    },
    {
      table: "student_subjects",
      keys: [
        "studentId",
        "subjectId",
      ],
    },
    {
      table: "payments",
      keys: ["Reference"],
    },
  ];

  const tablesByName = new Map(
    tables.map((table) => [
      normalizeKey(table.name),
      table,
    ]),
  );

  return plans
    .map((plan) => {
      const table =
        tablesByName.get(
          normalizeKey(plan.table),
        );

      if (!table) {
        return {
          tableName: plan.table,
          keys: plan.keys,
          tableFound: false,
          duplicateGroups: [],
        };
      }

      return {
        tableId: table.id,
        tableName: table.name,
        keys: plan.keys,
        tableFound: true,
        duplicateGroups:
          duplicateGroups(
            table.rows,
            plan.keys,
          ),
      };
    });
}

function markdownReport(report) {
  const lines = [];

  lines.push(
    "# Single-School Backend Migration Audit",
    "",
    `Backup: \`${report.backupDirectory}\``,
    "",
    "## Snapshot",
    "",
    `- Tables: ${report.snapshotTotals.tables}`,
    `- Columns: ${report.snapshotTotals.columns}`,
    `- Indexes: ${report.snapshotTotals.indexes}`,
    `- Rows: ${report.snapshotTotals.rows}`,
    "",
    "## schoolId columns",
    "",
  );

  if (
    report.schoolColumns.length === 0
  ) {
    lines.push(
      "No schoolId columns were found.",
    );
  } else {
    for (
      const item of report.schoolColumns
    ) {
      lines.push(
        `- ${item.tableName}.${item.columnKey} (${item.columnType || "unknown type"})`,
      );
    }
  }

  lines.push(
    "",
    "## Indexes involving schoolId",
    "",
  );

  if (
    report.schoolIndexes.length === 0
  ) {
    lines.push(
      "No schoolId indexes were found.",
    );
  } else {
    for (
      const item of report.schoolIndexes
    ) {
      lines.push(
        `- ${item.tableName}.${item.indexName}: ${item.attributes.join(", ")}`,
      );
    }
  }

  lines.push(
    "",
    "## School configuration tables",
    "",
  );

  if (
    report.schoolTables.length === 0
  ) {
    lines.push(
      "No school configuration table was found.",
    );
  } else {
    for (
      const table of report.schoolTables
    ) {
      lines.push(
        `- ${table.tableName}: ${table.rowCount} rows`,
      );
    }
  }

  lines.push(
    "",
    "## Reference integrity",
    "",
    `- Valid references checked: ${report.referenceSummary.valid}`,
    `- References with orphans: ${report.referenceSummary.orphansFound}`,
    `- Unresolved reference targets: ${report.referenceSummary.unresolvedTargets}`,
    `- Total orphan values: ${report.referenceSummary.totalOrphans}`,
    "",
    "## Duplicate candidates",
    "",
    `- Duplicate groups found: ${report.duplicateSummary.totalGroups}`,
    "",
    "## Next migration sequence",
    "",
    "1. Decide which single school row becomes the retained system configuration.",
    "2. Remove indexes that include schoolId.",
    "3. Remove schoolId columns from all affected tables.",
    "4. Reduce the school table to one configuration row or replace it with school_settings.",
    "5. Repair orphaned references and duplicates reported by this audit.",
    "6. Rebuild required unique and query indexes.",
    "7. Harden permissions and enable row security.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const explicitBackup =
    process.argv[2]
      ? path.resolve(process.argv[2])
      : null;

  const backupDirectory =
    explicitBackup ??
    (await latestCompletedBackup());

  const incompleteMarker =
    path.join(
      backupDirectory,
      ".INCOMPLETE",
    );

  if (
    await exists(incompleteMarker)
  ) {
    throw new Error(
      `The selected backup is incomplete: ${backupDirectory}`,
    );
  }

  const snapshot =
    await loadSnapshot(
      backupDirectory,
    );

  const tableMap =
    buildTableMap(snapshot);

  const tables =
    uniqueTables(tableMap);

  const schoolColumns =
    findSchoolColumns(tables);

  const schoolIndexes =
    findSchoolIndexes(tables);

  const schoolTables =
    findSchoolTables(tables).map(
      (table) => ({
        tableId: table.id,
        tableName: table.name,
        rowCount:
          table.rows.length,
        rows:
          table.rows,
      }),
    );

  const schoolValues =
    analyzeSchoolValues(
      tables,
      schoolColumns,
    );

  const references =
    analyzeReferences(
      tables,
      tableMap,
    );

  const duplicates =
    findDuplicateCandidates(
      tables,
    );

  const referenceSummary = {
    valid:
      references.filter(
        (item) =>
          item.status === "valid",
      ).length,
    orphansFound:
      references.filter(
        (item) =>
          item.status ===
          "orphans-found",
      ).length,
    unresolvedTargets:
      references.filter(
        (item) =>
          item.status ===
          "unresolved-target",
      ).length,
    totalOrphans:
      references.reduce(
        (sum, item) =>
          sum +
          (item.orphanCount ?? 0),
        0,
      ),
  };

  const duplicateSummary = {
    totalGroups:
      duplicates.reduce(
        (sum, item) =>
          sum +
          item.duplicateGroups.length,
        0,
      ),
  };

  const manifest =
    snapshot?.manifest ?? {};

  const report = {
    generatedAt:
      new Date().toISOString(),
    backupDirectory,
    snapshotTotals: {
      tables:
        manifest?.totals?.tables ??
        tables.length,
      columns:
        manifest?.totals?.columns ??
        tables.reduce(
          (sum, table) =>
            sum +
            table.columns.length,
          0,
        ),
      indexes:
        manifest?.totals?.indexes ??
        tables.reduce(
          (sum, table) =>
            sum +
            table.indexes.length,
          0,
        ),
      rows:
        manifest?.totals?.rows ??
        tables.reduce(
          (sum, table) =>
            sum +
            table.rows.length,
          0,
        ),
    },
    schoolColumns,
    schoolIndexes,
    schoolTables,
    schoolValues,
    references,
    referenceSummary,
    duplicates,
    duplicateSummary,
  };

  const outputDirectory =
    path.join(
      backupDirectory,
      "single-school-migration-audit",
    );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const jsonPath =
    path.join(
      outputDirectory,
      "single-school-migration-audit.json",
    );

  const markdownPath =
    path.join(
      outputDirectory,
      "single-school-migration-audit.md",
    );

  await Promise.all([
    fs.writeFile(
      jsonPath,
      jsonText(report),
      "utf8",
    ),
    fs.writeFile(
      markdownPath,
      markdownReport(report),
      "utf8",
    ),
  ]);

  console.log("");
  console.log(
    "SINGLE-SCHOOL MIGRATION AUDIT COMPLETE",
  );
  console.log(
    "======================================",
  );
  console.log(
    `Backup:                ${backupDirectory}`,
  );
  console.log(
    `schoolId columns:      ${schoolColumns.length}`,
  );
  console.log(
    `schoolId indexes:      ${schoolIndexes.length}`,
  );
  console.log(
    `School table rows:     ${schoolTables.reduce(
      (sum, table) =>
        sum + table.rowCount,
      0,
    )}`,
  );
  console.log(
    `Broken reference sets: ${referenceSummary.orphansFound}`,
  );
  console.log(
    `Orphan values:         ${referenceSummary.totalOrphans}`,
  );
  console.log(
    `Unresolved ID fields:  ${referenceSummary.unresolvedTargets}`,
  );
  console.log(
    `Duplicate groups:      ${duplicateSummary.totalGroups}`,
  );
  console.log(
    `Report folder:         ${outputDirectory}`,
  );
}

await main();
