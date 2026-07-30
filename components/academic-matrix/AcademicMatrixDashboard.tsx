'use client'

import {
  AlertTriangle,
  Camera,
  Download,
  History,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import AdminWorkspaceShell from '@/components/admin-workspace/AdminWorkspaceShell'
import type {
  AdminWorkspaceNotification,
  AdminWorkspaceQuickAction,
} from '@/components/admin-workspace/types'
import {
  DonutBreakdown,
  DonutStat,
  HorizontalBars,
  MiniBarChart,
  MiniLineChart,
  SolidPie,
} from '@/components/academic-matrix/AcademicCharts'
import CourseAllocationGrid from '@/components/academic-matrix/CourseAllocationGrid'
import {
  loadAcademicMatrixData,
  type AcademicMatrixData,
  type ResourceMetric,
} from '@/lib/academic-matrix-data'

const INITIAL_DATA: AcademicMatrixData = {
  allocations: [],
  departmentPerformance: [
    {
      label: 'Engineering',
      value: 70,
    },
    {
      label: 'Physical Edu.',
      value: 40,
    },
    {
      label: 'Mathematics',
      value: 80,
    },
  ],
  gpaSeries: [2.4, 2.8, 2.6, 3.2, 3.0, 3.7],
  attendance: [79, 75, 78],
  alerts: [
    {
      label: 'Unassigned classes',
      value: 3,
      tone: 'orange',
    },
    {
      label: 'Low mark alerts',
      value: 5,
      tone: 'red',
    },
    {
      label: 'Heavy workloads',
      value: 2,
      tone: 'blue',
    },
    {
      label: 'Resource alerts',
      value: 4,
      tone: 'green',
    },
  ],
  resources: [],
}

const ALERT_TONES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green:
    'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange:
    'bg-orange-50 text-orange-700 border-orange-100',
  red: 'bg-red-50 text-red-700 border-red-100',
}

const notifications: AdminWorkspaceNotification[] = [
  {
    id: 'n1',
    title: 'Tuition Payment Overdue',
    description:
      '3 accounts have crossed the 30-day arrears threshold. Immediate follow-up required.',
    tone: 'info',
  },
  {
    id: 'n2',
    title: 'System AI Flag Raised',
    description:
      'New anomaly detected in admissions data. Review flagged entry Form No. 102-2865-214.',
    tone: 'info',
  },
  {
    id: 'n3',
    title: 'Upcoming Audit Deadline',
    description:
      'Financial auditing desk report due in 5 days. Ensure ledger entries are reconciled.',
    tone: 'warning',
  },
  {
    id: 'n4',
    title: 'Access Role Change',
    description:
      'James Rodriguez updated to Instructor privileges. Verify classroom assignments.',
    tone: 'success',
  },
]

function PanelHeading({
  title,
}: {
  title: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <h2 className="text-base sm:text-lg font-bold text-black">
        {title}
      </h2>

      <div className="flex items-center gap-2 bg-[#dededc] rounded-full px-2 py-1">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className="w-5 h-2 rounded-full bg-[#20283f]"
          />
        ))}
      </div>
    </div>
  )
}

function PerformanceIndicators({
  data,
}: {
  data: AcademicMatrixData
}) {
  return (
    <section className="mt-5">
      <PanelHeading title="Performance Indicators" />

      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
            <HorizontalBars
              items={
                data.departmentPerformance
              }
            />

            <p className="text-center text-[10px] font-semibold text-gray-700 mt-4">
              Monthly Pass Rate
            </p>
          </div>

          <div className="p-4 border-b border-gray-200 md:border-b-0">
            <MiniLineChart
              values={data.gpaSeries}
            />

            <p className="text-center text-[10px] font-semibold text-gray-700 mt-1">
              Average G.P.A
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 border-t border-gray-200">
          <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="flex items-start justify-around gap-2">
              <DonutStat
                value={data.attendance[0] ?? 0}
                label="Attendance"
                color="#f4a51f"
              />

              <DonutStat
                value={data.attendance[1] ?? 0}
                label="Punctuality"
                color="#8fba31"
              />

              <DonutStat
                value={data.attendance[2] ?? 0}
                label="Completion"
                color="#f05a34"
              />
            </div>

            <p className="text-center text-[10px] font-semibold text-gray-700 mt-4">
              Attendance Rate Indicator
            </p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {data.alerts.map((alert) => (
                <article
                  key={alert.label}
                  className={`rounded-lg border p-2.5 ${
                    ALERT_TONES[
                      alert.tone
                    ]
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />

                    <span className="text-[8px] font-medium leading-tight">
                      {alert.label}
                    </span>
                  </div>

                  <p className="text-xl font-bold mt-2">
                    {alert.value}
                  </p>
                </article>
              ))}
            </div>

            <p className="text-center text-[10px] font-semibold text-gray-700 mt-4">
              Academic Alerts Summary
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ResourceChart({
  resource,
}: {
  resource: ResourceMetric
}) {
  if (resource.chart === 'bars') {
    return (
      <MiniBarChart
        values={resource.values}
        labels={resource.labels}
      />
    )
  }

  if (resource.chart === 'donut') {
    return (
      <DonutBreakdown
        values={resource.values}
        labels={resource.labels}
      />
    )
  }

  if (resource.chart === 'faculty') {
    return (
      <HorizontalBars
        items={resource.labels.map(
          (label, index) => ({
            label,
            value:
              resource.values[index] ?? 0,
          })
        )}
      />
    )
  }

  return (
    <SolidPie
      values={resource.values}
      labels={resource.labels}
    />
  )
}

function ResourceActions({
  resourceId,
}: {
  resourceId: string
}) {
  const actions = [
    {
      label:
        resourceId === 'labs'
          ? 'reassign resources'
          : 'reassign allocations',
      Icon: RefreshCw,
    },
    {
      label: 'historic trends',
      Icon: History,
    },
    {
      label: 'export csv',
      Icon: Download,
    },
    {
      label: 'capacity alerts',
      Icon: AlertTriangle,
      danger: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
      {actions.map(
        ({
          label,
          Icon,
          danger,
        }) => (
          <button
            key={label}
            type="button"
            className="h-9 rounded-md bg-[#07376d] hover:bg-[#0b4789] text-white px-3 flex items-center justify-center sm:justify-start gap-2 transition-colors"
          >
            <Icon
              className={`w-3 h-3 ${
                danger
                  ? 'text-red-400'
                  : 'text-blue-200'
              }`}
            />

            <span className="text-[8px] font-medium">
              {label}
            </span>
          </button>
        )
      )}
    </div>
  )
}

function ResourceAllocation({
  resources,
}: {
  resources: ResourceMetric[]
}) {
  return (
    <section className="mt-7">
      <PanelHeading title="Resource Allocation" />

      <div className="space-y-7">
        {resources.map((resource) => (
          <article
            key={resource.id}
            className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="grid sm:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.75fr)]">
              <div className="p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-gray-200">
                <h3 className="text-xs font-semibold text-gray-800 mb-4">
                  {resource.title}
                </h3>

                <ResourceChart
                  resource={resource}
                />

                <button
                  type="button"
                  className="mt-4 text-[8px] text-gray-400 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  show more
                  <span>›</span>
                </button>
              </div>

              <div className="p-4 sm:p-5 flex items-center">
                <div className="w-full">
                  <ResourceActions
                    resourceId={resource.id}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function AcademicMatrixDashboard() {
  const [query, setQuery] =
    useState('')

  const [data, setData] =
    useState<AcademicMatrixData>(
      INITIAL_DATA
    )

  const [loading, setLoading] =
    useState(true)

  const [locked, setLocked] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)

      try {
        const result =
          await loadAcademicMatrixData()

        if (!cancelled) {
          setData(result)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const quickActions: AdminWorkspaceQuickAction[] = [
    {
      id: 'lock',
      label: locked
        ? 'Unlock record'
        : 'Lock record',
      Icon: Lock,
      onClick: () =>
        setLocked(
          (current) => !current
        ),
    },
    {
      id: 'snapshot',
      label: 'View Snapshot',
      Icon: Camera,
      onClick: () => window.print(),
    },
    {
      id: 'reset',
      label: 'Reset User Access',
      Icon: RefreshCw,
      tone: 'danger',
      onClick: () => {
        window.location.href =
          '/admin/students'
      },
    },
  ]

  return (
    <AdminWorkspaceShell
      title="Academic Matrix Setup"
      activeRoute="academic"
      searchValue={query}
      onSearchChange={setQuery}
      notifications={notifications}
      quickActions={quickActions}
    >
      {loading && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          Loading live academic records...
        </div>
      )}

      {locked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Academic Matrix editing is currently locked.
        </div>
      )}

      <CourseAllocationGrid
        rows={data.allocations}
        query={query}
      />

      <PerformanceIndicators
        data={data}
      />

      <ResourceAllocation
        resources={data.resources}
      />
    </AdminWorkspaceShell>
  )
}
