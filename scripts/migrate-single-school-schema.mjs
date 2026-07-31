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
const POLL_INTERVAL_MS = 1500;
const OPERATION_TIMEOUT_MS = 120000;

const DEFAULT_ENDPOINT =
  "https://syd.cloud.appwrite.io/v1";

const DEFAULT_PROJECT_ID =
  "6a466db90017775cb15a";

const DEFAULT_DATABASE_ID =
  "6a4679b4003a283bf7c5";

const RETAINED_SCHOOL_ID =
  "6a525bba003dd373df45";

const EXPECTED_RETAINED_ROWS = 20;
const EXPECTED_OLD_INDEXES = 27;
const EXPECTED_SCHOOL_COLUMNS = 18;
const EXPECTED_REPLACEMENT_INDEXES = 23;

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

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rowId(row) {
  return String(row?.$id ?? row?.id ?? "").trim();
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

function columnKey(column) {
  return String(
    column?.key ??
      column?.name ??
      column?.$id ??
      "",
  ).trim();
}

function indexKey(index) {
  return String(
    index?.key ??
      index?.name ??
      index?.Name ??
      index?.$id ??
      "",
  ).trim();
}

function indexColumns(index) {
  const possible = [
    index?.columns,
    index?.attributes,
    index?.keys,
    index?.fields,
  ];

  for (const value of possible) {
    if (Array.isArray(value)) {
      return value.map(String);
    }
  }

  return [];
}

function indexOrders(index) {
  return asArray(index?.orders).map((order) =>
    normalize(order),
  );
}

function indexLengths(index) {
  return asArray(index?.lengths).map((length) => {
    if (
      length === null ||
      length === undefined ||
      length === ""
    ) {
      return null;
    }

    const numeric = Number(length);

    return Number.isFinite(numeric) &&
      numeric > 0
      ? numeric
      : null;
  });
}

function indexType(index) {
  return normalize(index?.type);
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function errorCode(error) {
  return String(
    error?.cause?.code ??
      error?.code ??
      "",
  ).trim();
}

function errorStatus(error) {
  const numeric = Number(
    error?.code ??
      error?.status ??
      error?.response?.status,
  );

  return Number.isFinite(numeric)
    ? numeric
    : 0;
}

function errorMessage(error) {
  return String(
    error instanceof Error
      ? error.message
      : error,
  );
}

function isTransientAppwriteError(error) {
  const code = errorCode(error);
  const status = errorStatus(error);
  const message = errorMessage(error).toLowerCase();

  return (
    [
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ].includes(code) ||
    message.includes("fetch failed") ||
    message.includes("connect timeout") ||
    message.includes("network") ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

function isNotFoundError(error) {
  return (
    errorStatus(error) === 404 ||
    String(error?.type ?? "").includes(
      "not_found",
    )
  );
}

async function retryAppwrite(
  label,
  operation,
  {
    attempts = 8,
    initialDelayMs = 2000,
    maximumDelayMs = 20000,
  } = {},
) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isTransientAppwriteError(error) ||
        attempt === attempts
      ) {
        throw error;
      }

      const delay = Math.min(
        initialDelayMs *
          2 ** (attempt - 1),
        maximumDelayMs,
      );

      console.log("");
      console.warn(
        `${label} failed because of a temporary connection problem. Retrying ${attempt}/${attempts - 1} in ${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(filePath) {
  return JSON.parse(
    await fs.readFile(filePath, "utf8"),
  );
}

async function atomicWriteJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );

  await fs.rename(
    temporaryPath,
    filePath,
  );
}

function normalizeCliArgument(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

function parseArguments() {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs.map(normalizeCliArgument);

  let execute = false;
  let backupDirectory = null;
  let confirmation = "";

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--execute") {
      execute = true;
      continue;
    }

    if (argument.startsWith("--backup=")) {
      backupDirectory = path.resolve(
        argument.slice("--backup=".length),
      );
      continue;
    }

    if (argument === "--backup") {
      const nextValue = args[index + 1];

      if (!nextValue) {
        throw new Error("--backup requires a folder path.");
      }

      backupDirectory = path.resolve(nextValue);
      index += 1;
      continue;
    }

    if (argument.startsWith("--confirm=")) {
      confirmation = argument
        .slice("--confirm=".length)
        .trim();
      continue;
    }

    if (argument === "--confirm") {
      const nextValue = args[index + 1];

      if (!nextValue) {
        throw new Error("--confirm requires a confirmation value.");
      }

      confirmation = nextValue.trim();
      index += 1;
      continue;
    }

    if (
      argument === "REMOVE_18_SCHOOLID_COLUMNS" &&
      !confirmation
    ) {
      confirmation = argument;
    }
  }

  if (!confirmation) {
    confirmation =
      normalizeCliArgument(
        process.env.SCHEMA_MIGRATION_CONFIRMATION,
      );
  }

  return {
    execute,
    backupDirectory,
    confirmation,
    receivedArguments: rawArgs,
  };
}

async function latestPreparedBackup() {
  if (!(await exists(BACKUP_ROOT))) {
    throw new Error(
      `Backup root not found: ${BACKUP_ROOT}`,
    );
  }

  const entries = await fs.readdir(BACKUP_ROOT, {
    withFileTypes: true,
  });

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

    const auditPath = path.join(
      directory,
      "single-school-migration-audit",
      "single-school-migration-audit.json",
    );

    const cleanupPath = path.join(
      directory,
      "single-school-cleanup-plan",
      "single-school-cleanup-plan.json",
    );

    const purgeStatePath = path.join(
      directory,
      "single-school-cleanup-plan",
      "purge-execution-state.json",
    );

    if (
      (await exists(snapshotPath)) &&
      (await exists(auditPath)) &&
      (await exists(cleanupPath)) &&
      (await exists(purgeStatePath))
    ) {
      const purgeState = await loadJson(purgeStatePath);

      if (purgeState?.status !== "complete") {
        continue;
      }

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
      "No completed seed purge with its migration audit was found.",
    );
  }

  return candidates[0].directory;
}

async function listAll({
  responseKey,
  fetchPage,
}) {
  const items = [];
  let offset = 0;
  let total = null;

  while (true) {
    const response = await retryAppwrite(
      `Reading ${responseKey} page at offset ${offset}`,
      () =>
        fetchPage([
          Query.limit(PAGE_SIZE),
          Query.offset(offset),
        ]),
    );

    const page = asArray(response?.[responseKey]);

    if (
      total === null &&
      Number.isFinite(response?.total)
    ) {
      total = response.total;
    }

    items.push(...page);

    if (
      page.length < PAGE_SIZE ||
      (total !== null && items.length >= total)
    ) {
      break;
    }

    offset += page.length;
  }

  if (total !== null && items.length !== total) {
    throw new Error(
      `Incomplete ${responseKey} response: expected ${total}, received ${items.length}.`,
    );
  }

  return items;
}

async function listColumns(
  tablesDB,
  databaseId,
  currentTableId,
) {
  return listAll({
    responseKey: "columns",
    fetchPage: (queries) =>
      tablesDB.listColumns({
        databaseId,
        tableId: currentTableId,
        queries,
        total: true,
      }),
  });
}

async function listIndexes(
  tablesDB,
  databaseId,
  currentTableId,
) {
  return listAll({
    responseKey: "indexes",
    fetchPage: (queries) =>
      tablesDB.listIndexes({
        databaseId,
        tableId: currentTableId,
        queries,
        total: true,
      }),
  });
}

async function listRows(
  tablesDB,
  databaseId,
  currentTableId,
) {
  return listAll({
    responseKey: "rows",
    fetchPage: (queries) =>
      tablesDB.listRows({
        databaseId,
        tableId: currentTableId,
        queries,
        total: true,
        ttl: 0,
      }),
  });
}

function cleanIndexKey(originalName) {
  return originalName
    .replace(/_school_/gi, "_")
    .replace(/_school$/gi, "")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildReplacementIndexes(
  schoolIndexes,
  snapshot,
) {
  const replacements = [];

  const snapshotTables = new Map(
    asArray(snapshot?.tables).map((entry) => [
      tableId(entry),
      entry,
    ]),
  );

  function columnMetadata(entry, key) {
    return asArray(entry?.columns).find(
      (column) =>
        columnKey(column) === key,
    );
  }

  function isTextColumn(column) {
    const type = normalize(
      column?.type ??
        column?.format ??
        column?.dataType,
    );

    return [
      "string",
      "text",
      "varchar",
      "mediumtext",
      "longtext",
    ].includes(type);
  }

  function fallbackLength(column, key) {
    if (!isTextColumn(column)) {
      return null;
    }

    const normalizedKey = normalize(key);
    const declaredSize = Number(column?.size);

    if (normalizedKey.endsWith("id")) {
      return Math.min(
        Number.isFinite(declaredSize) &&
          declaredSize > 0
          ? declaredSize
          : 36,
        191,
      );
    }

    if (
      normalizedKey === "status" ||
      normalizedKey === "gender" ||
      normalizedKey === "term"
    ) {
      return Math.min(
        Number.isFinite(declaredSize) &&
          declaredSize > 0
          ? declaredSize
          : 32,
        64,
      );
    }

    if (normalizedKey === "subjectcode") {
      return Math.min(
        Number.isFinite(declaredSize) &&
          declaredSize > 0
          ? declaredSize
          : 64,
        64,
      );
    }

    if (normalizedKey === "name") {
      return Math.min(
        Number.isFinite(declaredSize) &&
          declaredSize > 0
          ? declaredSize
          : 191,
        191,
      );
    }

    if (
      Number.isFinite(declaredSize) &&
      declaredSize > 0
    ) {
      return Math.min(
        declaredSize,
        191,
      );
    }

    return 191;
  }

  for (const oldIndex of schoolIndexes) {
    const columns = asArray(
      oldIndex?.attributes,
    );

    const orders = asArray(
      oldIndex?.orders,
    );

    const currentTableId =
      String(oldIndex.tableId);

    const originalName = String(
      oldIndex?.indexName ??
        oldIndex?.indexId ??
        "",
    ).trim();

    const snapshotEntry =
      snapshotTables.get(
        currentTableId,
      );

    const sourceIndex =
      asArray(
        snapshotEntry?.indexes,
      ).find(
        (index) =>
          indexKey(index) ===
          originalName,
      );

    const sourceLengths =
      indexLengths(sourceIndex);

    const retainedColumns = [];
    const retainedOrders = [];
    const retainedLengths = [];

    for (
      let index = 0;
      index < columns.length;
      index += 1
    ) {
      if (
        normalize(columns[index]) ===
        "schoolid"
      ) {
        continue;
      }

      const currentColumn =
        String(columns[index]);

      retainedColumns.push(
        currentColumn,
      );

      if (orders[index] !== undefined) {
        retainedOrders.push(
          normalize(orders[index]),
        );
      }

      const metadata =
        columnMetadata(
          snapshotEntry,
          currentColumn,
        );

      const sourceLength =
        sourceLengths[index];

      if (
        isTextColumn(metadata) &&
        Number.isFinite(
          Number(sourceLength),
        ) &&
        Number(sourceLength) > 0
      ) {
        retainedLengths.push(
          Number(sourceLength),
        );
      } else {
        retainedLengths.push(
          fallbackLength(
            metadata,
            currentColumn,
          ),
        );
      }
    }

    if (retainedColumns.length === 0) {
      continue;
    }

    const key =
      cleanIndexKey(
        originalName,
      );

    if (!key) {
      throw new Error(
        `Could not derive a replacement key for ${originalName}.`,
      );
    }

    replacements.push({
      tableId:
        currentTableId,
      tableName:
        String(oldIndex.tableName),
      oldKey:
        originalName,
      key,
      type:
        normalize(oldIndex.type),
      columns:
        retainedColumns,
      orders:
        retainedOrders,
      lengths:
        retainedLengths,
    });
  }

  return replacements;
}

function validateMigrationInputs({
  audit,
  cleanup,
  purgeState,
  replacements,
}) {
  if (
    asArray(audit?.schoolColumns).length !==
    EXPECTED_SCHOOL_COLUMNS
  ) {
    throw new Error(
      `Expected ${EXPECTED_SCHOOL_COLUMNS} schoolId columns, but the audit contains ${asArray(audit?.schoolColumns).length}.`,
    );
  }

  if (
    asArray(audit?.schoolIndexes).length !==
    EXPECTED_OLD_INDEXES
  ) {
    throw new Error(
      `Expected ${EXPECTED_OLD_INDEXES} tenancy indexes, but the audit contains ${asArray(audit?.schoolIndexes).length}.`,
    );
  }

  if (
    replacements.length !==
    EXPECTED_REPLACEMENT_INDEXES
  ) {
    throw new Error(
      `Expected ${EXPECTED_REPLACEMENT_INDEXES} replacement indexes, but derived ${replacements.length}.`,
    );
  }

  if (
    cleanup?.retainedSchoolId !==
    RETAINED_SCHOOL_ID
  ) {
    throw new Error(
      "Unexpected retained school ID in cleanup plan.",
    );
  }

  if (
    Number(cleanup?.totals?.keepRows) !==
    EXPECTED_RETAINED_ROWS
  ) {
    throw new Error(
      `Expected ${EXPECTED_RETAINED_ROWS} retained rows.`,
    );
  }

  if (purgeState?.status !== "complete") {
    throw new Error(
      "The seed purge is not marked complete.",
    );
  }

  if (
    Number(purgeState?.remainingRows) !==
    EXPECTED_RETAINED_ROWS
  ) {
    throw new Error(
      `The purge state does not confirm ${EXPECTED_RETAINED_ROWS} remaining rows.`,
    );
  }

  const replacementKeys = new Set();

  for (const replacement of replacements) {
    const uniqueKey =
      `${replacement.tableId}:${replacement.key}`;

    if (replacementKeys.has(uniqueKey)) {
      throw new Error(
        `Duplicate replacement index key: ${uniqueKey}`,
      );
    }

    if (replacement.key.length > 36) {
      throw new Error(
        `Replacement index key exceeds 36 characters: ${replacement.key}`,
      );
    }

    replacementKeys.add(uniqueKey);
  }
}

function retainedRowIds(snapshot, cleanup) {
  const deleteKeys = new Set();

  for (const table of asArray(cleanup?.tables)) {
    for (const deletion of asArray(table?.deletions)) {
      deleteKeys.add(
        `${table.tableId}:${deletion.rowId}`,
      );
    }
  }

  const expected = new Map();

  for (const entry of asArray(snapshot?.tables)) {
    const currentTableId = tableId(entry);
    const expectedIds = new Set();

    for (const row of asArray(entry?.rows)) {
      const currentRowId = rowId(row);

      if (
        currentRowId &&
        !deleteKeys.has(
          `${currentTableId}:${currentRowId}`,
        )
      ) {
        expectedIds.add(currentRowId);
      }
    }

    expected.set(currentTableId, {
      tableName: tableName(entry),
      rowIds: expectedIds,
    });
  }

  return expected;
}

function setDifferences(expected, actual) {
  return {
    missing: [...expected].filter(
      (value) => !actual.has(value),
    ),
    unexpected: [...actual].filter(
      (value) => !expected.has(value),
    ),
  };
}

async function verifyRetainedRows({
  tablesDB,
  databaseId,
  snapshot,
  cleanup,
}) {
  const expectedTables =
    retainedRowIds(snapshot, cleanup);

  let liveTotal = 0;

  for (const [
    currentTableId,
    expected,
  ] of expectedTables) {
    const rows = await listRows(
      tablesDB,
      databaseId,
      currentTableId,
    );

    const actualIds = new Set(
      rows.map(rowId).filter(Boolean),
    );

    liveTotal += actualIds.size;

    if (
      actualIds.size !== expected.rowIds.size ||
      [...actualIds].some(
        (value) => !expected.rowIds.has(value),
      )
    ) {
      const diff = setDifferences(
        expected.rowIds,
        actualIds,
      );

      throw new Error(
        [
          `Live retained rows changed in "${expected.tableName}".`,
          `Missing: ${diff.missing.slice(0, 10).join(", ") || "none"}`,
          `Unexpected: ${diff.unexpected.slice(0, 10).join(", ") || "none"}`,
          "Create a fresh backup and audit before migrating the schema.",
        ].join("\n"),
      );
    }
  }

  if (liveTotal !== EXPECTED_RETAINED_ROWS) {
    throw new Error(
      `Expected ${EXPECTED_RETAINED_ROWS} live rows, but found ${liveTotal}.`,
    );
  }

  return liveTotal;
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedIndexDefinition(index) {
  return {
    type: indexType(index),
    columns: indexColumns(index),
    orders: indexOrders(index),
    lengths: indexLengths(index),
  };
}

function expectedIndexDefinition(replacement) {
  return {
    type: normalize(replacement.type),
    columns: replacement.columns.map(String),
    orders: replacement.orders.map(normalize),
    lengths: asArray(replacement.lengths).map(
      (length) =>
        length === null ||
        length === undefined
          ? null
          : Number(length),
    ),
  };
}

function uniqueValueKey(row, columns) {
  return JSON.stringify(
    columns.map((column) => {
      const value = row?.[column];

      if (
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return String(value);
    }),
  );
}

async function verifyUniqueIndexes({
  tablesDB,
  databaseId,
  replacements,
}) {
  const uniqueIndexes = replacements.filter(
    (replacement) =>
      replacement.type === "unique",
  );

  const rowsByTable = new Map();

  for (const replacement of uniqueIndexes) {
    let rows = rowsByTable.get(
      replacement.tableId,
    );

    if (!rows) {
      rows = await listRows(
        tablesDB,
        databaseId,
        replacement.tableId,
      );

      rowsByTable.set(
        replacement.tableId,
        rows,
      );
    }

    const seen = new Map();

    for (const row of rows) {
      const key = uniqueValueKey(
        row,
        replacement.columns,
      );

      const existing = seen.get(key);

      if (existing) {
        throw new Error(
          [
            `Cannot create unique index "${replacement.key}".`,
            `Duplicate values on ${replacement.columns.join(", ")}.`,
            `Rows: ${existing} and ${rowId(row)}.`,
          ].join("\n"),
        );
      }

      seen.set(key, rowId(row));
    }
  }
}

async function getLiveSchema(
  tablesDB,
  databaseId,
  affectedTableIds,
) {
  const schema = new Map();

  for (const currentTableId of affectedTableIds) {
    const [columns, indexes] = await Promise.all([
      listColumns(
        tablesDB,
        databaseId,
        currentTableId,
      ),
      listIndexes(
        tablesDB,
        databaseId,
        currentTableId,
      ),
    ]);

    schema.set(currentTableId, {
      columns,
      indexes,
    });
  }

  return schema;
}

async function runPreflight({
  tablesDB,
  databaseId,
  snapshot,
  cleanup,
  audit,
  replacements,
}) {
  console.log("");
  console.log(
    "Verifying retained rows...",
  );

  const liveRows = await verifyRetainedRows({
    tablesDB,
    databaseId,
    snapshot,
    cleanup,
  });

  console.log(
    `Retained rows verified: ${liveRows}`,
  );

  await retryAppwrite(
    "Verifying Bindura Primary School",
    () =>
      tablesDB.getRow({
        databaseId,
        tableId: "6a4679e3003a448373f5",
        rowId: RETAINED_SCHOOL_ID,
      }),
  );

  console.log(
    "Bindura Primary School configuration verified.",
  );

  await verifyUniqueIndexes({
    tablesDB,
    databaseId,
    replacements,
  });

  console.log(
    "Replacement unique-index values verified.",
  );

  const affectedTableIds = new Set([
    ...asArray(audit?.schoolColumns).map(
      (item) => String(item.tableId),
    ),
    ...asArray(audit?.schoolIndexes).map(
      (item) => String(item.tableId),
    ),
  ]);

  const liveSchema = await getLiveSchema(
    tablesDB,
    databaseId,
    affectedTableIds,
  );

  let oldIndexesPresent = 0;
  let schoolColumnsPresent = 0;
  let replacementIndexesPresent = 0;

  for (const oldIndex of asArray(audit?.schoolIndexes)) {
    const indexes =
      liveSchema.get(String(oldIndex.tableId))
        ?.indexes ?? [];

    const tenancyIndexStillExists =
      indexes.some((index) => {
        const sameKey =
          indexKey(index) ===
          String(oldIndex.indexName);

        const stillContainsSchoolId =
          indexColumns(index).some(
            (column) =>
              normalize(column) ===
              "schoolid",
          );

        return (
          sameKey &&
          stillContainsSchoolId
        );
      });

    if (tenancyIndexStillExists) {
      oldIndexesPresent += 1;
    }
  }

  for (const oldColumn of asArray(audit?.schoolColumns)) {
    const columns =
      liveSchema.get(String(oldColumn.tableId))
        ?.columns ?? [];

    if (
      columns.some(
        (column) =>
          columnKey(column) ===
          String(oldColumn.columnKey),
      )
    ) {
      schoolColumnsPresent += 1;
    }
  }

  const oldTenancyIndexKeys = new Set(
    asArray(audit?.schoolIndexes).map(
      (item) =>
        `${String(item.tableId)}:${String(item.indexName)}`,
    ),
  );

  for (const replacement of replacements) {
    const indexes =
      liveSchema.get(replacement.tableId)
        ?.indexes ?? [];

    const existing = indexes.find(
      (index) =>
        indexKey(index) ===
        replacement.key,
    );

    if (!existing) {
      continue;
    }

    const actual =
      normalizedIndexDefinition(existing);

    const expected =
      expectedIndexDefinition(replacement);

    const definitionsMatch =
      actual.type === expected.type &&
      valuesEqual(
        actual.columns,
        expected.columns,
      ) &&
      valuesEqual(
        actual.orders,
        expected.orders,
      );

    if (definitionsMatch) {
      replacementIndexesPresent += 1;
      continue;
    }

    const isSameNameOldTenancyIndex =
      oldTenancyIndexKeys.has(
        `${replacement.tableId}:${replacement.key}`,
      ) &&
      actual.columns.some(
        (column) =>
          normalize(column) === "schoolid",
      );

    if (isSameNameOldTenancyIndex) {
      continue;
    }

    throw new Error(
      `Existing index "${replacement.key}" has an unexpected definition and is not a recognized tenancy index.`,
    );
  }

  return {
    oldIndexesPresent,
    schoolColumnsPresent,
    replacementIndexesPresent,
  };
}

async function deleteIndexResilient({
  tablesDB,
  databaseId,
  tableId: currentTableId,
  key,
}) {
  try {
    await retryAppwrite(
      `Deleting index ${currentTableId}.${key}`,
      () =>
        tablesDB.deleteIndex({
          databaseId,
          tableId: currentTableId,
          key,
        }),
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    if (isTransientAppwriteError(error)) {
      const indexes = await listIndexes(
        tablesDB,
        databaseId,
        currentTableId,
      );

      if (
        !indexes.some(
          (index) =>
            indexKey(index) === key,
        )
      ) {
        return;
      }
    }

    throw error;
  }
}

async function deleteColumnResilient({
  tablesDB,
  databaseId,
  tableId: currentTableId,
  key,
}) {
  try {
    await retryAppwrite(
      `Deleting column ${currentTableId}.${key}`,
      () =>
        tablesDB.deleteColumn({
          databaseId,
          tableId: currentTableId,
          key,
        }),
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    if (isTransientAppwriteError(error)) {
      const columns = await listColumns(
        tablesDB,
        databaseId,
        currentTableId,
      );

      if (
        !columns.some(
          (column) =>
            columnKey(column) === key,
        )
      ) {
        return;
      }
    }

    throw error;
  }
}

async function createIndexResilient({
  tablesDB,
  databaseId,
  replacement,
  input,
}) {
  try {
    await retryAppwrite(
      `Creating index ${replacement.tableName}.${replacement.key}`,
      () =>
        tablesDB.createIndex(input),
    );
  } catch (error) {
    const indexes = await listIndexes(
      tablesDB,
      databaseId,
      replacement.tableId,
    );

    const existing = indexes.find(
      (index) =>
        indexKey(index) ===
        replacement.key,
    );

    if (existing) {
      const actual =
        normalizedIndexDefinition(
          existing,
        );

      const expected =
        expectedIndexDefinition(
          replacement,
        );

      const definitionsMatch =
        actual.type === expected.type &&
        valuesEqual(
          actual.columns,
          expected.columns,
        ) &&
        valuesEqual(
          actual.orders,
          expected.orders,
        );

      if (definitionsMatch) {
        return;
      }
    }

    throw error;
  }
}

async function waitUntilIndexAbsent({
  tablesDB,
  databaseId,
  tableId: currentTableId,
  key,
}) {
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    OPERATION_TIMEOUT_MS
  ) {
    const indexes = await listIndexes(
      tablesDB,
      databaseId,
      currentTableId,
    );

    if (
      !indexes.some(
        (index) =>
          indexKey(index) === key,
      )
    ) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for index "${key}" to be deleted.`,
  );
}

async function waitUntilColumnAbsent({
  tablesDB,
  databaseId,
  tableId: currentTableId,
  key,
}) {
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    OPERATION_TIMEOUT_MS
  ) {
    const columns = await listColumns(
      tablesDB,
      databaseId,
      currentTableId,
    );

    if (
      !columns.some(
        (column) =>
          columnKey(column) === key,
      )
    ) {
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for column "${key}" to be deleted.`,
  );
}

async function waitUntilIndexReady({
  tablesDB,
  databaseId,
  replacement,
}) {
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    OPERATION_TIMEOUT_MS
  ) {
    const indexes = await listIndexes(
      tablesDB,
      databaseId,
      replacement.tableId,
    );

    const current = indexes.find(
      (index) =>
        indexKey(index) ===
        replacement.key,
    );

    if (!current) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const status = normalize(current?.status);
    const error = String(current?.error ?? "").trim();

    if (
      status === "" ||
      status === "available" ||
      status === "ready"
    ) {
      const actual =
        normalizedIndexDefinition(current);

      const expected =
        expectedIndexDefinition(replacement);

      const definitionsMatch =
        actual.type === expected.type &&
        valuesEqual(
          actual.columns,
          expected.columns,
        ) &&
        valuesEqual(
          actual.orders,
          expected.orders,
        );

      if (!definitionsMatch) {
        throw new Error(
          `Created index "${replacement.key}" has an unexpected definition.`,
        );
      }

      return;
    }

    if (
      status === "failed" ||
      status === "stuck"
    ) {
      throw new Error(
        `Index "${replacement.key}" failed: ${error || status}`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for index "${replacement.key}" to become available.`,
  );
}

function createExecutionState({
  backupDirectory,
  replacements,
}) {
  return {
    format:
      "single-school-schema-migration-state-v1",
    status: "ready",
    backupDirectory,
    retainedSchoolId: RETAINED_SCHOOL_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totals: {
      oldIndexes: EXPECTED_OLD_INDEXES,
      schoolColumns: EXPECTED_SCHOOL_COLUMNS,
      replacementIndexes:
        EXPECTED_REPLACEMENT_INDEXES,
    },
    deletedIndexes: [],
    deletedColumns: [],
    createdIndexes: [],
    replacements,
    failures: [],
  };
}

function operationKey(item) {
  return `${item.tableId}:${item.key}`;
}

async function main() {
  const args = parseArguments();

  const backupDirectory =
    args.backupDirectory ??
    (await latestPreparedBackup());

  const snapshotPath = path.join(
    backupDirectory,
    "complete-backend-snapshot.json",
  );

  const auditPath = path.join(
    backupDirectory,
    "single-school-migration-audit",
    "single-school-migration-audit.json",
  );

  const cleanupPath = path.join(
    backupDirectory,
    "single-school-cleanup-plan",
    "single-school-cleanup-plan.json",
  );

  const purgeStatePath = path.join(
    backupDirectory,
    "single-school-cleanup-plan",
    "purge-execution-state.json",
  );

  const outputDirectory = path.join(
    backupDirectory,
    "single-school-schema-migration",
  );

  const statePath = path.join(
    outputDirectory,
    "migration-state.json",
  );

  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  const [
    snapshot,
    audit,
    cleanup,
    purgeState,
  ] = await Promise.all([
    loadJson(snapshotPath),
    loadJson(auditPath),
    loadJson(cleanupPath),
    loadJson(purgeStatePath),
  ]);

  const replacements =
    buildReplacementIndexes(
      audit.schoolIndexes,
      snapshot,
    );

  validateMigrationInputs({
    audit,
    cleanup,
    purgeState,
    replacements,
  });

  let state = (await exists(statePath))
    ? await loadJson(statePath)
    : createExecutionState({
        backupDirectory,
        replacements,
      });

  state.replacements = replacements;
  state.updatedAt =
    new Date().toISOString();

  await atomicWriteJson(
    statePath,
    state,
  );

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

  const apiKey = requiredEnvironmentValue(
    "Appwrite API key",
    "APPWRITE_API_KEY",
    "APPWRITE_KEY",
    "APPWRITE_SERVER_API_KEY",
  );

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tablesDB = new TablesDB(client);

  console.log("");
  console.log(
    "SINGLE-SCHOOL SCHEMA MIGRATION",
  );
  console.log(
    "==============================",
  );
  console.log(
    `Backup:              ${backupDirectory}`,
  );
  console.log(
    `Old indexes:         ${EXPECTED_OLD_INDEXES}`,
  );
  console.log(
    `schoolId columns:    ${EXPECTED_SCHOOL_COLUMNS}`,
  );
  console.log(
    `Replacement indexes: ${EXPECTED_REPLACEMENT_INDEXES}`,
  );
  console.log(
    `Mode:                ${args.execute ? "EXECUTE" : "DRY RUN"}`,
  );

  const preflight = await runPreflight({
    tablesDB,
    databaseId,
    snapshot,
    cleanup,
    audit,
    replacements,
  });

  console.log("");
  console.log(
    "Preflight verification passed.",
  );
  console.log(
    `Old indexes currently present:      ${preflight.oldIndexesPresent}`,
  );
  console.log(
    `schoolId columns currently present: ${preflight.schoolColumnsPresent}`,
  );
  console.log(
    `Replacement indexes present:        ${preflight.replacementIndexesPresent}`,
  );

  if (!args.execute) {
    console.log("");
    console.log(
      "SCHEMA MIGRATION DRY RUN COMPLETE",
    );
    console.log(
      "No indexes or columns were changed.",
    );
    console.log("");
    console.log(
      "Execution confirmation: REMOVE_18_SCHOOLID_COLUMNS",
    );
    return;
  }

  if (
    args.confirmation !==
    "REMOVE_18_SCHOOLID_COLUMNS"
  ) {
    throw new Error(
      [
        "Execution requires the confirmation value REMOVE_18_SCHOOLID_COLUMNS.",
        `Received arguments: ${JSON.stringify(args.receivedArguments)}`,
        `Parsed confirmation: ${JSON.stringify(args.confirmation)}`,
      ].join("\n"),
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

  const deletedIndexKeys = new Set(
    asArray(state.deletedIndexes).map(
      operationKey,
    ),
  );

  const deletedColumnKeys = new Set(
    asArray(state.deletedColumns).map(
      operationKey,
    ),
  );

  const createdIndexKeys = new Set(
    asArray(state.createdIndexes).map(
      operationKey,
    ),
  );

  console.log("");
  console.log(
    "Phase 1/3: removing tenancy indexes...",
  );

  for (
    let index = 0;
    index < audit.schoolIndexes.length;
    index += 1
  ) {
    const item = audit.schoolIndexes[index];

    const operation = {
      tableId: String(item.tableId),
      tableName: String(item.tableName),
      key: String(item.indexName),
    };

    if (
      deletedIndexKeys.has(
        operationKey(operation),
      )
    ) {
      continue;
    }

    const liveIndexes = await listIndexes(
      tablesDB,
      databaseId,
      operation.tableId,
    );

    if (
      liveIndexes.some(
        (liveIndex) =>
          indexKey(liveIndex) ===
          operation.key,
      )
    ) {
      await deleteIndexResilient({
        tablesDB,
        databaseId,
        tableId: operation.tableId,
        key: operation.key,
      });

      await waitUntilIndexAbsent({
        tablesDB,
        databaseId,
        tableId: operation.tableId,
        key: operation.key,
      });
    }

    state.deletedIndexes.push({
      ...operation,
      completedAt:
        new Date().toISOString(),
    });

    state.updatedAt =
      new Date().toISOString();

    await atomicWriteJson(
      statePath,
      state,
    );

    process.stdout.write(
      `\r  ${index + 1}/${audit.schoolIndexes.length} indexes removed`,
    );
  }

  process.stdout.write("\n");

  console.log(
    "Phase 2/3: removing schoolId columns...",
  );

  for (
    let index = 0;
    index < audit.schoolColumns.length;
    index += 1
  ) {
    const item = audit.schoolColumns[index];

    const operation = {
      tableId: String(item.tableId),
      tableName: String(item.tableName),
      key: String(item.columnKey),
    };

    if (
      deletedColumnKeys.has(
        operationKey(operation),
      )
    ) {
      continue;
    }

    const liveColumns = await listColumns(
      tablesDB,
      databaseId,
      operation.tableId,
    );

    if (
      liveColumns.some(
        (column) =>
          columnKey(column) ===
          operation.key,
      )
    ) {
      await deleteColumnResilient({
        tablesDB,
        databaseId,
        tableId: operation.tableId,
        key: operation.key,
      });

      await waitUntilColumnAbsent({
        tablesDB,
        databaseId,
        tableId: operation.tableId,
        key: operation.key,
      });
    }

    state.deletedColumns.push({
      ...operation,
      completedAt:
        new Date().toISOString(),
    });

    state.updatedAt =
      new Date().toISOString();

    await atomicWriteJson(
      statePath,
      state,
    );

    process.stdout.write(
      `\r  ${index + 1}/${audit.schoolColumns.length} columns removed`,
    );
  }

  process.stdout.write("\n");

  console.log(
    "Phase 3/3: creating single-school indexes...",
  );

  for (
    let index = 0;
    index < replacements.length;
    index += 1
  ) {
    const replacement = replacements[index];

    if (
      createdIndexKeys.has(
        operationKey(replacement),
      )
    ) {
      continue;
    }

    const liveIndexes = await listIndexes(
      tablesDB,
      databaseId,
      replacement.tableId,
    );

    const existing = liveIndexes.find(
      (liveIndex) =>
        indexKey(liveIndex) ===
        replacement.key,
    );

    if (existing) {
      const actual =
        normalizedIndexDefinition(existing);

      const expected =
        expectedIndexDefinition(replacement);

      const definitionsMatch =
        actual.type === expected.type &&
        valuesEqual(
          actual.columns,
          expected.columns,
        ) &&
        valuesEqual(
          actual.orders,
          expected.orders,
        );

      if (!definitionsMatch) {
        throw new Error(
          `Index "${replacement.key}" already exists with a different definition.`,
        );
      }
    } else {
      console.log("");
      console.log(
        `Creating ${replacement.tableName}.${replacement.key}`,
      );
      console.log(
        `  columns: ${replacement.columns.join(", ")}`,
      );
      console.log(
        `  lengths: ${replacement.lengths.join(", ")}`,
      );

      const hasTextPrefixLength =
        replacement.lengths.some(
          (length) =>
            Number.isFinite(
              Number(length),
            ) &&
            Number(length) > 0,
        );

      const createIndexInput = {
        databaseId,
        tableId: replacement.tableId,
        key: replacement.key,
        type: replacement.type,
        columns: replacement.columns,
        orders: replacement.orders,
      };

      if (hasTextPrefixLength) {
        createIndexInput.lengths =
          replacement.lengths;
      }

      try {
        await createIndexResilient({
          tablesDB,
          databaseId,
          replacement,
          input: createIndexInput,
        });
      } catch (error) {
        throw new Error(
          [
            `Failed to create index "${replacement.tableName}.${replacement.key}".`,
            `Columns: ${replacement.columns.join(", ")}`,
            `Lengths: ${replacement.lengths.join(", ")}`,
            error instanceof Error
              ? error.message
              : String(error),
          ].join("\n"),
        );
      }

      await waitUntilIndexReady({
        tablesDB,
        databaseId,
        replacement,
      });
    }

    state.createdIndexes.push({
      ...replacement,
      completedAt:
        new Date().toISOString(),
    });

    state.updatedAt =
      new Date().toISOString();

    await atomicWriteJson(
      statePath,
      state,
    );

    process.stdout.write(
      `\r  ${index + 1}/${replacements.length} indexes created`,
    );
  }

  process.stdout.write("\n");

  const finalPreflight = await runPreflight({
    tablesDB,
    databaseId,
    snapshot,
    cleanup,
    audit,
    replacements,
  });

  if (
    finalPreflight.oldIndexesPresent !== 0 ||
    finalPreflight.schoolColumnsPresent !== 0 ||
    finalPreflight.replacementIndexesPresent !==
      EXPECTED_REPLACEMENT_INDEXES
  ) {
    throw new Error(
      [
        "Final schema verification did not match the expected single-school structure.",
        `Old tenancy indexes remaining: ${finalPreflight.oldIndexesPresent}`,
        `schoolId columns remaining: ${finalPreflight.schoolColumnsPresent}`,
        `Replacement indexes present: ${finalPreflight.replacementIndexesPresent}/${EXPECTED_REPLACEMENT_INDEXES}`,
      ].join("\n"),
    );
  }

  state.status = "complete";
  state.completedAt =
    new Date().toISOString();
  state.updatedAt =
    new Date().toISOString();

  await atomicWriteJson(
    statePath,
    state,
  );

  console.log("");
  console.log(
    "SINGLE-SCHOOL SCHEMA MIGRATION COMPLETE",
  );
  console.log(
    "=======================================",
  );
  console.log(
    `Removed tenancy indexes: ${state.deletedIndexes.length}`,
  );
  console.log(
    `Removed schoolId columns: ${state.deletedColumns.length}`,
  );
  console.log(
    `Created replacement indexes: ${state.createdIndexes.length}`,
  );
  console.log(
    `Retained rows: ${EXPECTED_RETAINED_ROWS}`,
  );
  console.log(
    `Migration log: ${statePath}`,
  );
}

await main();
