import {
  Account,
  Client,
  TablesDB,
  Users,
} from 'node-appwrite'

function requireServerEnvironment(
  names: string[]
): string {
  for (const name of names) {
    const value = process.env[name]?.trim()

    if (value) {
      return value
    }
  }

  throw new Error(
    `Missing server environment variable. Expected one of: ${names.join(', ')}`
  )
}

export interface AppwriteServerConfiguration {
  endpoint: string
  projectId: string
  databaseId: string
  apiKey: string
  tables: {
    users: string
    admins: string
    applicants: string
    students: string
    teachers: string
  }
}

export function getAppwriteServerConfiguration():
  AppwriteServerConfiguration {
  return {
    endpoint: requireServerEnvironment([
      'APPWRITE_ENDPOINT',
      'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    ]),

    projectId: requireServerEnvironment([
      'APPWRITE_PROJECT_ID',
      'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    ]),

    databaseId: requireServerEnvironment([
      'APPWRITE_DATABASE_ID',
      'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    ]),

    apiKey: requireServerEnvironment([
      'SCHOOL_APPWRITE_SERVER_API_KEY',
    ]),

    tables: {
      users: requireServerEnvironment([
        'APPWRITE_USERS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID',
      ]),

      admins: requireServerEnvironment([
        'APPWRITE_ADMINS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID',
      ]),

      applicants: requireServerEnvironment([
        'APPWRITE_APPLICANTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_APPLICANTS_COLLECTION_ID',
      ]),

      students: requireServerEnvironment([
        'APPWRITE_STUDENTS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID',
      ]),

      teachers: requireServerEnvironment([
        'APPWRITE_TEACHERS_TABLE_ID',
        'NEXT_PUBLIC_APPWRITE_TEACHERS_COLLECTION_ID',
      ]),
    },
  }
}

export function createAdminAppwriteServices() {
  const configuration =
    getAppwriteServerConfiguration()

  const client = new Client()
    .setEndpoint(configuration.endpoint)
    .setProject(configuration.projectId)
    .setKey(configuration.apiKey)

  return {
    configuration,
    client,
    users: new Users(client),
    tablesDB: new TablesDB(client),
  }
}

export function createJwtAppwriteAccount(
  jwt: string
): Account {
  const configuration =
    getAppwriteServerConfiguration()

  const client = new Client()
    .setEndpoint(configuration.endpoint)
    .setProject(configuration.projectId)
    .setJWT(jwt)

  return new Account(client)
}
