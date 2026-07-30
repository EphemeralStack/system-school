'use client'

import {
  Maximize2,
  MoreVertical,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'

import type { CourseAllocationRow } from '@/lib/academic-matrix-data'

function WorkloadBar({
  value,
}: {
  value: number
}) {
  const color =
    value >= 85
      ? '#dc2626'
      : value >= 70
        ? '#ef7b23'
        : value >= 50
          ? '#e8b426'
          : '#28a745'

  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-20 bg-gray-200 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${Math.min(
              100,
              value
            )}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <span className="text-[8px] font-semibold text-gray-600">
        {value}%
      </span>
    </div>
  )
}

export default function CourseAllocationGrid({
  rows,
  query,
}: {
  rows: CourseAllocationRow[]
  query: string
}) {
  const normalizedQuery =
    query.trim().toLowerCase()

  const filteredRows = rows.filter(
    (row) =>
      !normalizedQuery ||
      [
        row.teacherName,
        row.courseCode,
        row.courseTitle,
        row.department,
        row.className,
      ].some((value) =>
        value
          .toLowerCase()
          .includes(normalizedQuery)
      )
  )

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-base sm:text-lg font-bold text-black">
          Course Allocation Grid
        </h2>

        <div className="hidden sm:flex items-center rounded-lg overflow-hidden border border-gray-300 bg-white">
          {[
            Share2,
            SlidersHorizontal,
            RotateCcw,
            Maximize2,
          ].map((Icon, index) => (
            <button
              key={index}
              type="button"
              className="w-9 h-7 flex items-center justify-center text-gray-700 border-r last:border-r-0 border-gray-200 hover:bg-gray-100"
              aria-label={`Course allocation tool ${
                index + 1
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-[#20283f] text-white">
              <tr className="text-[9px]">
                <th className="text-left font-semibold px-3 py-2.5">
                  Instructor
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  Course ID & Title
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  Department
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  Credits / Semester
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  Workload
                </th>
                <th className="text-left font-semibold px-3 py-2.5">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(
                (row, index) => (
                  <tr
                    key={row.id}
                    className={`text-[9px] text-gray-700 border-b border-gray-200 last:border-b-0 ${
                      index % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#286294] text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                          {row.avatar ? (
                            <img
                              src={row.avatar}
                              alt={row.teacherName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            row.teacherInitials
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {row.teacherName}
                          </p>
                          <p className="text-[7px] text-gray-400">
                            {row.className}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900">
                        {row.courseCode} -{' '}
                        {row.courseTitle}
                      </p>
                    </td>

                    <td className="px-3 py-2">
                      {row.department}
                    </td>

                    <td className="px-3 py-2">
                      <p>
                        {row.credits} credits /{' '}
                        {row.semester}
                      </p>
                    </td>

                    <td className="px-3 py-2">
                      <WorkloadBar
                        value={row.workload}
                      />
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="h-5 px-2 rounded-sm bg-blue-600 text-white text-[7px] font-semibold hover:bg-blue-500"
                        >
                          Reassign
                        </button>

                        <button
                          type="button"
                          className="w-5 h-5 rounded-sm bg-[#20283f] text-white flex items-center justify-center"
                          aria-label="More allocation actions"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          className="w-5 h-5 rounded-sm bg-red-600 text-white flex items-center justify-center"
                          aria-label="Remove allocation"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredRows.map((row) => (
            <article
              key={row.id}
              className="p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#286294] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {row.avatar ? (
                    <img
                      src={row.avatar}
                      alt={row.teacherName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    row.teacherInitials
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900">
                    {row.teacherName}
                  </p>

                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.courseCode} ·{' '}
                    {row.courseTitle}
                  </p>

                  <p className="text-[10px] text-gray-400 mt-1">
                    {row.department} ·{' '}
                    {row.className}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <WorkloadBar
                  value={row.workload}
                />

                <button
                  type="button"
                  className="h-7 px-3 rounded-md bg-blue-600 text-white text-[10px] font-semibold"
                >
                  Reassign
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredRows.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            No course allocations match your search.
          </div>
        )}
      </div>
    </section>
  )
}
