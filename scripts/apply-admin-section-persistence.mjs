import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT =
  process.cwd()

const FILES = {
  financial:
    'components/dashboard/financial-audit/FinancialAuditDesk.tsx',
  users:
    'components/dashboard/user-accounts/UserAccountsDesk.tsx',
  academic:
    'components/academic-matrix/AcademicMatrixDashboard.tsx',
  academicData:
    'lib/academic-matrix-data.ts',
  dashboard:
    'app/(dashboard)/admin/dashboard/page.tsx',
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
}

function normalizeSource(
  source
) {
  return source
    .replace(
      /^\uFEFF/,
      ''
    )
    .replace(
      /\r\n?/g,
      '\n'
    )
}

function assertContains(
  source,
  expected,
  label
) {
  if (!source.includes(expected)) {
    throw new Error(
      `${label}: expected source block was not found. No files were changed.`
    )
  }
}

function replaceOnce(
  source,
  expected,
  replacement,
  label
) {
  assertContains(
    source,
    expected,
    label
  )

  return source.replace(
    expected,
    replacement
  )
}

function replaceRegexOnce(
  source,
  expression,
  replacement,
  label
) {
  if (!expression.test(source)) {
    const lineEnding =
      source.includes('\r\n')
        ? 'CRLF'
        : 'LF'

    throw new Error(
      `${label}: expected source pattern was not found after normalization (${lineEnding}). No files were changed.`
    )
  }

  expression.lastIndex = 0

  return source.replace(
    expression,
    replacement
  )
}

function patchFinancial(
  input
) {
  let source = input

  if (
    !source.includes(
      "usePersistentSectionData"
    )
  ) {
    source =
      replaceOnce(
        source,
        'import { databases } from "@/lib/appwrite/config";',
        [
          'import { databases } from "@/lib/appwrite/config";',
          'import { usePersistentSectionData } from "@/lib/client/use-persistent-section-data";',
        ].join('\n'),
        'Financial Audit import'
      )
  }

  if (
    source.includes(
      'async function safeList('
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /async function safeList\([\s\S]*?\n}\s*\nfunction buildMonthlyTrend/,
        `async function listCollectionStrict(
  collection: string,
): Promise<Document[]> {
  const response =
    await databases.listDocuments(
      databaseId(),
      collection,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    );

  return response.documents as unknown as Document[];
}

function buildMonthlyTrend`,
        'Financial Audit strict loader'
      )

    source =
      source.replaceAll(
        'safeList(',
        'listCollectionStrict('
      )
  }

  if (
    !source.includes(
      'function isSuccessfulPayment('
    )
  ) {
    source =
      replaceOnce(
        source,
        'function money(value: number): string {',
        `function isSuccessfulPayment(
  payment: Document,
): boolean {
  const status = text(
    payment,
    ["Status", "status"],
  )
    .trim()
    .toLowerCase();

  if (!status) {
    return true;
  }

  return [
    "approved",
    "paid",
    "completed",
    "complete",
    "successful",
    "success",
    "confirmed",
  ].some(
    (accepted) =>
      status === accepted ||
      status.includes(accepted),
  );
}

function money(value: number): string {`,
        'Financial Audit successful-payment helper'
      )
  }

  if (
    !source.includes(
      'const successfulPayments = payments.filter(isSuccessfulPayment);'
    )
  ) {
    source =
      replaceOnce(
        source,
        '  const feesById = new Map(fees.map((document) => [document.$id, document]));',
        `  const successfulPayments =
    payments.filter(isSuccessfulPayment);

  const feesById = new Map(fees.map((document) => [document.$id, document]));`,
        'Financial Audit successful payments'
      )
  }

  source =
    source.replace(
      '  const totalCollected = payments.reduce(',
      '  const totalCollected = successfulPayments.reduce('
    )

  source =
    source.replace(
      '    monthlyTrend: buildMonthlyTrend(payments),',
      '    monthlyTrend: buildMonthlyTrend(successfulPayments),'
    )

  if (
    !source.includes(
      'cacheKey: "admin-financial-audit"'
    )
  ) {
    source =
      replaceOnce(
        source,
        `  const [data, setData] = useState<FinancialData>(EMPTY_FINANCIAL_DATA);

  const [loading, setLoading] = useState(true);`,
        `  const {
    data: cachedData,
    loading: initialLoading,
    refreshing,
    error,
    refresh,
  } = usePersistentSectionData<FinancialData>({
    cacheKey: "admin-financial-audit",
    version: 1,
    loader: loadFinancialData,
  });

  const data =
    cachedData ??
    EMPTY_FINANCIAL_DATA;

  const loading =
    initialLoading ||
    refreshing;`,
        'Financial Audit state'
      )

    source =
      replaceRegexOnce(
        source,
        /  const reload = useCallback\(async \(\) => \{[\s\S]*?  useEffect\(\(\) => \{\n    void reload\(\);\n  }, \[reload\]\);\n/,
        `  const reload = useCallback(
    async () => {
      setLedgerRowLimit(
        DEFAULT_LEDGER_ROW_LIMIT,
      );

      await refresh(true);
    },
    [refresh],
  );

`,
        'Financial Audit reload'
      )
  }

  if (
    !source.includes(
      'No saved financial data is available.'
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /  return \(\n    <div className="space-y-10 pb-10 text-\[#20283f\]">\n      \{loading && \([\s\S]*?      \)\}\n/,
        `  if (!cachedData) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
        {error
          ? "No saved financial data is available. Check the connection and refresh."
          : "Loading financial records..."}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10 text-[#20283f]">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing saved financial data because the latest refresh failed.
        </div>
      )}
`,
        'Financial Audit initial view'
      )
  }

  if (
    !source.includes(
      'cacheKey: "admin-financial-audit-side"'
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /export function FinancialAuditSidePanel\(\) \{\n  const \[alerts, setAlerts\] = useState<LedgerRow\[\]>\(\[\]\);\n\n  useEffect\(\(\) => \{[\s\S]*?  }, \[\]\);\n/,
        `export function FinancialAuditSidePanel() {
  const {
    data,
  } = usePersistentSectionData<FinancialData>({
    cacheKey: "admin-financial-audit",
    version: 1,
    loader: loadFinancialData,
  });

  const alerts =
    data?.ledger.filter(
      (row) =>
        row.status === "Pending" ||
        row.status === "Flagged" ||
        row.status === "Overdue",
    ) ?? [];
`,
        'Financial Audit side panel'
      )

    source =
      source.replace(
        'cacheKey: "admin-financial-audit-side"',
        'cacheKey: "admin-financial-audit"'
      )
  }

  return source
}

function patchUserAccounts(
  input
) {
  let source = input

  if (
    !source.includes(
      "usePersistentSectionData"
    )
  ) {
    source =
      replaceOnce(
        source,
        "import { databases } from '@/lib/appwrite/config'",
        [
          "import { databases } from '@/lib/appwrite/config'",
          "import { usePersistentSectionData } from '@/lib/client/use-persistent-section-data'",
        ].join('\n'),
        'User Accounts import'
      )
  }

  if (
    source.includes(
      'async function safeList('
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /async function safeList\([\s\S]*?\n}\s*\nasync function loadUserAccountsData/,
        `async function listCollectionStrict(
  id: string
): Promise<AppwriteDocument[]> {
  const response =
    await databases.listDocuments({
      databaseId:
        requiredEnvironmentVariable(
          'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
          process.env
            .NEXT_PUBLIC_APPWRITE_DATABASE_ID
        ),
      collectionId: id,
      queries: [
        Query.orderDesc('$updatedAt'),
        Query.limit(100),
      ],
    })

  return response
    .documents as AppwriteDocument[]
}

async function loadUserAccountsData`,
        'User Accounts strict loader'
      )

    source =
      source.replaceAll(
        'safeList(',
        'listCollectionStrict('
      )
  }

  if (
    !source.includes(
      "cacheKey: 'admin-user-accounts'"
    )
  ) {
    source =
      replaceOnce(
        source,
        `  const [data, setData] =
    useState<UserAccountsData | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)`,
        `  const {
    data,
    loading: initialLoading,
    refreshing,
    error,
    refresh,
  } = usePersistentSectionData<UserAccountsData>({
    cacheKey: 'admin-user-accounts',
    version: 1,
    scope:
      schoolId ||
      'single-school',
    loader: () =>
      loadUserAccountsData(
        schoolId
      ),
  })

  const loading =
    initialLoading ||
    refreshing`,
        'User Accounts state'
      )

    source =
      replaceRegexOnce(
        source,
        /  const reload =\n    useCallback\(async \(\) => \{[\s\S]*?  useEffect\(\(\) => \{\n    void reload\(\)\n  }, \[reload\]\)\n/,
        `  const reload =
    useCallback(
      async () => {
        await refresh(true)
      },
      [refresh]
    )

`,
        'User Accounts reload'
      )
  }

  if (
    !source.includes(
      'No saved user-account data is available.'
    )
  ) {
    source =
      replaceOnce(
        source,
        `  const lockedRatio =
    data && data.users.length > 0`,
        `  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
        {error
          ? 'No saved user-account data is available. Check the connection and refresh.'
          : 'Loading user accounts...'}
      </div>
    )
  }

  const lockedRatio =
    data.users.length > 0`,
        'User Accounts initial view'
      )

    source =
      source.replace(
        `    data && data.users.length > 0
      ? (data.lockedCount /`,
        `    data.users.length > 0
      ? (data.lockedCount /`
      )

    source =
      replaceOnce(
        source,
        `  return (
    <div className="space-y-10 pb-10">`,
        `  return (
    <div className="space-y-10 pb-10">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing saved user-account data because the latest refresh failed.
        </div>
      )}`,
        'User Accounts cached error'
      )
  }

  if (
    !source.includes(
      "cacheKey: 'admin-user-accounts-side'"
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /export function UserAccountsSidePanel\(\) \{\n  const \[data, setData\] =[\s\S]*?  }, \[\]\)\n/,
        `export function UserAccountsSidePanel() {
  const {
    data,
    loading,
    error,
  } = usePersistentSectionData<UserAccountsData>({
    cacheKey: 'admin-user-accounts',
    version: 1,
    loader: () =>
      loadUserAccountsData(),
  })

  if (!data) {
    return (
      <div className="pt-10 text-xs text-gray-400">
        {error
          ? 'Saved account alerts are unavailable.'
          : loading
            ? 'Loading account alerts...'
            : 'No account alerts are available.'}
      </div>
    )
  }
`,
        'User Accounts side panel'
      )

    source =
      source.replace(
        "cacheKey: 'admin-user-accounts-side'",
        "cacheKey: 'admin-user-accounts'"
      )
  }

  return source
}

function patchAcademicData(
  input
) {
  let source = input

  if (
    source.includes(
      'async function safeList('
    )
  ) {
    source =
      replaceRegexOnce(
        source,
        /async function safeList\([\s\S]*?\n}\s*\nfunction markScore/,
        `async function listCollectionStrict(
  collection: string
): Promise<Document[]> {
  const databaseId =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim()

  if (!databaseId) {
    throw new Error(
      'Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID'
    )
  }

  const response =
    await databases.listDocuments(
      databaseId,
      collection,
      [
        Query.limit(100),
      ]
    )

  return response
    .documents as unknown as Document[]
}

function markScore`,
        'Academic Matrix strict loader'
      )

    source =
      source.replaceAll(
        'safeList(',
        'listCollectionStrict('
      )
  }

  return source
}

function patchAcademicDashboard(
  input
) {
  let source = input

  if (
    !source.includes(
      "usePersistentSectionData"
    )
  ) {
    source =
      replaceOnce(
        source,
        `} from "@/lib/academic-matrix-data";`,
        `} from "@/lib/academic-matrix-data";
import { usePersistentSectionData } from "@/lib/client/use-persistent-section-data";`,
        'Academic Matrix import'
      )
  }

  if (
    !source.includes(
      'cacheKey: "admin-academic-matrix"'
    )
  ) {
    source =
      replaceOnce(
        source,
        `  const [data, setData] = useState<AcademicMatrixData>(INITIAL_DATA);

  const [loading, setLoading] = useState(true);`,
        `  const {
    data: cachedData,
    loading: initialLoading,
    refreshing,
    error,
    refresh,
  } = usePersistentSectionData<AcademicMatrixData>({
    cacheKey: "admin-academic-matrix",
    version: 1,
    loader: loadAcademicMatrixData,
    refreshEvents: [
      "school-suite:refresh-academic-matrix",
    ],
  });

  const data =
    cachedData ??
    INITIAL_DATA;

  const loading =
    initialLoading ||
    refreshing;`,
        'Academic Matrix state'
      )

    source =
      replaceRegexOnce(
        source,
        /  const reloadData = useCallback\(async \(\) => \{[\s\S]*?  useEffect\(\(\) => \{\n    void reloadData\(\);\n  }, \[reloadData\]\);\n/,
        `  const reloadData =
    useCallback(
      async () => {
        await refresh(true);
      },
      [refresh],
    );

`,
        'Academic Matrix reload'
      )
  }

  if (
    !source.includes(
      'No saved Academic Matrix data is available.'
    )
  ) {
    source =
      replaceOnce(
        source,
        `  return (
    <AdminWorkspaceShell
      title="Academic Matrix Setup"`,
        `  if (!cachedData) {
    return (
      <AdminWorkspaceShell
        title="Academic Matrix Setup"
        activeRoute="academic"
        searchValue={query}
        onSearchChange={setQuery}
        notifications={[]}
        quickActions={quickActions}
      >
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
          {error
            ? "No saved Academic Matrix data is available. Check the connection and refresh."
            : "Loading Academic Matrix data..."}
        </div>
      </AdminWorkspaceShell>
    );
  }

  return (
    <AdminWorkspaceShell
      title="Academic Matrix Setup"`,
        'Academic Matrix initial view'
      )

    source =
      replaceRegexOnce(
        source,
        /      \{loading && \(\n        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">[\s\S]*?      \)\}\n/,
        `      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing saved Academic Matrix data because the latest refresh failed.
        </div>
      )}
`,
        'Academic Matrix loading banner'
      )
  }

  return source
}

function patchDashboard(
  input
) {
  let source = input

  if (
    source.includes(
      'refreshAdminSnapshots'
    )
  ) {
    return source
  }

  source =
    replaceRegexOnce(
      source,
      /  \/\/ Handle class added successfully[\s\S]*?  \/\/ Navigation handlers/,
      `  const refreshAdminSnapshots = (
    ...eventNames: string[]
  ) => {
    eventNames.forEach(
      (eventName) =>
        window.dispatchEvent(
          new CustomEvent(
            eventName
          )
        )
    )
  }

  // Handle class added successfully
  const handleClassAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix'
    )
  }

  // Handle student added successfully
  const handleStudentAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix',
      'user-accounts:refresh'
    )
  }

  // Handle teacher added successfully
  const handleTeacherAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'school-suite:refresh-academic-matrix',
      'user-accounts:refresh'
    )
  }

  // Handle applicant added successfully
  const handleApplicantAdded = () => {
    refreshAdminSnapshots(
      'school-suite:refresh-global-dashboard',
      'user-accounts:refresh'
    )
  }

  // Navigation handlers`,
      'Admin dashboard invalidation events'
    )

  return source
}

async function main() {
  const originals = {}

  for (
    const [
      name,
      relativePath,
    ] of Object.entries(
      FILES
    )
  ) {
    const absolutePath =
      path.resolve(
        ROOT,
        relativePath
      )

    originals[name] =
      await fs.readFile(
        absolutePath,
        'utf8'
      )
  }

  const normalized = Object.fromEntries(
    Object.entries(
      originals
    ).map(
      ([name, content]) => [
        name,
        normalizeSource(
          content
        ),
      ]
    )
  )

  const outputs = {
    financial:
      patchFinancial(
        normalized.financial
      ),
    users:
      patchUserAccounts(
        normalized.users
      ),
    academic:
      patchAcademicDashboard(
        normalized.academic
      ),
    academicData:
      patchAcademicData(
        normalized.academicData
      ),
    dashboard:
      patchDashboard(
        normalized.dashboard
      ),
  }

  const validations = [
    [
      outputs.financial,
      'admin-financial-audit',
      'Financial Audit cache',
    ],
    [
      outputs.users,
      'admin-user-accounts',
      'User Accounts cache',
    ],
    [
      outputs.academic,
      'admin-academic-matrix',
      'Academic Matrix cache',
    ],
    [
      outputs.academicData,
      'listCollectionStrict',
      'Academic Matrix strict loading',
    ],
    [
      outputs.dashboard,
      'refreshAdminSnapshots',
      'Dashboard cache invalidation',
    ],
  ]

  validations.forEach(
    ([
      source,
      marker,
      label,
    ]) => {
      if (
        !source.includes(
          marker
        )
      ) {
        throw new Error(
          `${label} failed verification. No files were changed.`
        )
      }
    }
  )

  const backupRoot =
    path.resolve(
      ROOT,
      'appwrite-integrity-repairs',
      'admin-section-persistence',
      timestamp()
    )

  await fs.mkdir(
    backupRoot,
    {
      recursive: true,
    }
  )

  for (
    const [
      name,
      relativePath,
    ] of Object.entries(
      FILES
    )
  ) {
    const backupPath =
      path.resolve(
        backupRoot,
        relativePath
      )

    await fs.mkdir(
      path.dirname(
        backupPath
      ),
      {
        recursive: true,
      }
    )

    await fs.writeFile(
      backupPath,
      originals[name],
      'utf8'
    )
  }

  for (
    const [
      name,
      relativePath,
    ] of Object.entries(
      FILES
    )
  ) {
    await fs.writeFile(
      path.resolve(
        ROOT,
        relativePath
      ),
      outputs[name],
      'utf8'
    )
  }

  console.log('')
  console.log(
    'ADMIN SECTION PERSISTENCE APPLIED'
  )
  console.log(
    '================================='
  )
  console.log(
    'Financial Audit: cached + strict refresh'
  )
  console.log(
    'Academic Matrix: cached + strict refresh'
  )
  console.log(
    'User Accounts: cached + strict refresh'
  )
  console.log(
    'Main/side panels: shared requests'
  )
  console.log(
    'Background refresh: silent'
  )
  console.log(
    `Backup: ${backupRoot}`
  )
  console.log('')
}

main().catch(
  (error) => {
    console.error('')
    console.error(
      'ADMIN SECTION PERSISTENCE FAILED'
    )
    console.error(
      error instanceof Error
        ? error.message
        : error
    )
    console.error('')
    process.exitCode = 1
  }
)
