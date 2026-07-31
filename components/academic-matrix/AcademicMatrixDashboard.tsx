"use client";

import {
  AlertTriangle,
  Camera,
  Download,
  History,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import AdminWorkspaceShell from "@/components/admin-workspace/AdminWorkspaceShell";
import type {
  AdminWorkspaceNotification,
  AdminWorkspaceQuickAction,
} from "@/components/admin-workspace/types";
import {
  DonutBreakdown,
  DonutStat,
  HorizontalBars,
  MiniBarChart,
  MiniLineChart,
  SolidPie,
} from "@/components/academic-matrix/AcademicCharts";
import CourseAllocationGrid from "@/components/academic-matrix/CourseAllocationGrid";
import {
  loadAcademicMatrixData,
  type AcademicMatrixData,
  type ResourceMetric,
} from "@/lib/academic-matrix-data";

const INITIAL_DATA: AcademicMatrixData = {
  allocations: [],
  departmentPerformance: [],
  gpaSeries: [0],
  attendance: [0, 0, 0],
  alerts: [],
  resources: [],
};
const ALERT_TONES = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  red: "bg-red-50 text-red-700 border-red-100",
};

interface PanelHeaderAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function HeaderActions({
  actions,
  compact = false,
}: {
  actions: PanelHeaderAction[];
  compact?: boolean;
}) {
  return (
    <div className="flex flex-shrink-0 items-center overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      {actions.map(({ id, label, Icon, onClick, disabled, loading }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={label}
          aria-label={label}
          className={`flex items-center justify-center border-r border-gray-200 text-[#20283f] transition-colors last:border-r-0 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45 ${
            compact ? "h-8 w-9" : "h-9 w-10"
          }`}
        >
          <Icon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      ))}
    </div>
  );
}

function PanelHeading({
  title,
  actions,
}: {
  title: string;
  actions: PanelHeaderAction[];
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-base font-bold text-black sm:text-lg">{title}</h2>

      <HeaderActions actions={actions} />
    </div>
  );
}

function PerformanceIndicators({
  data,
  actions,
}: {
  data: AcademicMatrixData;
  actions: PanelHeaderAction[];
}) {
  return (
    <section className="mt-10 lg:mt-12">
      <PanelHeading title="Performance Indicators" actions={actions} />

      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="border-b border-gray-200 p-4 md:border-b-0 md:border-r">
            <HorizontalBars items={data.departmentPerformance} />

            <p className="mt-4 text-center text-[10px] font-semibold text-gray-700">
              Monthly Pass Rate
            </p>
          </div>

          <div className="border-b border-gray-200 p-4 md:border-b-0">
            <MiniLineChart values={data.gpaSeries} />

            <p className="mt-1 text-center text-[10px] font-semibold text-gray-700">
              Average G.P.A
            </p>
          </div>
        </div>

        <div className="grid border-t border-gray-200 md:grid-cols-2">
          <div className="border-b border-gray-200 p-4 md:border-b-0 md:border-r">
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

            <p className="mt-4 text-center text-[10px] font-semibold text-gray-700">
              Attendance Rate Indicator
            </p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {data.alerts.map((alert) => (
                <article
                  key={alert.label}
                  className={`rounded-lg border p-2.5 ${
                    ALERT_TONES[alert.tone]
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />

                    <span className="text-[8px] font-medium leading-tight">
                      {alert.label}
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold">{alert.value}</p>
                </article>
              ))}
            </div>

            <p className="mt-4 text-center text-[10px] font-semibold text-gray-700">
              Academic Alerts Summary
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResourceChart({ resource }: { resource: ResourceMetric }) {
  if (resource.chart === "bars") {
    return <MiniBarChart values={resource.values} labels={resource.labels} />;
  }

  if (resource.chart === "donut") {
    return <DonutBreakdown values={resource.values} labels={resource.labels} />;
  }

  if (resource.chart === "faculty") {
    return (
      <HorizontalBars
        items={resource.labels.map((label, index) => ({
          label,
          value: resource.values[index] ?? 0,
        }))}
      />
    );
  }

  return <SolidPie values={resource.values} labels={resource.labels} />;
}

function ResourceActions({ resourceId }: { resourceId: string }) {
  const actions = [
    {
      label:
        resourceId === "labs" ? "reassign resources" : "reassign allocations",
      Icon: RefreshCw,
    },
    {
      label: "historic trends",
      Icon: History,
    },
    {
      label: "export csv",
      Icon: Download,
    },
    {
      label: "capacity alerts",
      Icon: AlertTriangle,
      danger: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
      {actions.map(({ label, Icon, danger }) => (
        <button
          key={label}
          type="button"
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#07376d] px-3 text-white transition-colors hover:bg-[#0b4789] sm:justify-start"
        >
          <Icon
            className={`h-3 w-3 ${danger ? "text-red-400" : "text-blue-200"}`}
          />

          <span className="text-[8px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

function ResourceAllocation({
  resources,
  actions,
  getResourceActions,
}: {
  resources: ResourceMetric[];
  actions: PanelHeaderAction[];
  getResourceActions: (resource: ResourceMetric) => PanelHeaderAction[];
}) {
  return (
    <section className="mt-12 lg:mt-16">
      <PanelHeading title="Resource Allocation" actions={actions} />

      <div className="space-y-10 lg:space-y-12">
        {resources.map((resource) => (
          <article
            key={resource.id}
            id={`resource-${resource.id}`}
            data-resource-card={resource.id}
            className="scroll-mt-6 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm"
          >
            <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 sm:px-5">
              <h3 className="text-xs font-semibold text-gray-800 sm:text-sm">
                {resource.title}
              </h3>
            </header>

            <div className="grid sm:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.75fr)]">
              <div className="border-b border-gray-200 p-4 sm:border-b-0 sm:border-r sm:p-5">
                <ResourceChart resource={resource} />

                <button
                  type="button"
                  className="mt-5 inline-flex items-center gap-1 text-[8px] text-gray-400 hover:text-gray-700"
                >
                  show more
                </button>
              </div>

              <div className="flex items-center p-4 sm:p-5">
                <div className="w-full">
                  <ResourceActions resourceId={resource.id} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadCsv(
  filename: string,
  rows: Array<Array<string | number>>,
): void {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function AcademicMatrixDashboard() {
  const [query, setQuery] = useState("");

  const [data, setData] = useState<AcademicMatrixData>(INITIAL_DATA);

  const [loading, setLoading] = useState(true);

  const [locked, setLocked] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const reloadData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await loadAcademicMatrixData();

      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  };

  const exportPerformance = () => {
    const rows: Array<Array<string | number>> = [
      ["Performance Indicators"],
      ["Department", "Pass Rate"],
      ...data.departmentPerformance.map((item) => [
        item.label,
        `${item.value}%`,
      ]),
      [],
      ["GPA Series"],
      ["Period", ...data.gpaSeries.map((_, index) => `Period ${index + 1}`)],
      ["GPA", ...data.gpaSeries],
      [],
      ["Attendance", "Punctuality", "Completion"],
      data.attendance,
      [],
      ["Alert", "Count"],
      ...data.alerts.map((alert) => [alert.label, alert.value]),
    ];

    downloadCsv("academic-performance.csv", rows);
  };

  const exportResources = () => {
    const rows: Array<Array<string | number>> = [
      ["Resource", "Metric", "Value"],
    ];

    data.resources.forEach((resource) => {
      resource.labels.forEach((label, index) => {
        rows.push([resource.title, label, resource.values[index] ?? 0]);
      });
    });

    downloadCsv("resource-allocation.csv", rows);
  };

  const exportSingleResource = (resource: ResourceMetric) => {
    downloadCsv(`${resource.id}-resource.csv`, [
      ["Resource", resource.title],
      ["Metric", "Value"],
      ...resource.labels.map((label, index) => [
        label,
        resource.values[index] ?? 0,
      ]),
    ]);
  };

  const toggleResourceFullscreen = async (resourceId: string) => {
    try {
      const element = document.getElementById(`resource-${resourceId}`);

      if (!element) {
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle resource fullscreen:", error);
    }
  };

  const getResourceHeaderActions = (
    resource: ResourceMetric,
  ): PanelHeaderAction[] => [
    {
      id: `${resource.id}-refresh`,
      label: `Refresh ${resource.title}`,
      Icon: RefreshCw,
      onClick: () => {
        void reloadData();
      },
      disabled: loading,
      loading,
    },
    {
      id: `${resource.id}-export`,
      label: `Export ${resource.title}`,
      Icon: Download,
      onClick: () => exportSingleResource(resource),
    },
    {
      id: `${resource.id}-snapshot`,
      label: `Print ${resource.title} snapshot`,
      Icon: Camera,
      onClick: () => window.print(),
    },
    {
      id: `${resource.id}-fullscreen`,
      label: `Open ${resource.title} fullscreen`,
      Icon: Maximize2,
      onClick: () => {
        void toggleResourceFullscreen(resource.id);
      },
    },
  ];

  const sharedFullscreenAction: PanelHeaderAction = {
    id: "fullscreen",
    label: isFullscreen ? "Exit fullscreen" : "Open fullscreen",
    Icon: isFullscreen ? Minimize2 : Maximize2,
    onClick: () => {
      void toggleFullscreen();
    },
  };

  const performanceActions: PanelHeaderAction[] = [
    {
      id: "refresh-performance",
      label: "Refresh performance data",
      Icon: RefreshCw,
      onClick: () => {
        void reloadData();
      },
      disabled: loading,
      loading,
    },
    {
      id: "export-performance",
      label: "Export performance CSV",
      Icon: Download,
      onClick: exportPerformance,
    },
    {
      id: "snapshot-performance",
      label: "Print performance snapshot",
      Icon: Camera,
      onClick: () => window.print(),
    },
    sharedFullscreenAction,
  ];

  const resourceHeaderActions: PanelHeaderAction[] = [
    {
      id: "refresh-resources",
      label: "Refresh resource data",
      Icon: RefreshCw,
      onClick: () => {
        void reloadData();
      },
      disabled: loading,
      loading,
    },
    {
      id: "export-resources",
      label: "Export resource CSV",
      Icon: Download,
      onClick: exportResources,
    },
    {
      id: "resource-history",
      label: "View resource history",
      Icon: History,
      onClick: () => {
        document.querySelector("[data-resource-section]")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      },
    },
    sharedFullscreenAction,
  ];

  const quickActions: AdminWorkspaceQuickAction[] = [
    {
      id: "lock",
      label: locked ? "Unlock record" : "Lock record",
      Icon: Lock,
      onClick: () => setLocked((current) => !current),
    },
    {
      id: "snapshot",
      label: "View Snapshot",
      Icon: Camera,
      onClick: () => window.print(),
    },
    {
      id: "reset",
      label: "Reset User Access",
      Icon: RefreshCw,
      tone: "danger",
      onClick: () => {
        window.location.href = "/admin/students";
      },
    },
  ];

  const liveNotifications: AdminWorkspaceNotification[] = data.alerts
    .filter((alert) => alert.value > 0)
    .map((alert, index) => ({
      id: `academic-alert-${index}`,
      title: alert.label,
      description: `${alert.value} live database record${
        alert.value === 1 ? "" : "s"
      } require attention.`,
      tone:
        alert.tone === "red"
          ? "warning"
          : alert.tone === "green"
            ? "success"
            : "info",
    }));
  return (
    <AdminWorkspaceShell
      title="Academic Matrix Setup"
      activeRoute="academic"
      searchValue={query}
      onSearchChange={setQuery}
      notifications={liveNotifications}
      quickActions={quickActions}
    >
      {loading && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Loading live academic records...
        </div>
      )}

      {locked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Academic Matrix editing is currently locked.
        </div>
      )}

      <CourseAllocationGrid rows={data.allocations} query={query} />

      <PerformanceIndicators data={data} actions={performanceActions} />

      <div data-resource-section>
        <ResourceAllocation
          resources={data.resources}
          actions={resourceHeaderActions}
          getResourceActions={getResourceHeaderActions}
        />
      </div>
    </AdminWorkspaceShell>
  );
}
