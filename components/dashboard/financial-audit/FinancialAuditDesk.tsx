"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Query } from "appwrite";

import { databases } from "@/lib/appwrite/config";

type Document = {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  [key: string]: unknown;
};

type LedgerStatus = "Approved" | "Pending" | "Flagged" | "Overdue";

type LedgerRow = {
  id: string;
  date: string;
  timestamp: number;
  studentName: string;
  form: string;
  feeId: string;
  amount: number;
  method: string;
  status: LedgerStatus;
  description: string;
};

type FinancialData = {
  ledger: LedgerRow[];
  totalDue: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  monthlyTrend: number[];
};

const STATUS_STYLES: Record<LedgerStatus, string> = {
  Approved: "bg-emerald-600 text-white",
  Pending: "bg-amber-400 text-amber-950",
  Flagged: "bg-red-600 text-white",
  Overdue: "bg-orange-600 text-white",
};

const EMPTY_FINANCIAL_DATA: FinancialData = {
  ledger: [],
  totalDue: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  collectionRate: 0,
  monthlyTrend: [0, 0, 0, 0, 0, 0],
};

const DEFAULT_LEDGER_ROW_LIMIT = 5;

function collectionId(
  fallback: string,
  ...values: Array<string | undefined>
): string {
  return values.find((value) => value?.trim())?.trim() || fallback;
}

function databaseId(): string {
  const value = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID?.trim();

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  }

  return value;
}

function text(
  document: Document | undefined,
  keys: string[],
  fallback = "",
): string {
  if (!document) {
    return fallback;
  }

  for (const key of keys) {
    const value = document[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return fallback;
}

function numberValue(
  document: Document | undefined,
  keys: string[],
  fallback = 0,
): number {
  if (!document) {
    return fallback;
  }

  for (const key of keys) {
    const value = document[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function parseDate(document: Document, keys: string[]): Date {
  const raw = text(document, keys, document.$createdAt || "");

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function normalizeStatus(raw: string): LedgerStatus {
  const status = raw.trim().toLowerCase();

  if (
    status.includes("flag") ||
    status.includes("reject") ||
    status.includes("fail")
  ) {
    return "Flagged";
  }

  if (status.includes("pending") || status.includes("processing")) {
    return "Pending";
  }

  if (status.includes("overdue") || status.includes("late")) {
    return "Overdue";
  }

  return "Approved";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

async function safeList(collection: string): Promise<Document[]> {
  try {
    const response = await databases.listDocuments(databaseId(), collection, [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);

    return response.documents as unknown as Document[];
  } catch (error) {
    console.warn(`Could not load ${collection}:`, error);

    return [];
  }
}

function buildMonthlyTrend(payments: Document[]): number[] {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;

    const target = new Date(now.getFullYear(), now.getMonth() - offset, 1);

    return payments
      .filter((payment) => {
        const date = parseDate(payment, ["Date", "PaymentDate"]);

        return (
          date.getFullYear() === target.getFullYear() &&
          date.getMonth() === target.getMonth()
        );
      })
      .reduce((sum, payment) => sum + numberValue(payment, ["Amount"]), 0);
  });
}

async function loadFinancialData(): Promise<FinancialData> {
  const [fees, payments, students, users] = await Promise.all([
    safeList(
      collectionId("fees", process.env.NEXT_PUBLIC_APPWRITE_FEES_COLLECTION_ID),
    ),
    safeList(
      collectionId(
        "payments",
        process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID,
      ),
    ),
    safeList(
      collectionId(
        "students",
        process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID,
      ),
    ),
    safeList(
      collectionId(
        "users",
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      ),
    ),
  ]);

  const feesById = new Map(fees.map((document) => [document.$id, document]));

  const studentsById = new Map(
    students.map((document) => [document.$id, document]),
  );

  const usersById = new Map(users.map((document) => [document.$id, document]));

  const ledger = payments.map((payment): LedgerRow => {
    const feeId = text(payment, ["feeId", "FeeId"], payment.$id);

    const fee = feesById.get(feeId);

    const student = studentsById.get(text(fee, ["studentId", "StudentId"]));

    const user = usersById.get(text(student, ["userId", "UserId"]));

    const date = parseDate(payment, ["Date", "PaymentDate"]);

    return {
      id: payment.$id,
      date: date.getTime() === 0 ? "Not recorded" : date.toLocaleDateString(),
      timestamp: date.getTime(),
      studentName: `${text(user, ["FirstName"], "Unknown")} ${text(user, [
        "LastName",
      ])}`.trim(),
      form:
        text(fee, ["LevelOrForm"]) ||
        text(student, ["Form", "Level"], "Not assigned"),
      feeId,
      amount: numberValue(payment, ["Amount"]),
      method: text(payment, ["Method"], "Not recorded"),
      status: normalizeStatus(text(payment, ["Status"], "Approved")),
      description: text(fee, ["Description"], "Fee payment"),
    };
  });

  const totalDue = fees.reduce(
    (sum, fee) => sum + numberValue(fee, ["AmountDue"]),
    0,
  );

  const totalCollected = payments.reduce(
    (sum, payment) => sum + numberValue(payment, ["Amount"]),
    0,
  );

  return {
    ledger,
    totalDue,
    totalCollected,
    totalOutstanding: Math.max(0, totalDue - totalCollected),
    collectionRate:
      totalDue > 0 ? Math.min(100, (totalCollected / totalDue) * 100) : 0,
    monthlyTrend: buildMonthlyTrend(payments),
  };
}

function BarChart({ values }: { values: number[] }) {
  const maximum = Math.max(1, ...values);

  return (
    <div className="flex h-16 items-end justify-center gap-2">
      {values.map((value, index) => (
        <span
          key={index}
          className="w-3 rounded-t bg-white/90"
          style={{
            height: `${
              value === 0 ? 3 : Math.max(8, (value / maximum) * 100)
            }%`,
          }}
          title={money(value)}
        />
      ))}
    </div>
  );
}

function KpiCard({
  title,
  value,
  caption,
  className,
  children,
}: {
  title: string;
  value: string;
  caption: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <article>
      <h3 className="mb-2 text-xs font-bold text-gray-950">{title}</h3>

      <div
        className={`${className} min-h-[145px] rounded-2xl p-4 text-white shadow-sm`}
      >
        {children}

        <p className="text-center text-2xl font-semibold text-white">{value}</p>

        <p className="mt-2 text-center text-[9px] text-white/85">{caption}</p>
      </div>
    </article>
  );
}

function csvText(rows: LedgerRow[]): string {
  return [
    ["Date", "Student", "Class", "Fee ID", "Amount", "Method", "Status"],
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
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

function exportLedger(rows: LedgerRow[]): void {
  const url = URL.createObjectURL(
    new Blob([csvText(rows)], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "financial-ledger.csv";

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-10 w-12 items-center justify-center border-r border-gray-200 transition-colors last:border-r-0 ${
        active
          ? "bg-[#20283f] text-white"
          : "bg-white text-[#20283f] hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function FinancialAuditDesk() {
  const [data, setData] = useState<FinancialData>(EMPTY_FINANCIAL_DATA);

  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");

  const [status, setStatus] = useState<"All" | LedgerStatus>("All");

  const [selected, setSelected] = useState<LedgerRow | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(true);

  const [ledgerRowLimit, setLedgerRowLimit] = useState(
    DEFAULT_LEDGER_ROW_LIMIT,
  );

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [shareMessage, setShareMessage] = useState("");

  const ledgerSectionRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLedgerRowLimit(DEFAULT_LEDGER_ROW_LIMIT);

    try {
      setData(await loadFinancialData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === ledgerSectionRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.ledger.filter((row) => {
      const matchesStatus = status === "All" || row.status === status;

      const matchesQuery =
        !normalized ||
        [row.studentName, row.form, row.feeId, row.method, row.status].some(
          (value) => value.toLowerCase().includes(normalized),
        );

      return matchesStatus && matchesQuery;
    });
  }, [data.ledger, query, status]);

  const isLedgerExpanded =
    rows.length > DEFAULT_LEDGER_ROW_LIMIT && ledgerRowLimit >= rows.length;

  const visibleRows = rows.slice(0, Math.min(ledgerRowLimit, rows.length));

  const toggleLedgerRows = () => {
    setLedgerRowLimit((currentLimit) =>
      currentLimit > DEFAULT_LEDGER_ROW_LIMIT
        ? DEFAULT_LEDGER_ROW_LIMIT
        : Math.max(DEFAULT_LEDGER_ROW_LIMIT, rows.length),
    );
  };

  const current = data.monthlyTrend.at(-1) || 0;

  const previous = data.monthlyTrend.at(-2) || 0;

  const trend =
    previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0
        ? 100
        : 0;

  const resetLedgerView = () => {
    setQuery("");
    setStatus("All");
    setFiltersOpen(true);
    setLedgerRowLimit(DEFAULT_LEDGER_ROW_LIMIT);
  };

  const shareLedger = async () => {
    const summary = `Financial ledger: ${rows.length} record${
      rows.length === 1 ? "" : "s"
    }, ${money(data.totalCollected)} collected and ${money(
      data.totalOutstanding,
    )} outstanding.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Financial Ledger",
          text: summary,
        });

        setShareMessage("Ledger summary shared.");
      } else {
        await navigator.clipboard.writeText(summary);

        setShareMessage("Ledger summary copied.");
      }
    } catch (error) {
      const name = error instanceof Error ? error.name : "";

      if (name !== "AbortError") {
        console.error("Unable to share ledger:", error);

        setShareMessage("Unable to share ledger.");
      }
    }

    window.setTimeout(() => setShareMessage(""), 2500);
  };

  const toggleLedgerFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await ledgerSectionRef.current?.requestFullscreen();
    } catch (error) {
      console.error("Unable to toggle ledger fullscreen:", error);
    }
  };

  return (
    <div className="space-y-10 pb-10 text-[#20283f]">
      {loading && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
          Loading live financial records...
        </div>
      )}

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Financial KPI Charts</h2>

          <button
            type="button"
            onClick={() => void reload()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#20283f] hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <KpiCard
            title="Tuition collection rate"
            value={`${data.collectionRate.toFixed(1)}%`}
            caption={`${money(data.totalCollected)} collected`}
            className="bg-blue-600"
          >
            <div className="mb-2 flex h-16 items-end justify-center gap-2">
              <span
                className="w-8 rounded-t bg-white/90"
                style={{
                  height: `${Math.max(3, data.collectionRate)}%`,
                }}
              />

              <span
                className="w-8 rounded-t bg-white/30"
                style={{
                  height: `${Math.max(3, 100 - data.collectionRate)}%`,
                }}
              />
            </div>
          </KpiCard>

          <KpiCard
            title="Monthly revenue trend"
            value={`${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`}
            caption={money(current)}
            className="bg-green-600"
          >
            <BarChart values={data.monthlyTrend} />
          </KpiCard>

          <KpiCard
            title="Outstanding balance"
            value={money(data.totalOutstanding)}
            caption={`${money(data.totalDue)} billed`}
            className="bg-orange-600"
          >
            <div className="mb-2 flex h-16 items-center justify-center">
              <div
                className="h-14 w-14 rounded-full"
                style={{
                  background:
                    `conic-gradient(` +
                    `#111827 0 ${data.collectionRate}%, ` +
                    `rgba(255,255,255,.90) ${data.collectionRate}% 100%)`,
                }}
              />
            </div>
          </KpiCard>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-black">Ledger Overview</h2>

            <p className="mt-1 text-xs font-medium text-gray-500">
              Showing live Appwrite payment records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {shareMessage && (
              <span className="text-xs font-semibold text-emerald-700">
                {shareMessage}
              </span>
            )}

            <button
              type="button"
              onClick={() => exportLedger(rows)}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export ledger
            </button>

            <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
              <ToolbarButton
                label="Share ledger summary"
                onClick={() => void shareLedger()}
              >
                <Share2 className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label={
                  filtersOpen ? "Hide ledger filters" : "Show ledger filters"
                }
                active={filtersOpen}
                onClick={() => setFiltersOpen((currentValue) => !currentValue)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label="Reset ledger view"
                onClick={resetLedgerView}
              >
                <RotateCcw className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label={
                  isLedgerExpanded
                    ? "Show first five records"
                    : "Expand all ledger records"
                }
                active={isLedgerExpanded}
                onClick={toggleLedgerRows}
              >
                {isLedgerExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </ToolbarButton>
            </div>
          </div>
        </div>

        <div
          ref={ledgerSectionRef}
          className="rounded-xl border border-gray-300 bg-white p-4 text-[#20283f] shadow-sm fullscreen:overflow-auto fullscreen:rounded-none fullscreen:bg-[#f5f5f2] fullscreen:p-8"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-600">
              Showing{" "}
              <span className="font-bold text-[#20283f]">
                {visibleRows.length}
              </span>{" "}
              of <span className="font-bold text-[#20283f]">{rows.length}</span>{" "}
              matching records
            </p>

            <button
              type="button"
              onClick={() => void toggleLedgerFullscreen()}
              className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#20283f] hover:bg-gray-100 sm:flex"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}

              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          </div>

          {filtersOpen && (
            <div className="mb-5 grid gap-3 sm:grid-cols-[225px_minmax(0,1fr)]">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "All" | LedgerStatus)
                }
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-[#20283f] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Flagged">Flagged</option>
                <option value="Overdue">Overdue</option>
              </select>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search student, fee ID or method..."
                className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-[#20283f] outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs text-[#20283f]">
              <thead className="bg-[#20283f] text-white">
                <tr>
                  <th className="px-4 py-4 font-bold text-white">Date</th>
                  <th className="px-4 py-4 font-bold text-white">Student</th>
                  <th className="px-4 py-4 font-bold text-white">Fee ID</th>
                  <th className="px-4 py-4 font-bold text-white">Amount</th>
                  <th className="px-4 py-4 font-bold text-white">Method</th>
                  <th className="px-4 py-4 font-bold text-white">Status</th>
                  <th className="px-4 py-4 font-bold text-white">Action</th>
                </tr>
              </thead>

              <tbody
                className={`bg-white text-[#20283f] ${
                  isLedgerExpanded ? "" : "[&>tr:nth-child(n+6)]:hidden"
                }`}
              >
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 bg-white text-[#20283f] transition-colors hover:bg-blue-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {row.date}
                    </td>

                    <td className="px-4 py-4">
                      <strong className="block text-sm font-bold text-[#20283f]">
                        {row.studentName}
                      </strong>

                      <span className="mt-0.5 block text-xs font-medium text-gray-500">
                        {row.form}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-700">
                      {row.feeId}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-[#20283f]">
                      {money(row.amount)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-semibold capitalize text-gray-700">
                      {row.method}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-md px-3 py-1.5 text-[10px] font-bold ${STATUS_STYLES[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="py-10 text-center text-sm font-medium text-gray-500">
              No payment records exist for the current filters.
            </p>
          )}

          {rows.length > DEFAULT_LEDGER_ROW_LIMIT && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500">
                {isLedgerExpanded
                  ? `All ${rows.length} records are visible.`
                  : `The first ${DEFAULT_LEDGER_ROW_LIMIT} of ${rows.length} records are visible.`}
              </p>

              <button
                type="button"
                onClick={toggleLedgerRows}
                className="rounded-lg border border-[#20283f] bg-white px-4 py-2 text-xs font-bold text-[#20283f] hover:bg-[#20283f] hover:text-white"
              >
                {isLedgerExpanded ? "Collapse" : "Show all"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-black">Audit Trail</h2>

        <div className="grid gap-5 rounded-xl border border-gray-300 bg-white p-5 text-[#20283f] shadow-sm lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <h3 className="text-sm font-bold text-[#20283f]">
              Recent payment activity
            </h3>

            <ol className="mt-4 space-y-4">
              {data.ledger.slice(0, 8).map((row) => (
                <li key={row.id} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />

                  <div>
                    <p className="text-xs font-semibold text-[#20283f]">
                      {row.studentName} · {row.status}
                    </p>

                    <p className="text-[10px] font-medium text-gray-500">
                      {row.date} · {money(row.amount)} · {row.method}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {data.ledger.length === 0 && (
              <p className="mt-4 text-sm font-medium text-gray-500">
                No payment activity exists in Appwrite.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Collected", money(data.totalCollected), WalletCards],
              ["Outstanding", money(data.totalOutstanding), AlertTriangle],
              ["Payments", String(data.ledger.length), FileSearch],
              [
                "Trend",
                `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`,
                trend >= 0 ? TrendingUp : TrendingDown,
              ],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof WalletCards;

              return (
                <article
                  key={String(label)}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-[#20283f]"
                >
                  <MetricIcon className="h-5 w-5 text-blue-600" />

                  <p className="mt-3 text-[10px] font-semibold uppercase text-gray-500">
                    {String(label)}
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#20283f]">
                    {String(value)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white text-[#20283f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-[#20283f]">Payment entry</h3>

                <p className="text-xs font-medium text-gray-500">
                  {selected.feeId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-[#20283f] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5 text-sm">
              {[
                ["Student", selected.studentName],
                ["Class", selected.form],
                ["Amount", money(selected.amount)],
                ["Date", selected.date],
                ["Method", selected.method],
                ["Description", selected.description],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="font-medium text-gray-500">{label}</span>

                  <strong className="text-right text-[#20283f]">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinancialAuditSidePanel() {
  const [alerts, setAlerts] = useState<LedgerRow[]>([]);

  useEffect(() => {
    void loadFinancialData().then((result) => {
      setAlerts(
        result.ledger.filter(
          (row) =>
            row.status === "Pending" ||
            row.status === "Flagged" ||
            row.status === "Overdue",
        ),
      );
    });
  }, []);

  return (
    <div className="pt-2">
      <h3 className="mb-4 mt-8 text-sm font-bold text-white">
        Financial Alerts
      </h3>

      <div className="space-y-4 border-t border-white/10 pt-4">
        {alerts.slice(0, 6).map((row) => (
          <article key={row.id} className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />

            <div>
              <p className="text-[10px] font-semibold text-white">
                {row.status}: {row.studentName}
              </p>

              <p className="mt-1 text-[8px] text-gray-400">
                {money(row.amount)} · {row.method} · {row.date}
              </p>
            </div>
          </article>
        ))}

        {alerts.length === 0 && (
          <p className="text-xs text-gray-400">
            No pending, flagged or overdue payments.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <CalendarDays className="h-4 w-4" />
          Print live snapshot
        </button>
      </div>
    </div>
  );
}
