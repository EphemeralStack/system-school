import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BACKUP_ROOT = path.resolve("appwrite-backups");

const RETAINED_SCHOOL_ID =
  "6a525bba003dd373df45";

const SEED_PREFIXES = [
  "seed_",
  "seed-",
];

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function idOf(value) {
  return String(
    value?.$id ??
      value?.id ??
      "",
  ).trim();
}

function tableName(entry) {
  return String(
    entry?.table?.name ??
      entry?.table?.Name ??
      entry?.table?.$id ??
      "unknown",
  );
}

function tableId(entry) {
  return String(
    entry?.table?.$id ??
      entry?.table?.id ??
      "",
  );
}

function rowsOf(entry) {
  return Array.isArray(entry?.rows)
    ? entry.rows
    : [];
}

function isSeedLike(value) {
  const normalized = normalize(value);

  return SEED_PREFIXES.some(
    (prefix) =>
      normalized.startsWith(prefix),
  );
}

function looksLikeSyntheticSchoolEmail(value) {
  return /^school\d+@starlight\.ac\.zw$/i.test(
    String(value ?? "").trim(),
  );
}

function looksLikeSyntheticPlaceholder(value) {
  return /^https:\/\/placehold\.co\/256x256\/png\?text=s\d+$/i.test(
    String(value ?? "").trim(),
  );
}

function directSeedReasons(
  row,
  currentTableName,
) {
  const reasons = [];
  const rowId = idOf(row);

  if (isSeedLike(rowId)) {
    reasons.push(
      `row id "${rowId}" uses a seed prefix`,
    );
  }

  const schoolId =
    row?.schoolId ??
    row?.SchoolId ??
    row?.school_id;

  if (isSeedLike(schoolId)) {
    reasons.push(
      `schoolId "${schoolId}" is seeded`,
    );
  }

  if (
    normalize(currentTableName) === "school" &&
    rowId !== RETAINED_SCHOOL_ID &&
    isSeedLike(rowId)
  ) {
    reasons.push(
      "seeded school configuration row",
    );
  }

  const email =
    row?.Email ??
    row?.email ??
    row?.ContactEmail;

  if (
    looksLikeSyntheticSchoolEmail(email)
  ) {
    reasons.push(
      `synthetic school email "${email}"`,
    );
  }

  const logo =
    row?.LogoUrl ??
    row?.avatar ??
    row?.Avatar;

  if (
    looksLikeSyntheticPlaceholder(logo)
  ) {
    reasons.push(
      "synthetic placeholder image",
    );
  }

  return [...new Set(reasons)];
}

function referenceFields(row) {
  return Object.entries(row).filter(
    ([key, value]) => {
      if (
        key.startsWith("$") ||
        value === null ||
        value === undefined
      ) {
        return false;
      }

      return /id$/i.test(key) &&
        typeof value === "string" &&
        value.trim() !== "";
    },
  );
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
      const stats =
        await fs.stat(directory);

      candidates.push({
        directory,
        modifiedAt: stats.mtimeMs,
      });
    }
  }

  candidates.sort(
    (left, right) =>
      right.modifiedAt -
      left.modifiedAt,
  );

  if (candidates.length === 0) {
    throw new Error(
      "No completed backup found.",
    );
  }

  return candidates[0].directory;
}

async function loadSnapshot(
  backupDirectory,
) {
  const filePath = path.join(
    backupDirectory,
    "complete-backend-snapshot.json",
  );

  return JSON.parse(
    await fs.readFile(
      filePath,
      "utf8",
    ),
  );
}

function buildCatalog(snapshot) {
  const entries =
    Array.isArray(snapshot?.tables)
      ? snapshot.tables
      : [];

  return entries.map((entry) => ({
    entry,
    tableId: tableId(entry),
    tableName: tableName(entry),
    rows: rowsOf(entry),
  }));
}

function rowKey(
  tableIdValue,
  rowId,
) {
  return `${tableIdValue}:${rowId}`;
}

function buildRowIndex(catalog) {
  const byId = new Map();

  for (const table of catalog) {
    for (const row of table.rows) {
      const rowId = idOf(row);

      if (!rowId) {
        continue;
      }

      const existing =
        byId.get(rowId) ?? [];

      existing.push({
        tableId: table.tableId,
        tableName: table.tableName,
        row,
      });

      byId.set(rowId, existing);
    }
  }

  return byId;
}

function classifyRows(catalog) {
  const rowIndex =
    buildRowIndex(catalog);

  const seeded = new Map();

  for (const table of catalog) {
    for (const row of table.rows) {
      const rowId = idOf(row);

      if (!rowId) {
        continue;
      }

      const reasons =
        directSeedReasons(
          row,
          table.tableName,
        );

      if (reasons.length > 0) {
        seeded.set(
          rowKey(
            table.tableId,
            rowId,
          ),
          {
            tableId: table.tableId,
            tableName:
              table.tableName,
            rowId,
            row,
            reasons,
            classification:
              "direct-seed",
          },
        );
      }
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const table of catalog) {
      for (const row of table.rows) {
        const rowId = idOf(row);

        if (!rowId) {
          continue;
        }

        const key = rowKey(
          table.tableId,
          rowId,
        );

        if (seeded.has(key)) {
          continue;
        }

        const dependentReasons = [];

        for (
          const [
            fieldName,
            referenceValue,
          ] of referenceFields(row)
        ) {
          const targets =
            rowIndex.get(
              referenceValue,
            ) ?? [];

          const targetIsSeeded =
            targets.some((target) =>
              seeded.has(
                rowKey(
                  target.tableId,
                  idOf(target.row),
                ),
              ),
            );

          if (targetIsSeeded) {
            dependentReasons.push(
              `${fieldName} references seeded row "${referenceValue}"`,
            );
          }
        }

        if (
          dependentReasons.length > 0
        ) {
          seeded.set(key, {
            tableId:
              table.tableId,
            tableName:
              table.tableName,
            rowId,
            row,
            reasons:
              dependentReasons,
            classification:
              "dependent-on-seed",
          });

          changed = true;
        }
      }
    }
  }

  const conflicts = [];

  for (const table of catalog) {
    for (const row of table.rows) {
      const rowId = idOf(row);

      if (!rowId) {
        continue;
      }

      const key = rowKey(
        table.tableId,
        rowId,
      );

      if (seeded.has(key)) {
        continue;
      }

      for (
        const [
          fieldName,
          referenceValue,
        ] of referenceFields(row)
      ) {
        const targets =
          rowIndex.get(
            referenceValue,
          ) ?? [];

        const seededTargets =
          targets.filter((target) =>
            seeded.has(
              rowKey(
                target.tableId,
                idOf(target.row),
              ),
            ),
          );

        if (
          seededTargets.length > 0
        ) {
          conflicts.push({
            tableId:
              table.tableId,
            tableName:
              table.tableName,
            rowId,
            fieldName,
            referenceValue,
            seededTargets:
              seededTargets.map(
                (target) => ({
                  tableId:
                    target.tableId,
                  tableName:
                    target.tableName,
                  rowId:
                    idOf(target.row),
                }),
              ),
          });
        }
      }
    }
  }

  return {
    seeded,
    conflicts,
  };
}

function buildSummary(
  catalog,
  seeded,
) {
  return catalog.map((table) => {
    const deletions = [];

    for (const row of table.rows) {
      const rowId = idOf(row);

      if (!rowId) {
        continue;
      }

      const item =
        seeded.get(
          rowKey(
            table.tableId,
            rowId,
          ),
        );

      if (item) {
        deletions.push({
          rowId,
          classification:
            item.classification,
          reasons:
            item.reasons,
        });
      }
    }

    return {
      tableId: table.tableId,
      tableName:
        table.tableName,
      totalRows:
        table.rows.length,
      deleteCount:
        deletions.length,
      keepCount:
        table.rows.length -
        deletions.length,
      deletions,
    };
  });
}

function markdown(report) {
  const lines = [];

  lines.push(
    "# Single-School Seed Cleanup Plan",
    "",
    `Backup: \`${report.backupDirectory}\``,
    "",
    `Retained school ID: \`${report.retainedSchoolId}\``,
    "",
    "## Summary",
    "",
    `- Total rows: ${report.totals.totalRows}`,
    `- Rows proposed for deletion: ${report.totals.deleteRows}`,
    `- Rows retained: ${report.totals.keepRows}`,
    `- Real-to-seed reference conflicts: ${report.totals.conflicts}`,
    "",
    "## Table-by-table plan",
    "",
  );

  for (const table of report.tables) {
    lines.push(
      `### ${table.tableName}`,
      "",
      `- Total: ${table.totalRows}`,
      `- Delete: ${table.deleteCount}`,
      `- Keep: ${table.keepCount}`,
      "",
    );
  }

  lines.push(
    "## Safety decision",
    "",
  );

  if (
    report.totals.conflicts > 0
  ) {
    lines.push(
      "STOP: Real records reference seeded records. Resolve these conflicts before deletion.",
    );
  } else {
    lines.push(
      "No retained record points to a seeded row. The seed purge can proceed after manual review.",
    );
  }

  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const backupDirectory =
    process.argv[2]
      ? path.resolve(
          process.argv[2],
        )
      : await latestCompletedBackup();

  const snapshot =
    await loadSnapshot(
      backupDirectory,
    );

  const catalog =
    buildCatalog(snapshot);

  const {
    seeded,
    conflicts,
  } = classifyRows(catalog);

  const tables =
    buildSummary(
      catalog,
      seeded,
    );

  const totalRows =
    tables.reduce(
      (sum, table) =>
        sum +
        table.totalRows,
      0,
    );

  const deleteRows =
    tables.reduce(
      (sum, table) =>
        sum +
        table.deleteCount,
      0,
    );

  const report = {
    generatedAt:
      new Date().toISOString(),
    backupDirectory,
    retainedSchoolId:
      RETAINED_SCHOOL_ID,
    totals: {
      totalRows,
      deleteRows,
      keepRows:
        totalRows - deleteRows,
      conflicts:
        conflicts.length,
    },
    tables,
    conflicts,
  };

  const outputDirectory =
    path.join(
      backupDirectory,
      "single-school-cleanup-plan",
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
        "single-school-cleanup-plan.json",
      ),
      `${JSON.stringify(
        report,
        null,
        2,
      )}\n`,
      "utf8",
    ),

    fs.writeFile(
      path.join(
        outputDirectory,
        "single-school-cleanup-plan.md",
      ),
      markdown(report),
      "utf8",
    ),
  ]);

  console.log("");
  console.log(
    "SINGLE-SCHOOL CLEANUP PLAN COMPLETE",
  );
  console.log(
    "===================================",
  );
  console.log(
    `Backup:            ${backupDirectory}`,
  );
  console.log(
    `Rows total:        ${totalRows}`,
  );
  console.log(
    `Rows to delete:    ${deleteRows}`,
  );
  console.log(
    `Rows to retain:    ${
      totalRows - deleteRows
    }`,
  );
  console.log(
    `Reference conflicts: ${conflicts.length}`,
  );
  console.log(
    `Report folder:     ${outputDirectory}`,
  );
}

await main();
