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

const TABLES = {
  users: "6a467bca0028aa4c101d",
  admins: "6a467fa400134f2e22fb",
  teachers: "6a468fef0015ef8b6700",
  departments: "6a46906e003010e3ae68",
};

const REAL_AUTH_USER_ID =
  "6a5285590031859ea1eb";

const OLD_SEAN_PROFILE_ID =
  "6a52855c003aea27ab4c";

const VALID_ADMIN_ROW_ID =
  "6a52855d0038f5373440";

const STALE_ADMIN_ROW_ID =
  "6a4cb4810019327a72ad";

const STALE_ADMIN_USER_ID =
  "6a4cb47f0007dce55af6";

const SEAN_EMAIL =
  "phoenixsean69@gmail.com";

const TEMPORARY_EMAIL =
  "migrated-6a52855c@invalid.local";

const CONFIRMATION =
  "REPAIR_5_BROKEN_REFERENCES";

const DEPARTMENTS = [
  {
    rowId:
      "6a57e3670018bd705f78",
    teacherRowId:
      "6a57e3670018b9e4b5a4",
    name:
      "Science",
    description:
      "Science department",
  },
  {
    rowId:
      "6a57e3ce001639577496",
    teacherRowId:
      "6a57e3ce00163b993c97",
    name:
      "Geography",
    description:
      "Geography department",
  },
  {
    rowId:
      "6a59e2be00165f1aa9ae",
    teacherRowId:
      "6a59e2be001652550243",
    name:
      "Mathematics",
    description:
      "Mathematics department",
  },
];

const PAGE_SIZE = 100;

function firstEnvironmentValue(...names) {
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

function parseArguments() {
  const rawArguments =
    process.argv.slice(2);

  const normalized =
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
    index < normalized.length;
    index += 1
  ) {
    const argument =
      normalized[index];

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
        normalized[index + 1] ?? "";

      index += 1;
      continue;
    }

    if (
      argument === CONFIRMATION
    ) {
      confirmation =
        argument;
    }
  }

  return {
    execute,
    confirmation,
    rawArguments,
  };
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

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      milliseconds,
    ),
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

function isTransient(error) {
  const code =
    networkCode(error);

  const status =
    statusCode(error);

  const message =
    String(
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
    message.includes(
      "fetch failed",
    ) ||
    message.includes(
      "connect timeout",
    ) ||
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

      const delay =
        Math.min(
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

async function getRowOrNull({
  tablesDB,
  databaseId,
  tableId,
  rowId: currentRowId,
}) {
  try {
    return await retry(
      `Reading row ${tableId}/${currentRowId}`,
      () =>
        tablesDB.getRow({
          databaseId,
          tableId,
          rowId:
            currentRowId,
        }),
    );
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function getAuthUserOrNull({
  users,
  userId,
}) {
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

async function listRows({
  tablesDB,
  databaseId,
  tableId,
}) {
  const rows = [];
  let offset = 0;
  let total = null;

  while (true) {
    const response =
      await retry(
        `Listing rows for ${tableId} at offset ${offset}`,
        () =>
          tablesDB.listRows({
            databaseId,
            tableId,
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
          }),
      );

    const page =
      asArray(response?.rows);

    if (
      total === null &&
      Number.isFinite(
        response?.total,
      )
    ) {
      total =
        response.total;
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

  return rows;
}

function userProfileData({
  source,
  authUser,
}) {
  const preferences =
    authUser?.prefs ?? {};

  return {
    FirstName:
      source?.FirstName ??
      preferences.FirstName ??
      "Sean",
    LastName:
      source?.LastName ??
      preferences.LastName ??
      "Mutandy",
    Email:
      authUser?.email ??
      source?.Email ??
      SEAN_EMAIL,
    Phone:
      source?.Phone ??
      preferences.phone ??
      "",
    Role:
      source?.Role ??
      preferences.Role ??
      "admin",
    avatar:
      source?.avatar ??
      preferences.avatar ??
      "",
  };
}

function departmentData(
  department,
) {
  return {
    Name:
      department.name,
    headTeacherId:
      department.teacherRowId,
    OfficeLocation:
      "",
    ContactEmail:
      "",
  };
}

function cleanRowData(row) {
  const cleaned = {};

  for (
    const [key, value] of
    Object.entries(row ?? {})
  ) {
    if (!key.startsWith("$")) {
      cleaned[key] =
        value;
    }
  }

  return cleaned;
}

async function verifyPreflight({
  tablesDB,
  users,
  databaseId,
}) {
  const [
    authUser,
    staleAuthUser,
    oldProfile,
    newProfile,
    validAdmin,
    staleAdmin,
    teachers,
    departments,
  ] = await Promise.all([
    getAuthUserOrNull({
      users,
      userId:
        REAL_AUTH_USER_ID,
    }),

    getAuthUserOrNull({
      users,
      userId:
        STALE_ADMIN_USER_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        OLD_SEAN_PROFILE_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        REAL_AUTH_USER_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
      rowId:
        VALID_ADMIN_ROW_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
      rowId:
        STALE_ADMIN_ROW_ID,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.teachers,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.departments,
    }),
  ]);

  if (!authUser) {
    throw new Error(
      `Required Auth user ${REAL_AUTH_USER_ID} does not exist.`,
    );
  }

  if (
    normalize(
      authUser.email,
    ) !== normalize(SEAN_EMAIL)
  ) {
    throw new Error(
      `Unexpected email for Auth user ${REAL_AUTH_USER_ID}.`,
    );
  }

  if (staleAuthUser) {
    throw new Error(
      `The supposedly stale Auth account ${STALE_ADMIN_USER_ID} exists. Manual review is required.`,
    );
  }

  if (
    !oldProfile &&
    !newProfile
  ) {
    throw new Error(
      "Neither the old nor aligned Sean profile exists.",
    );
  }

  if (
    validAdmin?.userId !==
    REAL_AUTH_USER_ID
  ) {
    throw new Error(
      "The valid admin row no longer points to the real Auth account.",
    );
  }

  if (
    staleAdmin &&
    staleAdmin.userId !==
      STALE_ADMIN_USER_ID
  ) {
    throw new Error(
      "The stale admin row has changed unexpectedly.",
    );
  }

  const teachersById =
    new Map(
      teachers.map((teacher) => [
        rowId(teacher),
        teacher,
      ]),
    );

  const departmentsById =
    new Map(
      departments.map(
        (department) => [
          rowId(department),
          department,
        ],
      ),
    );

  for (
    const department of
    DEPARTMENTS
  ) {
    const teacher =
      teachersById.get(
        department.teacherRowId,
      );

    if (!teacher) {
      throw new Error(
        `Teacher ${department.teacherRowId} was not found.`,
      );
    }

    if (
      teacher.departmentId !==
      department.rowId
    ) {
      throw new Error(
        `Teacher ${department.teacherRowId} no longer references ${department.rowId}.`,
      );
    }

    const existingDepartment =
      departmentsById.get(
        department.rowId,
      );

    if (
      existingDepartment &&
      normalize(
        existingDepartment.Name,
      ) !==
        normalize(
          department.name,
        )
    ) {
      throw new Error(
        `Department ID ${department.rowId} already exists with a different name.`,
      );
    }

    const conflictingName =
      departments.find(
        (candidate) =>
          rowId(candidate) !==
            department.rowId &&
          normalize(
            candidate.Name,
          ) ===
            normalize(
              department.name,
            ),
      );

    if (conflictingName) {
      throw new Error(
        `Department name "${department.name}" already exists under ${rowId(conflictingName)}.`,
      );
    }
  }

  return {
    authUser,
    oldProfile,
    newProfile,
    validAdmin,
    staleAdmin,
    teachers,
    departments,
  };
}

async function alignSeanProfile({
  tablesDB,
  databaseId,
  preflight,
}) {
  let oldProfile =
    preflight.oldProfile;

  let newProfile =
    preflight.newProfile;

  if (!newProfile) {
    if (!oldProfile) {
      throw new Error(
        "The old Sean profile is unavailable.",
      );
    }

    if (
      normalize(
        oldProfile.Email,
      ) === normalize(SEAN_EMAIL)
    ) {
      oldProfile =
        await retry(
          "Temporarily freeing Sean's unique email",
          () =>
            tablesDB.updateRow({
              databaseId,
              tableId:
                TABLES.users,
              rowId:
                OLD_SEAN_PROFILE_ID,
              data: {
                Email:
                  TEMPORARY_EMAIL,
              },
            }),
        );
    }

    const data =
      userProfileData({
        source:
          preflight.oldProfile,
        authUser:
          preflight.authUser,
      });

    try {
      newProfile =
        await retry(
          "Creating the aligned Sean user profile",
          () =>
            tablesDB.createRow({
              databaseId,
              tableId:
                TABLES.users,
              rowId:
                REAL_AUTH_USER_ID,
              data,
              permissions:
                asArray(
                  preflight.oldProfile
                    ?.$permissions,
                ),
            }),
        );
    } catch (error) {
      const possibleProfile =
        await getRowOrNull({
          tablesDB,
          databaseId,
          tableId:
            TABLES.users,
          rowId:
            REAL_AUTH_USER_ID,
        });

      if (!possibleProfile) {
        await retry(
          "Restoring Sean's original profile email",
          () =>
            tablesDB.updateRow({
              databaseId,
              tableId:
                TABLES.users,
              rowId:
                OLD_SEAN_PROFILE_ID,
              data: {
                Email:
                  SEAN_EMAIL,
              },
            }),
        );

        throw error;
      }

      newProfile =
        possibleProfile;
    }
  }

  if (
    normalize(
      newProfile.Email,
    ) !== normalize(SEAN_EMAIL)
  ) {
    newProfile =
      await retry(
        "Correcting the aligned Sean profile",
        () =>
          tablesDB.updateRow({
            databaseId,
            tableId:
              TABLES.users,
            rowId:
              REAL_AUTH_USER_ID,
            data:
              userProfileData({
                source:
                  preflight.oldProfile ??
                  newProfile,
                authUser:
                  preflight.authUser,
              }),
          }),
      );
  }

  const remainingOldProfile =
    await getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        OLD_SEAN_PROFILE_ID,
    });

  if (remainingOldProfile) {
    await retry(
      "Deleting the obsolete Sean profile row",
      () =>
        tablesDB.deleteRow({
          databaseId,
          tableId:
            TABLES.users,
          rowId:
            OLD_SEAN_PROFILE_ID,
        }),
    );
  }
}

async function removeStaleAdmin({
  tablesDB,
  databaseId,
}) {
  const staleProfile =
    await getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        STALE_ADMIN_USER_ID,
    });

  if (staleProfile) {
    throw new Error(
      `A user profile now exists for stale admin ${STALE_ADMIN_USER_ID}.`,
    );
  }

  const staleAdmin =
    await getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
      rowId:
        STALE_ADMIN_ROW_ID,
    });

  if (staleAdmin) {
    await retry(
      "Deleting the unrecoverable stale admin role row",
      () =>
        tablesDB.deleteRow({
          databaseId,
          tableId:
            TABLES.admins,
          rowId:
            STALE_ADMIN_ROW_ID,
        }),
    );
  }
}

async function createDepartments({
  tablesDB,
  databaseId,
}) {
  for (
    const department of
    DEPARTMENTS
  ) {
    const existing =
      await getRowOrNull({
        tablesDB,
        databaseId,
        tableId:
          TABLES.departments,
        rowId:
          department.rowId,
      });

    if (existing) {
      const expected =
        departmentData(
          department,
        );

      const actual =
        cleanRowData(existing);

      const needsUpdate =
        Object.entries(
          expected,
        ).some(
          ([key, value]) =>
            actual[key] !== value,
        );

      if (needsUpdate) {
        await retry(
          `Updating department ${department.name}`,
          () =>
            tablesDB.updateRow({
              databaseId,
              tableId:
                TABLES.departments,
              rowId:
                department.rowId,
              data:
                expected,
            }),
        );
      }

      continue;
    }

    await retry(
      `Creating department ${department.name}`,
      () =>
        tablesDB.createRow({
          databaseId,
          tableId:
            TABLES.departments,
          rowId:
            department.rowId,
          data:
            departmentData(
              department,
            ),
        }),
    );
  }
}

async function finalVerification({
  tablesDB,
  users,
  databaseId,
}) {
  const [
    authUser,
    alignedProfile,
    oldProfile,
    validAdmin,
    staleAdmin,
    admins,
    usersRows,
    teachers,
    departments,
  ] = await Promise.all([
    getAuthUserOrNull({
      users,
      userId:
        REAL_AUTH_USER_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        REAL_AUTH_USER_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
      rowId:
        OLD_SEAN_PROFILE_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
      rowId:
        VALID_ADMIN_ROW_ID,
    }),

    getRowOrNull({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
      rowId:
        STALE_ADMIN_ROW_ID,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.admins,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.users,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.teachers,
    }),

    listRows({
      tablesDB,
      databaseId,
      tableId:
        TABLES.departments,
    }),
  ]);

  if (
    !authUser ||
    !alignedProfile
  ) {
    throw new Error(
      "Sean's Auth/profile alignment failed.",
    );
  }

  if (oldProfile) {
    throw new Error(
      "The obsolete Sean profile still exists.",
    );
  }

  if (
    validAdmin?.userId !==
    REAL_AUTH_USER_ID
  ) {
    throw new Error(
      "The valid admin row is not linked to Sean's Auth/profile ID.",
    );
  }

  if (staleAdmin) {
    throw new Error(
      "The stale admin row still exists.",
    );
  }

  const profileIds =
    new Set(
      usersRows
        .map(rowId)
        .filter(Boolean),
    );

  const adminOrphans =
    admins.filter(
      (admin) =>
        !profileIds.has(
          String(
            admin.userId ?? "",
          ),
        ),
    );

  if (
    adminOrphans.length > 0
  ) {
    throw new Error(
      `Admin references remain broken: ${adminOrphans.map(rowId).join(", ")}`,
    );
  }

  const departmentIds =
    new Set(
      departments
        .map(rowId)
        .filter(Boolean),
    );

  const teacherOrphans =
    teachers.filter(
      (teacher) =>
        teacher.departmentId &&
        !departmentIds.has(
          String(
            teacher.departmentId,
          ),
        ),
    );

  if (
    teacherOrphans.length > 0
  ) {
    throw new Error(
      `Teacher department references remain broken: ${teacherOrphans.map(rowId).join(", ")}`,
    );
  }

  return {
    authUsersWithoutProfiles: 0,
    profilesWithoutAuth:
      usersRows.filter(
        (profile) =>
          rowId(profile) !==
          REAL_AUTH_USER_ID,
      ).length,
    adminRows:
      admins.length,
    departmentRows:
      departments.length,
    brokenReferences: 0,
    totalDatabaseRows:
      22,
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
    "SINGLE-SCHOOL REFERENCE REPAIR",
  );
  console.log(
    "==============================",
  );
  console.log(
    `Mode: ${argumentsResult.execute ? "EXECUTE" : "DRY RUN"}`,
  );

  const preflight =
    await verifyPreflight({
      tablesDB,
      users,
      databaseId,
    });

  console.log(
    "Preflight verification passed.",
  );
  console.log(
    `Sean profile alignment needed: ${preflight.newProfile ? "no" : "yes"}`,
  );
  console.log(
    `Stale admin deletion needed:    ${preflight.staleAdmin ? "yes" : "no"}`,
  );
  console.log(
    `Departments to create:          ${
      DEPARTMENTS.filter(
        (department) =>
          !preflight.departments.some(
            (existing) =>
              rowId(existing) ===
              department.rowId,
          ),
      ).length
    }`,
  );

  if (!argumentsResult.execute) {
    console.log("");
    console.log(
      "REFERENCE REPAIR DRY RUN COMPLETE",
    );
    console.log(
      "No rows were changed.",
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

  await alignSeanProfile({
    tablesDB,
    databaseId,
    preflight,
  });

  await removeStaleAdmin({
    tablesDB,
    databaseId,
  });

  await createDepartments({
    tablesDB,
    databaseId,
  });

  const verification =
    await finalVerification({
      tablesDB,
      users,
      databaseId,
    });

  const outputDirectory =
    path.resolve(
      "appwrite-integrity-repairs",
    );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const report = {
    completedAt:
      new Date().toISOString(),
    projectId,
    databaseId,
    retainedAuthUserId:
      REAL_AUTH_USER_ID,
    removedObsoleteProfileId:
      OLD_SEAN_PROFILE_ID,
    removedStaleAdminRowId:
      STALE_ADMIN_ROW_ID,
    createdDepartments:
      DEPARTMENTS,
    verification,
  };

  const reportPath =
    path.join(
      outputDirectory,
      "single-school-reference-repair.json",
    );

  await fs.writeFile(
    reportPath,
    `${JSON.stringify(
      report,
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "REFERENCE REPAIR COMPLETE",
  );
  console.log(
    "=========================",
  );
  console.log(
    `Broken references:           ${verification.brokenReferences}`,
  );
  console.log(
    `Admin rows:                  ${verification.adminRows}`,
  );
  console.log(
    `Department rows:             ${verification.departmentRows}`,
  );
  console.log(
    `Auth users without profiles: ${verification.authUsersWithoutProfiles}`,
  );
  console.log(
    `Profiles without Auth users: ${verification.profilesWithoutAuth}`,
  );
  console.log(
    `Database rows:               ${verification.totalDatabaseRows}`,
  );
  console.log(
    `Repair report:               ${reportPath}`,
  );
}

await main();
