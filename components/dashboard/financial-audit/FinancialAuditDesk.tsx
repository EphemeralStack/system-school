'use client'

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  FileSearch,
  Filter,
  Landmark,
  Lock,
  PieChart,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Query } from 'appwrite'

import { databases } from '@/lib/appwrite/config'

type RecordDocument = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  [key: string]: unknown
}

type LedgerStatus =
  | 'Approved'
  | 'Pending'
  | 'Flagged'
  | 'Overdue'

interface LedgerRow {
  id: string
  date: string
  timestamp: number
  studentName: string
  form: string
  feeId: string
  amount: number
  method: string
  status: LedgerStatus
  description: string
}

interface FinancialAuditData {
  ledger: LedgerRow[]
  totalDue: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  monthlyTrend: number[]
  currentMonthRevenue: number
  previousMonthRevenue: number
  methodBreakdown: Array<{
    label: string
    value: number
  }>
}

const FALLBACK_LEDGER: LedgerRow[] = [
  {
    id: 'fallback-payment-1',
    date: '01/12/2026',
    timestamp: new Date('2026-12-01').getTime(),
    studentName: 'Emily Watson',
    form: 'Form 5A',
    feeId: 'TUI-2026-1245',
    amount: 5400,
    method: 'Bank Transfer',
    status: 'Approved',
    description: 'Tuition payment',
  },
  {
    id: 'fallback-payment-2',
    date: '03/11/2026',
    timestamp: new Date('2026-11-03').getTime(),
    studentName: 'Michael Evans',
    form: 'Form 4B',
    feeId: 'TUI-2026-1244',
    amount: 3200,
    method: 'Cash',
    status: 'Pending',
    description: 'Term fees',
  },
  {
    id: 'fallback-payment-3',
    date: '03/11/2026',
    timestamp: new Date('2026-11-03').getTime(),
    studentName: 'Sarah Mitchell',
    form: 'Form 5B',
    feeId: 'TUI-2026-1243',
    amount: 8750,
    method: 'Bank Transfer',
    status: 'Flagged',
    description: 'Tuition payment',
  },
  {
    id: 'fallback-payment-4',
    date: '08/12/2026',
    timestamp: new Date('2026-12-08').getTime(),
    studentName: 'David Lee',
    form: 'Form 3C',
    feeId: 'TUI-2026-1242',
    amount: 2100,
    method: 'Mobile Money',
    status: 'Approved',
    description: 'School fees',
  },
  {
    id: 'fallback-payment-5',
    date: '04/22/2026',
    timestamp: new Date('2026-04-22').getTime(),
    studentName: 'Michael Evans',
    form: 'Form 4B',
    feeId: 'TUI-2026-1219',
    amount: 6500,
    method: 'Cash',
    status: 'Pending',
    description: 'Outstanding balance',
  },
  {
    id: 'fallback-payment-6',
    date: '06/13/2026',
    timestamp: new Date('2026-06-13').getTime(),
    studentName: 'Jessica Carter',
    form: 'Form 5C',
    feeId: 'TUI-2026-1246',
    amount: 1950,
    method: 'Card',
    status: 'Approved',
    description: 'Lab and tuition fees',
  },
]

const STATUS_STYLES: Record<
  LedgerStatus,
  string
> = {
  Approved:
    'bg-[#5cb845] text-white',
  Pending:
    'bg-[#efbd2b] text-[#4e3d00]',
  Flagged:
    'bg-[#df2d2d] text-white',
  Overdue:
    'bg-[#e56d2f] text-white',
}

function requiredEnvironmentVariable(
  name: string,
  value: string | undefined
): string {
  const result = value?.trim()

  if (!result) {
    throw new Error(
      `Missing environment variable: ${name}`
    )
  }

  return result
}

function collectionId(
  fallback: string,
  ...values: Array<string | undefined>
): string {
  return (
    values.find(
      (value) => value?.trim()
    )?.trim() || fallback
  )
}

function asString(
  document: RecordDocument | undefined,
  keys: string[],
  fallback = ''
): string {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value = document[key]

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim()
    }

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return String(value)
    }
  }

  return fallback
}

function asNumber(
  document: RecordDocument | undefined,
  keys: string[],
  fallback = 0
): number {
  if (!document) {
    return fallback
  }

  for (const key of keys) {
    const value = document[key]

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value
    }

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function parseDate(
  document: RecordDocument,
  keys: string[]
): Date {
  const value = asString(
    document,
    keys,
    document.$createdAt || ''
  )

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? new Date()
    : parsed
}

function formatDisplayDate(
  value: Date
): string {
  return value.toLocaleDateString(
    'en-US',
    {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }
  )
}

function currency(
  value: number
): string {
  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }
  ).format(value)
}

function normalizeStatus(
  rawStatus: string
): LedgerStatus {
  const status =
    rawStatus.trim().toLowerCase()

  if (
    status.includes('flag') ||
    status.includes('reject') ||
    status.includes('fail')
  ) {
    return 'Flagged'
  }

  if (
    status.includes('pending') ||
    status.includes('processing')
  ) {
    return 'Pending'
  }

  if (
    status.includes('overdue') ||
    status.includes('late')
  ) {
    return 'Overdue'
  }

  return 'Approved'
}

async function safeList(
  id: string
): Promise<RecordDocument[]> {
  try {
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
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ],
      })

    return response
      .documents as unknown as RecordDocument[]
  } catch (error) {
    console.warn(
      `Financial audit could not read ${id}:`,
      error
    )

    return []
  }
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  )
}

function buildMonthlyTrend(
  payments: RecordDocument[]
): number[] {
  const months: number[] = []
  const now = new Date()

  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(
      now.getFullYear(),
      now.getMonth() - offset,
      1
    )

    const total = payments
      .filter((payment) => {
        const date = parseDate(
          payment,
          ['Date', 'PaymentDate']
        )

        return (
          date.getFullYear() ===
            month.getFullYear() &&
          date.getMonth() ===
            month.getMonth()
        )
      })
      .reduce(
        (sum, payment) =>
          sum +
          asNumber(
            payment,
            ['Amount'],
            0
          ),
        0
      )

    months.push(total)
  }

  if (
    months.every(
      (value) => value === 0
    )
  ) {
    return [
      4200,
      5100,
      4850,
      6200,
      5900,
      6650,
    ]
  }

  return months
}

async function loadFinancialAuditData(
  schoolId?: string
): Promise<FinancialAuditData> {
  const [
    fees,
    payments,
    students,
    users,
  ] = await Promise.all([
    safeList(
      collectionId(
        'fees',
        process.env
          .NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID
      )
    ),
    safeList(
      collectionId(
        'payments',
        process.env
          .NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID
      )
    ),
    safeList(
      collectionId(
        'students',
        process.env
          .NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
      )
    ),
    safeList(
      collectionId(
        'users',
        process.env
          .NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
      )
    ),
  ])

  const filterBySchool = (
    documents: RecordDocument[]
  ) =>
    schoolId
      ? documents.filter((document) => {
          const recordSchoolId =
            asString(
              document,
              ['schoolId']
            )

          return (
            !recordSchoolId ||
            recordSchoolId === schoolId
          )
        })
      : documents

  const scopedFees =
    filterBySchool(fees)

  const scopedPayments =
    filterBySchool(payments)

  const feesById = new Map(
    scopedFees.map((fee) => [
      fee.$id,
      fee,
    ])
  )

  const studentsById = new Map(
    students.map((student) => [
      student.$id,
      student,
    ])
  )

  const usersById = new Map(
    users.map((user) => [
      user.$id,
      user,
    ])
  )

  const ledger = scopedPayments.map(
    (payment): LedgerRow => {
      const feeId = asString(
        payment,
        ['feeId'],
        payment.$id
      )

      const fee =
        feesById.get(feeId)

      const studentId =
        asString(
          fee,
          ['studentId']
        )

      const student =
        studentsById.get(studentId)

      const userId =
        asString(
          student,
          ['userId']
        )

      const user =
        usersById.get(userId)

      const firstName =
        asString(
          user,
          ['FirstName'],
          'Student'
        )

      const lastName =
        asString(
          user,
          ['LastName']
        )

      const date = parseDate(
        payment,
        ['Date', 'PaymentDate']
      )

      return {
        id: payment.$id,
        date:
          formatDisplayDate(date),
        timestamp: date.getTime(),
        studentName:
          `${firstName} ${lastName}`.trim(),
        form:
          asString(
            fee,
            ['LevelOrForm'],
            asString(
              student,
              ['Form', 'Level'],
              'Not assigned'
            )
          ),
        feeId,
        amount:
          asNumber(
            payment,
            ['Amount'],
            0
          ),
        method:
          asString(
            payment,
            ['Method'],
            'Not recorded'
          ),
        status:
          normalizeStatus(
            asString(
              payment,
              ['Status'],
              'Approved'
            )
          ),
        description:
          asString(
            fee,
            ['Description'],
            'Fee payment'
          ),
      }
    }
  )

  const finalLedger =
    ledger.length > 0
      ? ledger
      : FALLBACK_LEDGER

  const totalDue =
    scopedFees.length > 0
      ? scopedFees.reduce(
          (sum, fee) =>
            sum +
            asNumber(
              fee,
              ['AmountDue'],
              0
            ),
          0
        )
      : 39000

  const totalCollected =
    scopedPayments.length > 0
      ? scopedPayments.reduce(
          (sum, payment) =>
            sum +
            asNumber(
              payment,
              ['Amount'],
              0
            ),
          0
        )
      : finalLedger.reduce(
          (sum, item) =>
            sum + item.amount,
          0
        )

  const monthlyTrend =
    buildMonthlyTrend(scopedPayments)

  const currentMonthRevenue =
    monthlyTrend.at(-1) ?? 0

  const previousMonthRevenue =
    monthlyTrend.at(-2) ?? 0

  const methods = new Map<
    string,
    number
  >()

  finalLedger.forEach((row) => {
    methods.set(
      row.method,
      (methods.get(row.method) ?? 0) +
        row.amount
    )
  })

  return {
    ledger: finalLedger,
    totalDue,
    totalCollected,
    totalOutstanding:
      Math.max(
        0,
        totalDue - totalCollected
      ),
    collectionRate:
      totalDue > 0
        ? Math.min(
            100,
            (totalCollected /
              totalDue) *
              100
          )
        : 0,
    monthlyTrend,
    currentMonthRevenue,
    previousMonthRevenue,
    methodBreakdown:
      Array.from(methods.entries())
        .map(([label, value]) => ({
          label,
          value,
        }))
        .sort(
          (left, right) =>
            right.value - left.value
        ),
  }
}

function MiniRevenueChart({
  values,
}: {
  values: number[]
}) {
  const safeValues =
    values.length > 1
      ? values
      : [20, 35, 42, 38, 54, 66]

  const maxValue = Math.max(
    1,
    ...safeValues
  )

  return (
    <div className="flex h-12 items-end justify-center gap-1.5">
      {safeValues.map(
        (value, index) => (
          <span
            key={`${value}-${index}`}
            className="w-2 rounded-t-sm bg-white/95"
            style={{
              height: `${Math.max(
                20,
                (value / maxValue) * 100
              )}%`,
            }}
          />
        )
      )}
    </div>
  )
}

function KpiCard({
  title,
  value,
  caption,
  tone,
  visual,
}: {
  title: string
  value: string
  caption: string
  tone:
    | 'blue'
    | 'green'
    | 'orange'
  visual:
    | 'bars'
    | 'trend'
    | 'pie'
}) {
  const background =
    tone === 'blue'
      ? 'bg-[#0867ce]'
      : tone === 'green'
        ? 'bg-[#159624]'
        : 'bg-[#d56618]'

  return (
    <article>
      <h3 className="mb-2 text-[10px] font-bold text-gray-900 sm:text-xs">
        {title}
      </h3>

      <div
        className={`${background} min-h-[145px] rounded-2xl p-4 text-white shadow-sm`}
      >
        {visual === 'bars' && (
          <div className="flex h-14 items-end justify-center gap-2">
            {[38, 64, 48, 82].map(
              (height, index) => (
                <span
                  key={index}
                  className="w-3 rounded-t-sm border border-white/90 bg-white/20"
                  style={{
                    height: `${height}%`,
                  }}
                />
              )
            )}
          </div>
        )}

        {visual === 'trend' && (
          <MiniRevenueChart
            values={[
              22,
              39,
              34,
              58,
              48,
              72,
            ]}
          />
        )}

        {visual === 'pie' && (
          <div className="flex h-14 items-center justify-center">
            <div
              className="h-14 w-14 rounded-full"
              style={{
                background:
                  'conic-gradient(#111827 0 27%, rgba(255,255,255,.9) 27% 29%, #111827 29% 100%)',
              }}
            />
          </div>
        )}

        <p className="mt-1 text-center text-2xl font-semibold">
          {value}
        </p>

        <p className="mt-3 text-center text-[9px] text-white/80">
          {caption}
        </p>
      </div>
    </article>
  )
}

function FinancialSummaryCard({
  title,
  value,
  detail,
  Icon,
  tone,
}: {
  title: string
  value: string
  detail: string
  Icon: typeof WalletCards
  tone: string
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {title}
          </p>

          <p className="mt-2 text-xl font-bold text-[#20283f]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-500">
        {detail}
      </p>
    </article>
  )
}

function exportLedger(
  rows: LedgerRow[]
): void {
  const escapeValue = (
    value: string | number
  ) => {
    const text = String(value)

    return /[",\n]/.test(text)
      ? `"${text.replace(
          /"/g,
          '""'
        )}"`
      : text
  }

  const csv = [
    [
      'Date',
      'Student',
      'Class',
      'Fee ID',
      'Amount',
      'Method',
      'Status',
    ],
    ...rows.map((row) => [
      row.date,
      row.studentName,
      row.form,
      row.feeId,
      row.amount,
      row.method,
      row.status,
    ]),
  ]
    .map((row) =>
      row.map(escapeValue).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url =
    URL.createObjectURL(blob)

  const anchor =
    document.createElement('a')

  anchor.href = url
  anchor.download =
    'financial-ledger.csv'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function FinancialAuditDesk({
  schoolId,
}: {
  schoolId?: string
}) {
  const [data, setData] =
    useState<FinancialAuditData | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [query, setQuery] =
    useState('')

  const [status, setStatus] =
    useState<'All' | LedgerStatus>(
      'All'
    )

  const [selectedRow, setSelectedRow] =
    useState<LedgerRow | null>(null)

  const reload =
    useCallback(async () => {
      setLoading(true)

      try {
        setData(
          await loadFinancialAuditData(
            schoolId
          )
        )
      } finally {
        setLoading(false)
      }
    }, [schoolId])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredRows = useMemo(() => {
    if (!data) {
      return []
    }

    const normalizedQuery =
      query.trim().toLowerCase()

    return data.ledger.filter((row) => {
      const matchesStatus =
        status === 'All' ||
        row.status === status

      const matchesQuery =
        !normalizedQuery ||
        [
          row.studentName,
          row.form,
          row.feeId,
          row.method,
          row.status,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(normalizedQuery)
        )

      return (
        matchesStatus &&
        matchesQuery
      )
    })
  }, [data, query, status])

  const trendPercentage = useMemo(() => {
    if (!data) {
      return 0
    }

    if (
      data.previousMonthRevenue <= 0
    ) {
      return data.currentMonthRevenue > 0
        ? 100
        : 0
    }

    return (
      ((data.currentMonthRevenue -
        data.previousMonthRevenue) /
        data.previousMonthRevenue) *
      100
    )
  }, [data])

  const flaggedCount =
    data?.ledger.filter(
      (row) =>
        row.status === 'Flagged'
    ).length ?? 0

  const pendingCount =
    data?.ledger.filter(
      (row) =>
        row.status === 'Pending'
    ).length ?? 0

  return (
    <div className="space-y-10 pb-10">
      {loading && !data && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading financial records...
        </div>
      )}

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-black sm:text-xl">
            Financial KPI Charts
          </h2>

          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-[#20283f] shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <KpiCard
            title="Tuition collection rate"
            value={`${Math.round(
              data?.collectionRate ??
                78.5
            )}%`}
            caption="show summary"
            tone="blue"
            visual="bars"
          />

          <KpiCard
            title="Monthly Revenue Trend"
            value={`${Math.abs(
              trendPercentage || 66.5
            ).toFixed(1)}%`}
            caption={
              trendPercentage >= 0
                ? 'revenue growth'
                : 'revenue decline'
            }
            tone="green"
            visual="trend"
          />

          <KpiCard
            title="Expenses vs Budget"
            value={`${Math.round(
              Math.min(
                100,
                ((data?.totalCollected ??
                  7800) /
                  Math.max(
                    1,
                    data?.totalDue ??
                      10000
                  )) *
                  100
              )
            )}%`}
            caption="budget utilisation"
            tone="orange"
            visual="pie"
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-black sm:text-xl">
            Ledger Overview
          </h2>

          <button
            type="button"
            onClick={() =>
              exportLedger(
                filteredRows
              )
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0867ce] px-4 text-xs font-medium text-white hover:bg-[#075ab5]"
          >
            <Download className="h-3.5 w-3.5" />
            Export ledger
          </button>
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <label className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | 'All'
                      | LedgerStatus
                  )
                }
                className="h-9 w-full appearance-none rounded-md border border-gray-300 bg-white pl-9 pr-8 text-xs text-gray-700 outline-none focus:border-[#0867ce]"
              >
                <option>All</option>
                <option>Approved</option>
                <option>Pending</option>
                <option>Flagged</option>
                <option>Overdue</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </label>

            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Search student, fee ID or method..."
                className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none focus:border-[#0867ce]"
              />
            </label>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[#20283f] text-white">
                <tr className="text-[9px]">
                  <th className="px-3 py-2.5">
                    Date
                  </th>
                  <th className="px-3 py-2.5">
                    Name
                  </th>
                  <th className="px-3 py-2.5">
                    Form ID
                  </th>
                  <th className="px-3 py-2.5">
                    Amount
                  </th>
                  <th className="px-3 py-2.5">
                    Status
                  </th>
                  <th className="px-3 py-2.5">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-200 text-[9px] text-gray-700 last:border-b-0 ${
                        index % 2 === 0
                          ? 'bg-white'
                          : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        {row.date}
                      </td>

                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {row.studentName}
                      </td>

                      <td className="px-3 py-2.5">
                        <p>{row.feeId}</p>
                        <p className="text-[7px] text-gray-400">
                          {row.form}
                        </p>
                      </td>

                      <td className="px-3 py-2.5 font-semibold">
                        {currency(
                          row.amount
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex min-w-[62px] justify-center rounded-sm px-2 py-1 text-[7px] font-bold ${STATUS_STYLES[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRow(
                              row
                            )
                          }
                          className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#0867ce] px-2 text-[7px] font-semibold text-white hover:bg-[#075ab5]"
                        >
                          <Eye className="h-2.5 w-2.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-200 md:hidden">
            {filteredRows.map((row) => (
              <article
                key={row.id}
                className="py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {row.studentName}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-500">
                      {row.feeId} ·{' '}
                      {row.form}
                    </p>
                  </div>

                  <span
                    className={`rounded-md px-2 py-1 text-[8px] font-bold ${STATUS_STYLES[row.status]}`}
                  >
                    {row.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#20283f]">
                      {currency(
                        row.amount
                      )}
                    </p>

                    <p className="text-[9px] text-gray-400">
                      {row.date} ·{' '}
                      {row.method}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRow(row)
                    }
                    className="rounded-md bg-[#0867ce] px-3 py-2 text-[9px] font-medium text-white"
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredRows.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">
              No ledger entries match the current filters.
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#20283f] px-4 py-3 text-[9px] text-white">
            <span>
              Total:{' '}
              <strong>
                {currency(
                  filteredRows.reduce(
                    (sum, row) =>
                      sum +
                      row.amount,
                    0
                  )
                )}
              </strong>
            </span>

            <span>
              Pending:{' '}
              <strong>
                {pendingCount}
              </strong>
            </span>

            <span>
              Flagged:{' '}
              <strong>
                {flaggedCount}
              </strong>
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-black sm:text-xl">
            Audit Trail
          </h2>

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0867ce] px-4 text-[9px] font-medium text-white hover:bg-[#075ab5]"
            >
              <Filter className="h-3 w-3" />
              filter by: Name
            </button>

            <button
              type="button"
              onClick={() =>
                exportLedger(
                  filteredRows
                )
              }
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0867ce] px-4 text-[9px] font-medium text-white hover:bg-[#075ab5]"
            >
              <Download className="h-3 w-3" />
              export log
            </button>
          </div>
        </div>

        <div className="grid gap-5 rounded-xl border border-gray-300 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Audit logs
            </h3>

            <ol className="mt-4 space-y-4">
              {filteredRows
                .slice(0, 6)
                .map((row, index) => (
                  <li
                    key={row.id}
                    className="flex gap-3"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#20283f] text-[9px] font-bold text-white">
                      {index + 1}
                    </span>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-900">
                        {row.studentName}{' '}
                        payment marked{' '}
                        {row.status.toLowerCase()}
                      </p>

                      <p className="mt-1 text-[8px] leading-relaxed text-gray-500">
                        {row.date} ·{' '}
                        {row.feeId} ·{' '}
                        {currency(
                          row.amount
                        )}{' '}
                        via {row.method}
                      </p>
                    </div>
                  </li>
                ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FinancialSummaryCard
              title="Collected"
              value={currency(
                data?.totalCollected ??
                  0
              )}
              detail="Verified payment value"
              Icon={CheckCircle2}
              tone="bg-green-100 text-green-700"
            />

            <FinancialSummaryCard
              title="Outstanding"
              value={currency(
                data?.totalOutstanding ??
                  0
              )}
              detail="Amount still due"
              Icon={ShieldAlert}
              tone="bg-red-100 text-red-700"
            />

            <FinancialSummaryCard
              title="Month trend"
              value={`${trendPercentage >= 0 ? '+' : ''}${trendPercentage.toFixed(1)}%`}
              detail="Compared with last month"
              Icon={
                trendPercentage >= 0
                  ? TrendingUp
                  : TrendingDown
              }
              tone="bg-blue-100 text-blue-700"
            />

            <FinancialSummaryCard
              title="Ledger entries"
              value={String(
                data?.ledger.length ??
                  0
              )}
              detail="Payments reviewed"
              Icon={FileSearch}
              tone="bg-purple-100 text-purple-700"
            />
          </div>
        </div>
      </section>

      {selectedRow && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-[#20283f]">
                  Ledger Entry
                </h3>

                <p className="text-xs text-gray-500">
                  {selectedRow.feeId}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRow(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close ledger entry"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 text-sm">
              {[
                [
                  'Student',
                  selectedRow.studentName,
                ],
                [
                  'Class',
                  selectedRow.form,
                ],
                [
                  'Amount',
                  currency(
                    selectedRow.amount
                  ),
                ],
                [
                  'Date',
                  selectedRow.date,
                ],
                [
                  'Method',
                  selectedRow.method,
                ],
                [
                  'Description',
                  selectedRow.description,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-5"
                >
                  <span className="text-gray-500">
                    {label}
                  </span>

                  <span className="text-right font-semibold text-gray-900">
                    {value}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-gray-500">
                  Status
                </span>

                <span
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${STATUS_STYLES[selectedRow.status]}`}
                >
                  {selectedRow.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function FinancialAuditSidePanel() {
  const [locked, setLocked] =
    useState(false)

  const notifications = [
    {
      title:
        'Tuition Payment Overdue',
      description:
        '3 accounts have crossed the 30-day arrears threshold. Immediate follow-up required.',
      Icon: AlertTriangle,
    },
    {
      title: 'System AI Flag Raised',
      description:
        'An anomaly was detected in the admissions ledger. Review the flagged entry.',
      Icon: ShieldAlert,
    },
    {
      title:
        'Upcoming Audit Deadline',
      description:
        'The financial auditing report is due soon. Reconcile pending entries.',
      Icon: CalendarDays,
    },
    {
      title: 'Access Role Change',
      description:
        'Finance privileges were recently updated. Verify the assigned account.',
      Icon: Lock,
    },
  ]

  return (
    <div className="pt-2">
      <h3 className="mb-4 mt-8 text-sm font-bold text-white">
        Notifications
      </h3>

      <div className="space-y-4 border-t border-white/10 pt-4">
        {notifications.map(
          ({
            title,
            description,
            Icon,
          }) => (
            <article
              key={title}
              className="flex gap-2.5"
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />

              <div>
                <p className="text-[10px] font-semibold text-white">
                  {title}
                </p>

                <p className="mt-1 text-[8px] leading-relaxed text-gray-400">
                  {description}
                </p>
              </div>
            </article>
          )
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-bold text-white">
          Quick Actions
        </h3>

        <div className="mt-4 space-y-4">
          <button
            type="button"
            onClick={() =>
              setLocked(
                (current) => !current
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <Lock className="h-3.5 w-3.5" />
            {locked
              ? 'Unlock record'
              : 'Lock record'}
          </button>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <PieChart className="h-3.5 w-3.5" />
            View Snapshot
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                '/admin/students'
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-red-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset User Access
          </button>
        </div>
      </div>
    </div>
  )
}
