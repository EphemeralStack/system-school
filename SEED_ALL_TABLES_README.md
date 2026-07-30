# Appwrite All-Tables Seeder

This pack seeds the School Management Suite's Appwrite TablesDB database.

## What it does

- Discovers every table in the configured database.
- Reads the live column definitions before generating data.
- Creates or updates 20 deterministic seed rows per table.
- Seeds the current 25-table schema, producing 500 planned rows.
- Preserves existing non-seed rows.
- Uses linked deterministic IDs for schools, users, students, teachers,
  departments, subjects, classes, fees, hostels, transport routes and other
  dependent tables.
- Adapts values to required fields, enum casing, arrays and data types.
- Produces `appwrite-seed-output/appwrite-seed-report.json`.
- Is safe to rerun because it uses row upserts.

## Important Auth note

This seeds database rows only. It does not create Appwrite Auth accounts.
Database user profiles will appear in administrative tables and analytics, but
they cannot sign in unless corresponding Appwrite Auth accounts are created.

## API-key scopes

Create a temporary Appwrite server API key with:

- `databases.read`
- `tables.read`
- `columns.read`
- `rows.read`
- `rows.write`

Do not use a `NEXT_PUBLIC_*` variable for the API key.

## Setup

Copy:

```text
.env.appwrite-seeder.example
```

to:

```text
.env.appwrite-seeder
```

Put the temporary API key in `APPWRITE_API_KEY`.

## Run

```powershell
node .\scripts\seed-all-tables.mjs
```

After the script completes, revoke the temporary API key and delete
`.env.appwrite-seeder`.

## Dry run

Set:

```text
SEED_DRY_RUN=1
```

Then run the same command. No rows will be written.
