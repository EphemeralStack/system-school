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

const PAGE_SIZE = 100;

const DEFAULT_ENDPOINT =
  "https://syd.cloud.appwrite.io/v1";

const DEFAULT_PROJECT_ID =
  "6a466db90017775cb15a";

const DEFAULT_DATABASE_ID =
  "6a4679b4003a283bf7c5";

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
      `${label} is missing. Add one of these variables: ${names.join(", ")}`,
    );
  }

  return value;
}

function safeFileName(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unnamed";
}

function timestampForPath(date = new Date()) {
  return date
    .toISOString()
    .replace(/[:.]/g, "-");
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
}

function jsonText(value) {
  return `${JSON.stringify(value, jsonReplacer, 2)}\n`;
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, {
    recursive: true,
  });
}

async function writeJson(filePath, value) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(
    filePath,
    jsonText(value),
    "utf8",
  );
}

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);

  return crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");
}

function resourceId(resource, fallback = "") {
  return (
    resource?.$id ??
    resource?.id ??
    fallback
  );
}

function resourceName(resource, fallback = "") {
  return (
    resource?.name ??
    resource?.Name ??
    fallback
  );
}

async function listAll({
  label,
  responseKey,
  fetchPage,
}) {
  const collected = [];
  let offset = 0;
  let reportedTotal = null;

  while (true) {
    const response = await fetchPage([
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    const pageItems = Array.isArray(
      response?.[responseKey],
    )
      ? response[responseKey]
      : [];

    if (
      reportedTotal === null &&
      Number.isFinite(response?.total)
    ) {
      reportedTotal = response.total;
    }

    collected.push(...pageItems);

    process.stdout.write(
      `\r  ${label}: ${collected.length}${
        reportedTotal === null
          ? ""
          : `/${reportedTotal}`
      }`,
    );

    if (
      pageItems.length < PAGE_SIZE ||
      (
        reportedTotal !== null &&
        collected.length >= reportedTotal
      )
    ) {
      break;
    }

    offset += pageItems.length;
  }

  process.stdout.write("\n");

  if (
    reportedTotal !== null &&
    collected.length !== reportedTotal
  ) {
    throw new Error(
      `${label} backup is incomplete: expected ${reportedTotal}, received ${collected.length}.`,
    );
  }

  return {
    items: collected,
    total:
      reportedTotal ?? collected.length,
  };
}

function tableSummary({
  table,
  columns,
  indexes,
  rows,
}) {
  return {
    id: resourceId(table),
    name: resourceName(
      table,
      resourceId(table),
    ),
    enabled: table?.enabled,
    rowSecurity:
      table?.rowSecurity,
    permissions:
      table?.$permissions ??
      table?.permissions ??
      [],
    columnCount:
      columns.length,
    indexCount:
      indexes.length,
    rowCount:
      rows.length,
  };
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
      "SCHOOL_APPWRITE_SERVER_API_KEY",
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

  const startedAt = new Date();

  const backupRoot = path.resolve(
    "appwrite-backups",
    timestampForPath(startedAt),
  );

  const tablesRoot = path.join(
    backupRoot,
    "tables",
  );

  await ensureDirectory(tablesRoot);

  const incompleteMarker =
    path.join(
      backupRoot,
      ".INCOMPLETE",
    );

  await fs.writeFile(
    incompleteMarker,
    "This backup did not finish successfully.\n",
    "utf8",
  );

  console.log("");
  console.log(
    "Appwrite backend snapshot",
  );
  console.log(
    "=========================",
  );
  console.log(
    `Endpoint: ${endpoint}`,
  );
  console.log(
    `Project:  ${projectId}`,
  );
  console.log(
    `Database: ${databaseId}`,
  );
  console.log(
    `Output:   ${backupRoot}`,
  );
  console.log("");

  try {
    console.log(
      "Reading database metadata...",
    );

    const database =
      await tablesDB.get({
        databaseId,
      });

    console.log(
      "Reading all tables...",
    );

    const tableList =
      await listAll({
        label: "Tables",
        responseKey: "tables",
        fetchPage: (queries) =>
          tablesDB.listTables({
            databaseId,
            queries,
            total: true,
          }),
      });

    const combinedTables = [];
    const summaries = [];

    for (
      let index = 0;
      index < tableList.items.length;
      index += 1
    ) {
      const table =
        tableList.items[index];

      const tableId =
        resourceId(table);

      if (!tableId) {
        throw new Error(
          `Table ${index + 1} has no ID.`,
        );
      }

      const tableName =
        resourceName(
          table,
          tableId,
        );

      console.log("");
      console.log(
        `[${index + 1}/${tableList.items.length}] ${tableName} (${tableId})`,
      );

      const [
        columnList,
        indexList,
        rowList,
      ] = await Promise.all([
        listAll({
          label: "Columns",
          responseKey: "columns",
          fetchPage: (queries) =>
            tablesDB.listColumns({
              databaseId,
              tableId,
              queries,
              total: true,
            }),
        }),

        listAll({
          label: "Indexes",
          responseKey: "indexes",
          fetchPage: (queries) =>
            tablesDB.listIndexes({
              databaseId,
              tableId,
              queries,
              total: true,
            }),
        }),

        listAll({
          label: "Rows",
          responseKey: "rows",
          fetchPage: (queries) =>
            tablesDB.listRows({
              databaseId,
              tableId,
              queries,
              total: true,
              ttl: 0,
            }),
        }),
      ]);

      const tableBackup = {
        table,
        columns:
          columnList.items,
        indexes:
          indexList.items,
        rows:
          rowList.items,
      };

      const directoryName =
        `${String(index + 1).padStart(2, "0")}-${safeFileName(tableId)}`;

      const tableDirectory =
        path.join(
          tablesRoot,
          directoryName,
        );

      await Promise.all([
        writeJson(
          path.join(
            tableDirectory,
            "table.json",
          ),
          table,
        ),

        writeJson(
          path.join(
            tableDirectory,
            "columns.json",
          ),
          columnList.items,
        ),

        writeJson(
          path.join(
            tableDirectory,
            "indexes.json",
          ),
          indexList.items,
        ),

        writeJson(
          path.join(
            tableDirectory,
            "rows.json",
          ),
          rowList.items,
        ),

        writeJson(
          path.join(
            tableDirectory,
            "complete-table-backup.json",
          ),
          tableBackup,
        ),
      ]);

      combinedTables.push(
        tableBackup,
      );

      summaries.push(
        tableSummary({
          table,
          columns:
            columnList.items,
          indexes:
            indexList.items,
          rows:
            rowList.items,
        }),
      );
    }

    const finishedAt =
      new Date();

    const totalRows =
      summaries.reduce(
        (sum, table) =>
          sum + table.rowCount,
        0,
      );

    const totalColumns =
      summaries.reduce(
        (sum, table) =>
          sum + table.columnCount,
        0,
      );

    const totalIndexes =
      summaries.reduce(
        (sum, table) =>
          sum + table.indexCount,
        0,
      );

    const manifest = {
      format:
        "school-management-suite-appwrite-backup-v1",
      createdAt:
        startedAt.toISOString(),
      completedAt:
        finishedAt.toISOString(),
      endpoint,
      projectId,
      databaseId,
      totals: {
        tables:
          summaries.length,
        columns:
          totalColumns,
        indexes:
          totalIndexes,
        rows:
          totalRows,
      },
      tables:
        summaries,
    };

    const snapshot = {
      manifest,
      database,
      tables:
        combinedTables,
    };

    await writeJson(
      path.join(
        backupRoot,
        "database.json",
      ),
      database,
    );

    await writeJson(
      path.join(
        backupRoot,
        "manifest.json",
      ),
      manifest,
    );

    await writeJson(
      path.join(
        backupRoot,
        "complete-backend-snapshot.json",
      ),
      snapshot,
    );

    const filesToChecksum = [];

    async function collectFiles(
      directoryPath,
    ) {
      const entries =
        await fs.readdir(
          directoryPath,
          {
            withFileTypes: true,
          },
        );

      for (const entry of entries) {
        const entryPath =
          path.join(
            directoryPath,
            entry.name,
          );

        if (entry.isDirectory()) {
          await collectFiles(
            entryPath,
          );
          continue;
        }

        if (
          entry.name !==
            ".INCOMPLETE" &&
          entry.name !==
            "checksums.sha256"
        ) {
          filesToChecksum.push(
            entryPath,
          );
        }
      }
    }

    await collectFiles(
      backupRoot,
    );

    filesToChecksum.sort();

    const checksumLines = [];

    for (
      const filePath of filesToChecksum
    ) {
      const hash =
        await sha256File(
          filePath,
        );

      const relativePath =
        path
          .relative(
            backupRoot,
            filePath,
          )
          .replaceAll("\\", "/");

      checksumLines.push(
        `${hash}  ${relativePath}`,
      );
    }

    await fs.writeFile(
      path.join(
        backupRoot,
        "checksums.sha256",
      ),
      `${checksumLines.join("\n")}\n`,
      "utf8",
    );

    await fs.rm(
      incompleteMarker,
      {
        force: true,
      },
    );

    console.log("");
    console.log(
      "BACKUP COMPLETE",
    );
    console.log(
      "===============",
    );
    console.log(
      `Tables:  ${summaries.length}`,
    );
    console.log(
      `Columns: ${totalColumns}`,
    );
    console.log(
      `Indexes: ${totalIndexes}`,
    );
    console.log(
      `Rows:    ${totalRows}`,
    );
    console.log(
      `Folder:  ${backupRoot}`,
    );
    console.log("");
    console.log(
      "Do not commit this backup folder to GitHub.",
    );
  } catch (error) {
    const failure = {
      failedAt:
        new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : String(error),
      stack:
        error instanceof Error
          ? error.stack
          : undefined,
    };

    await writeJson(
      path.join(
        backupRoot,
        "backup-error.json",
      ),
      failure,
    );

    console.error("");
    console.error(
      "BACKUP FAILED",
    );
    console.error(
      "=============",
    );
    console.error(
      failure.message,
    );
    console.error(
      `Incomplete output: ${backupRoot}`,
    );

    process.exitCode = 1;
  }
}

await main();
