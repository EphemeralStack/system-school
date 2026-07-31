import crypto from "node:crypto";
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

const DEFAULT_ENDPOINT =
  "https://syd.cloud.appwrite.io/v1";

const DEFAULT_PROJECT_ID =
  "6a466db90017775cb15a";

const DEFAULT_DATABASE_ID =
  "6a4679b4003a283bf7c5";

const USERS_TABLE_ID =
  "6a467bca0028aa4c101d";

const ROLE_TABLES = {
  student: "6a468f3d0024a2d9e1f5",
  teacher: "6a468fef0015ef8b6700",
  applicant: "6a468d4900055d1414a3",
};

const EXPECTED_MISSING_AUTH_COUNT = 7;

const EXPECTED_PROFILE_IDS = new Set([
  "6a53c5ef003b2fad9aac",
  "6a53c86f002347941a89",
  "6a53c8df000c3f64949a",
  "6a57e366001b99955a56",
  "6a57e3cd00362b69a7ff",
  "6a57e42c000bd04fe210",
  "6a59e2bc003876483bd0",
]);

const CONFIRMATION =
  "CREATE_7_AUTH_ACCOUNTS";

const PAGE_SIZE = 100;

const OUTPUT_DIRECTORY = path.resolve(
  "appwrite-auth-provisioning",
  "single-school-seven-users",
);

const STATE_PATH = path.join(
  OUTPUT_DIRECTORY,
  "provisioning-state.json",
);

const CREDENTIALS_JSON_PATH = path.join(
  OUTPUT_DIRECTORY,
  "temporary-credentials.json",
);

const CREDENTIALS_CSV_PATH = path.join(
  OUTPUT_DIRECTORY,
  "temporary-credentials.csv",
);

const REPORT_PATH = path.join(
  OUTPUT_DIRECTORY,
  "provisioning-report.json",
);

function firstEnvironmentValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

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
  return Array.isArray(value)
    ? value
    : [];
}

function rowId(row) {
  return String(
    row?.$id ??
      row?.id ??
      "",
  ).trim();
}

function parseArguments() {
  const rawArguments =
    process.argv.slice(2);

  const argumentsNormalized =
    rawArguments.map((argument) =>
      String(argument)
        .trim()
        .replace(
          /[\u2010-\u2015\u2212]/g,
          "-",
        ),
    );

  let execute = false;
  let confirmation = "";

  for (
    let index = 0;
    index < argumentsNormalized.length;
    index += 1
  ) {
    const argument =
      argumentsNormalized[index];

    if (argument === "--execute") {
      execute = true;
      continue;
    }

    if (
      argument.startsWith(
        "--confirm=",
      )
    ) {
      confirmation =
        argument
          .slice(
            "--confirm=".length,
          )
          .trim();

      continue;
    }

    if (argument === "--confirm") {
      confirmation =
        argumentsNormalized[
          index + 1
        ] ?? "";

      index += 1;
      continue;
    }

    if (argument === CONFIRMATION) {
      confirmation = argument;
    }
  }

  return {
    execute,
    confirmation,
    rawArguments,
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function statusCode(error) {
  const value = Number(
    error?.code ??
      error?.status ??
      0,
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

function networkCode(error) {
  return String(
    error?.cause?.code ??
      error?.code ??
      "",
  ).trim();
}

function isNotFound(error) {
  return (
    statusCode(error) === 404 ||
    String(
      error?.type ?? "",
    ).includes("not_found")
  );
}

function isConflict(error) {
  return statusCode(error) === 409;
}

function isTransient(error) {
  const code = networkCode(error);
  const status = statusCode(error);

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
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ].includes(code) ||
    message.includes("fetch failed") ||
    message.includes("connect timeout") ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

async function retry(
  label,
  operation,
) {
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
        2000 *
          2 ** (attempt - 1),
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
  await fs.mkdir(
    path.dirname(filePath),
    {
      recursive: true,
    },
  );

  const temporaryPath =
    `${filePath}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(
      value,
      null,
      2,
    )}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  await fs.rename(
    temporaryPath,
    filePath,
  );

  try {
    await fs.chmod(
      filePath,
      0o600,
    );
  } catch {
    // Windows may not enforce POSIX file modes.
  }
}

async function loadJson(filePath) {
  return JSON.parse(
    await fs.readFile(
      filePath,
      "utf8",
    ),
  );
}

function csvEscape(value) {
  const text = String(
    value ?? "",
  );

  return `"${text.replaceAll(
    '"',
    '""',
  )}"`;
}

async function writeCredentialsCsv(
  credentials,
) {
  const header = [
    "userId",
    "role",
    "fullName",
    "email",
    "temporaryPassword",
    "mustChangePassword",
  ];

  const lines = [
    header
      .map(csvEscape)
      .join(","),
  ];

  for (const credential of credentials) {
    lines.push(
      [
        credential.userId,
        credential.role,
        credential.fullName,
        credential.email,
        credential.temporaryPassword,
        "true",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  await fs.mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    CREDENTIALS_CSV_PATH,
    `${lines.join("\n")}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  try {
    await fs.chmod(
      CREDENTIALS_CSV_PATH,
      0o600,
    );
  } catch {
    // Windows may not enforce POSIX file modes.
  }
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
      Number.isFinite(
        response?.total,
      )
    ) {
      total = response.total;
    }

    items.push(...page);

    if (
      page.length < PAGE_SIZE ||
      (
        total !== null &&
        items.length >= total
      )
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
      `Incomplete ${responseKey} response: expected ${total}, received ${items.length}.`,
    );
  }

  return items;
}

async function listRows({
  tablesDB,
  databaseId,
  tableId,
}) {
  return listAll({
    responseKey: "rows",
    fetchPage: (queries) =>
      tablesDB.listRows({
        databaseId,
        tableId,
        queries,
        total: true,
        ttl: 0,
      }),
  });
}

async function listAuthUsers(users) {
  return listAll({
    responseKey: "users",
    fetchPage: (queries) =>
      users.list({
        queries,
        total: true,
      }),
  });
}

async function getAuthUserOrNull(
  users,
  userId,
) {
  try {
    return await retry(
      `Reading Auth user ${userId}`,
      () =>
        users.get({
          userId,
        }),
    );
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

function fullName(profile) {
  return [
    profile.FirstName,
    profile.LastName,
  ]
    .map((value) =>
      String(value ?? "").trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function roleForProfile(profile) {
  return normalize(profile.Role);
}

function prefsForProfile(profile) {
  return {
    Role:
      roleForProfile(profile),
    FirstName:
      String(
        profile.FirstName ?? "",
      ).trim(),
    LastName:
      String(
        profile.LastName ?? "",
      ).trim(),
    phone:
      String(
        profile.Phone ?? "",
      ).trim(),
    avatar:
      String(
        profile.avatar ?? "",
      ).trim(),
    mustChangePassword:
      true,
  };
}

function generateStrongPassword(
  length = 24,
) {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const digits =
    "23456789";

  const symbols =
    "!@#$%^&*_-+=";

  const all =
    uppercase +
    lowercase +
    digits +
    symbols;

  function randomCharacter(
    characters,
  ) {
    const index =
      crypto.randomInt(
        0,
        characters.length,
      );

    return characters[index];
  }

  const characters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(digits),
    randomCharacter(symbols),
  ];

  while (
    characters.length < length
  ) {
    characters.push(
      randomCharacter(all),
    );
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      crypto.randomInt(
        0,
        index + 1,
      );

    [
      characters[index],
      characters[swapIndex],
    ] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

async function inspectLiveState({
  tablesDB,
  users,
  databaseId,
}) {
  const [
    profiles,
    authUsers,
    studentRows,
    teacherRows,
    applicantRows,
  ] = await Promise.all([
    listRows({
      tablesDB,
      databaseId,
      tableId:
        USERS_TABLE_ID,
    }),
    listAuthUsers(users),
    listRows({
      tablesDB,
      databaseId,
      tableId:
        ROLE_TABLES.student,
    }),
    listRows({
      tablesDB,
      databaseId,
      tableId:
        ROLE_TABLES.teacher,
    }),
    listRows({
      tablesDB,
      databaseId,
      tableId:
        ROLE_TABLES.applicant,
    }),
  ]);

  const authById = new Map(
    authUsers.map((user) => [
      rowId(user),
      user,
    ]),
  );

  const authByEmail = new Map(
    authUsers
      .filter((user) =>
        normalize(user.email),
      )
      .map((user) => [
        normalize(user.email),
        user,
      ]),
  );

  const missingAuthProfiles =
    profiles.filter(
      (profile) =>
        !authById.has(
          rowId(profile),
        ),
    );

  const actualMissingIds =
    new Set(
      missingAuthProfiles.map(rowId),
    );

  if (
    missingAuthProfiles.length !==
    EXPECTED_MISSING_AUTH_COUNT
  ) {
    throw new Error(
      `Expected ${EXPECTED_MISSING_AUTH_COUNT} profiles without Auth accounts, but found ${missingAuthProfiles.length}.`,
    );
  }

  if (
    actualMissingIds.size !==
    EXPECTED_PROFILE_IDS.size ||
    [...EXPECTED_PROFILE_IDS].some(
      (id) =>
        !actualMissingIds.has(id),
    )
  ) {
    throw new Error(
      [
        "The missing profile IDs no longer match the verified repair report.",
        `Expected: ${[...EXPECTED_PROFILE_IDS].join(", ")}`,
        `Actual: ${[...actualMissingIds].join(", ")}`,
      ].join("\n"),
    );
  }

  const roleRows = {
    student: studentRows,
    teacher: teacherRows,
    applicant: applicantRows,
  };

  const plan = missingAuthProfiles.map(
    (profile) => {
      const userId = rowId(profile);
      const role =
        roleForProfile(profile);

      if (
        !Object.prototype.hasOwnProperty.call(
          ROLE_TABLES,
          role,
        )
      ) {
        throw new Error(
          `Unsupported role "${profile.Role}" for ${userId}.`,
        );
      }

      const email =
        normalize(profile.Email);

      if (!email) {
        throw new Error(
          `Profile ${userId} has no email address.`,
        );
      }

      const conflictingAuth =
        authByEmail.get(email);

      if (
        conflictingAuth &&
        rowId(conflictingAuth) !== userId
      ) {
        throw new Error(
          `Email ${profile.Email} is already used by Auth user ${rowId(conflictingAuth)}.`,
        );
      }

      const matchingRoleRows =
        roleRows[role].filter(
          (roleRow) =>
            String(
              roleRow.userId ?? "",
            ).trim() === userId,
        );

      if (
        matchingRoleRows.length !== 1
      ) {
        throw new Error(
          `Expected exactly one ${role} role row for ${userId}, but found ${matchingRoleRows.length}.`,
        );
      }

      return {
        userId,
        role,
        fullName:
          fullName(profile),
        email:
          String(
            profile.Email,
          ).trim(),
        phone:
          String(
            profile.Phone ?? "",
          ).trim(),
        avatar:
          String(
            profile.avatar ?? "",
          ).trim(),
        profile,
        roleRowId:
          rowId(
            matchingRoleRows[0],
          ),
      };
    },
  );

  const emailSet = new Set();

  for (const account of plan) {
    const email =
      normalize(account.email);

    if (emailSet.has(email)) {
      throw new Error(
        `Duplicate profile email in provisioning plan: ${account.email}`,
      );
    }

    emailSet.add(email);
  }

  plan.sort((left, right) => {
    const roleComparison =
      left.role.localeCompare(
        right.role,
      );

    if (roleComparison !== 0) {
      return roleComparison;
    }

    return left.fullName.localeCompare(
      right.fullName,
    );
  });

  return {
    profiles,
    authUsers,
    authById,
    plan,
  };
}

function publicPlan(plan) {
  return plan.map((account) => ({
    userId:
      account.userId,
    role:
      account.role,
    fullName:
      account.fullName,
    email:
      account.email,
    roleRowId:
      account.roleRowId,
  }));
}

async function loadOrCreateCredentials(
  plan,
) {
  let credentials = [];

  if (
    await exists(
      CREDENTIALS_JSON_PATH,
    )
  ) {
    credentials =
      await loadJson(
        CREDENTIALS_JSON_PATH,
      );
  }

  const byUserId = new Map(
    asArray(credentials).map(
      (credential) => [
        credential.userId,
        credential,
      ],
    ),
  );

  for (const account of plan) {
    const existing =
      byUserId.get(
        account.userId,
      );

    if (existing) {
      if (
        normalize(existing.email) !==
          normalize(account.email) ||
        normalize(existing.role) !==
          normalize(account.role)
      ) {
        throw new Error(
          `Stored credentials for ${account.userId} no longer match the live profile.`,
        );
      }

      continue;
    }

    const credential = {
      userId:
        account.userId,
      role:
        account.role,
      fullName:
        account.fullName,
      email:
        account.email,
      temporaryPassword:
        generateStrongPassword(),
      mustChangePassword:
        true,
      generatedAt:
        new Date().toISOString(),
    };

    credentials.push(
      credential,
    );

    byUserId.set(
      account.userId,
      credential,
    );
  }

  credentials = credentials.filter(
    (credential) =>
      plan.some(
        (account) =>
          account.userId ===
          credential.userId,
      ),
  );

  credentials.sort(
    (left, right) =>
      left.fullName.localeCompare(
        right.fullName,
      ),
  );

  await atomicWriteJson(
    CREDENTIALS_JSON_PATH,
    credentials,
  );

  await writeCredentialsCsv(
    credentials,
  );

  return credentials;
}

function createState(plan) {
  return {
    format:
      "single-school-auth-provisioning-state-v1",
    status:
      "ready",
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    planned:
      publicPlan(plan),
    completed: [],
    failures: [],
  };
}

async function provisionOne({
  users,
  account,
  credential,
}) {
  let authUser =
    await getAuthUserOrNull(
      users,
      account.userId,
    );

  if (!authUser) {
    try {
      authUser = await retry(
        `Creating Auth user ${account.email}`,
        () =>
          users.create({
            userId:
              account.userId,
            email:
              account.email,
            password:
              credential.temporaryPassword,
            name:
              account.fullName,
          }),
      );
    } catch (error) {
      if (
        isConflict(error) ||
        isTransient(error)
      ) {
        authUser =
          await getAuthUserOrNull(
            users,
            account.userId,
          );
      }

      if (!authUser) {
        throw error;
      }
    }
  }

  if (
    normalize(authUser.email) !==
    normalize(account.email)
  ) {
    throw new Error(
      `Auth user ${account.userId} has email ${authUser.email}, expected ${account.email}.`,
    );
  }

  await retry(
    `Updating preferences for ${account.email}`,
    () =>
      users.updatePrefs({
        userId:
          account.userId,
        prefs:
          prefsForProfile(
            account.profile,
          ),
      }),
  );

  await retry(
    `Updating labels for ${account.email}`,
    () =>
      users.updateLabels({
        userId:
          account.userId,
        labels: [
          account.role,
        ],
      }),
  );

  return await getAuthUserOrNull(
    users,
    account.userId,
  );
}

async function verifyFinalState({
  tablesDB,
  users,
  databaseId,
  plan,
}) {
  const [
    profiles,
    authUsers,
  ] = await Promise.all([
    listRows({
      tablesDB,
      databaseId,
      tableId:
        USERS_TABLE_ID,
    }),
    listAuthUsers(users),
  ]);

  const authById = new Map(
    authUsers.map((user) => [
      rowId(user),
      user,
    ]),
  );

  const profilesWithoutAuth =
    profiles.filter(
      (profile) =>
        !authById.has(
          rowId(profile),
        ),
    );

  if (
    profilesWithoutAuth.length > 0
  ) {
    throw new Error(
      `Profiles still missing Auth accounts: ${profilesWithoutAuth.map(rowId).join(", ")}`,
    );
  }

  for (const account of plan) {
    const authUser =
      authById.get(
        account.userId,
      );

    if (!authUser) {
      throw new Error(
        `Auth user ${account.userId} was not created.`,
      );
    }

    if (
      normalize(authUser.email) !==
      normalize(account.email)
    ) {
      throw new Error(
        `Email mismatch for ${account.userId}.`,
      );
    }

    const labels =
      asArray(
        authUser.labels,
      ).map(normalize);

    if (
      !labels.includes(
        account.role,
      )
    ) {
      throw new Error(
        `Role label is missing for ${account.userId}.`,
      );
    }

    const prefs =
      authUser.prefs ?? {};

    if (
      normalize(prefs.Role) !==
      account.role
    ) {
      throw new Error(
        `Role preference is missing for ${account.userId}.`,
      );
    }
  }

  return {
    authUserCount:
      authUsers.length,
    profileCount:
      profiles.length,
    profilesWithoutAuth:
      profilesWithoutAuth.length,
    newlyProvisioned:
      plan.length,
  };
}

async function main() {
  const argumentsResult =
    parseArguments();

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

  const users =
    new Users(client);

  console.log("");
  console.log(
    "SINGLE-SCHOOL AUTH PROVISIONING",
  );
  console.log(
    "===============================",
  );
  console.log(
    `Mode: ${argumentsResult.execute ? "EXECUTE" : "DRY RUN"}`,
  );

  const inspection =
    await inspectLiveState({
      tablesDB,
      users,
      databaseId,
    });

  console.log(
    `Profiles:                      ${inspection.profiles.length}`,
  );
  console.log(
    `Existing Auth users:           ${inspection.authUsers.length}`,
  );
  console.log(
    `Auth accounts to create:       ${inspection.plan.length}`,
  );
  console.log("");

  for (const account of inspection.plan) {
    console.log(
      `  ${account.role.padEnd(9)} ${account.fullName} <${account.email}>`,
    );
  }

  if (!argumentsResult.execute) {
    console.log("");
    console.log(
      "AUTH PROVISIONING DRY RUN COMPLETE",
    );
    console.log(
      "No Auth accounts were created.",
    );
    console.log("");
    console.log(
      `Execution confirmation: ${CONFIRMATION}`,
    );

    return;
  }

  if (
    argumentsResult.confirmation !==
    CONFIRMATION
  ) {
    throw new Error(
      [
        `Execution requires ${CONFIRMATION}.`,
        `Received arguments: ${JSON.stringify(argumentsResult.rawArguments)}`,
      ].join("\n"),
    );
  }

  await fs.mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  );

  const credentials =
    await loadOrCreateCredentials(
      inspection.plan,
    );

  const credentialsByUserId =
    new Map(
      credentials.map(
        (credential) => [
          credential.userId,
          credential,
        ],
      ),
    );

  let state =
    await exists(STATE_PATH)
      ? await loadJson(STATE_PATH)
      : createState(
          inspection.plan,
        );

  const completedIds =
    new Set(
      asArray(
        state.completed,
      ).map(
        (item) =>
          item.userId,
      ),
    );

  state.status = "running";
  state.startedAt ??=
    new Date().toISOString();
  state.updatedAt =
    new Date().toISOString();

  await atomicWriteJson(
    STATE_PATH,
    state,
  );

  for (
    let index = 0;
    index <
    inspection.plan.length;
    index += 1
  ) {
    const account =
      inspection.plan[index];

    const credential =
      credentialsByUserId.get(
        account.userId,
      );

    if (!credential) {
      throw new Error(
        `Temporary credentials are missing for ${account.userId}.`,
      );
    }

    if (
      completedIds.has(
        account.userId,
      )
    ) {
      const existing =
        await getAuthUserOrNull(
          users,
          account.userId,
        );

      if (existing) {
        console.log(
          `[${index + 1}/${inspection.plan.length}] already complete: ${account.email}`,
        );

        continue;
      }
    }

    try {
      const authUser =
        await provisionOne({
          users,
          account,
          credential,
        });

      state.completed =
        asArray(
          state.completed,
        ).filter(
          (item) =>
            item.userId !==
            account.userId,
        );

      state.completed.push({
        userId:
          account.userId,
        email:
          account.email,
        role:
          account.role,
        authCreatedAt:
          authUser?.$createdAt ??
          null,
        completedAt:
          new Date().toISOString(),
      });

      state.failures =
        asArray(
          state.failures,
        ).filter(
          (item) =>
            item.userId !==
            account.userId,
        );

      state.updatedAt =
        new Date().toISOString();

      await atomicWriteJson(
        STATE_PATH,
        state,
      );

      console.log(
        `[${index + 1}/${inspection.plan.length}] created: ${account.email}`,
      );
    } catch (error) {
      state.status = "failed";

      state.failures =
        asArray(
          state.failures,
        ).filter(
          (item) =>
            item.userId !==
            account.userId,
        );

      state.failures.push({
        userId:
          account.userId,
        email:
          account.email,
        role:
          account.role,
        failedAt:
          new Date().toISOString(),
        message:
          error instanceof Error
            ? error.message
            : String(error),
      });

      state.updatedAt =
        new Date().toISOString();

      await atomicWriteJson(
        STATE_PATH,
        state,
      );

      throw new Error(
        [
          `Provisioning failed for ${account.email}.`,
          error instanceof Error
            ? error.message
            : String(error),
          `Progress was saved to ${STATE_PATH}.`,
          "Run the same execute command again to resume safely.",
        ].join("\n"),
      );
    }
  }

  const verification =
    await verifyFinalState({
      tablesDB,
      users,
      databaseId,
      plan:
        inspection.plan,
    });

  state.status = "complete";
  state.completedAt =
    new Date().toISOString();
  state.updatedAt =
    new Date().toISOString();
  state.verification =
    verification;

  await atomicWriteJson(
    STATE_PATH,
    state,
  );

  const report = {
    completedAt:
      new Date().toISOString(),
    projectId,
    databaseId,
    verification,
    provisionedUsers:
      publicPlan(
        inspection.plan,
      ),
    credentialsJsonPath:
      CREDENTIALS_JSON_PATH,
    credentialsCsvPath:
      CREDENTIALS_CSV_PATH,
    statePath:
      STATE_PATH,
  };

  await atomicWriteJson(
    REPORT_PATH,
    report,
  );

  console.log("");
  console.log(
    "AUTH PROVISIONING COMPLETE",
  );
  console.log(
    "==========================",
  );
  console.log(
    `New Auth accounts:          ${verification.newlyProvisioned}`,
  );
  console.log(
    `Total Auth users:           ${verification.authUserCount}`,
  );
  console.log(
    `Database profiles:          ${verification.profileCount}`,
  );
  console.log(
    `Profiles without Auth:      ${verification.profilesWithoutAuth}`,
  );
  console.log(
    `Temporary credentials CSV:  ${CREDENTIALS_CSV_PATH}`,
  );
  console.log(
    `Provisioning report:        ${REPORT_PATH}`,
  );
  console.log("");
  console.log(
    "Keep the temporary credentials private and do not commit this folder.",
  );
}

await main();
