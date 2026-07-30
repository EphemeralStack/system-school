'use client'

const CHART_COLORS = [
  '#f4bd32',
  '#ec6f51',
  '#27b7c5',
  '#6a55d8',
  '#5aa852',
  '#e34b91',
  '#3f7ad8',
]

export function HorizontalBars({
  items,
}: {
  items: Array<{
    label: string
    value: number
  }>
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="grid grid-cols-[82px_1fr] items-center gap-3"
        >
          <span className="text-[10px] text-gray-700 truncate">
            {item.label}
          </span>

          <div className="h-5 bg-gray-200 rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${Math.max(
                  8,
                  Math.min(100, item.value)
                )}%`,
                backgroundColor:
                  CHART_COLORS[
                    index %
                      CHART_COLORS.length
                  ],
              }}
            />

            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white mix-blend-difference">
              {item.value}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MiniLineChart({
  values,
}: {
  values: number[]
}) {
  const safeValues =
    values.length > 1
      ? values
      : [2, 2.5, 3]

  const width = 260
  const height = 120
  const padding = 18

  const minValue = Math.min(
    ...safeValues,
    0
  )

  const maxValue = Math.max(
    ...safeValues,
    4
  )

  const range =
    maxValue - minValue || 1

  const points = safeValues
    .map((value, index) => {
      const x =
        padding +
        (index /
          (safeValues.length - 1)) *
          (width - padding * 2)

      const y =
        height -
        padding -
        ((value - minValue) / range) *
          (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')

  const companion = safeValues
    .map((value, index) => {
      const shifted =
        Math.max(
          0,
          value -
            0.45 +
            (index % 2 === 0
              ? 0.25
              : -0.1)
        )

      const x =
        padding +
        (index /
          (safeValues.length - 1)) *
          (width - padding * 2)

      const y =
        height -
        padding -
        ((shifted - minValue) /
          range) *
          (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-1">
        <span className="inline-flex items-center gap-1 text-[8px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-[#7f63e8]" />
          GPA
        </span>

        <span className="inline-flex items-center gap-1 text-[8px] text-gray-500">
          <span className="w-2 h-2 rounded-full bg-[#22b8c7]" />
          Target
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-28"
        role="img"
        aria-label="Average GPA trend"
      >
        {[1, 2, 3].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={
              padding +
              line *
                ((height -
                  padding * 2) /
                  4)
            }
            y2={
              padding +
              line *
                ((height -
                  padding * 2) /
                  4)
            }
            stroke="#d5d8df"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        <polyline
          points={companion}
          fill="none"
          stroke="#22b8c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={points}
          fill="none"
          stroke="#7f63e8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {safeValues.map(
          (value, index) => {
            const [x, y] =
              points
                .split(' ')
                [index].split(',')
                .map(Number)

            return (
              <circle
                key={`${value}-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#ffffff"
                stroke="#7f63e8"
                strokeWidth="2"
              />
            )
          }
        )}
      </svg>
    </div>
  )
}

export function DonutStat({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, value)
  )

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-14 h-14 rounded-full p-[7px]"
        style={{
          background: `conic-gradient(${color} ${safeValue}%, #ececec ${safeValue}% 100%)`,
        }}
      >
        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-gray-800">
            {safeValue}%
          </span>
        </div>
      </div>

      <span className="text-[8px] text-gray-500 text-center mt-1 max-w-16">
        {label}
      </span>
    </div>
  )
}

export function MiniBarChart({
  values,
  labels,
}: {
  values: number[]
  labels: string[]
}) {
  const maxValue = Math.max(
    1,
    ...values
  )

  return (
    <div className="h-32 flex items-end gap-2 border-l border-b border-gray-300 pl-3 pb-3">
      {values.map((value, index) => {
        const normalized =
          (value / maxValue) * 100

        return (
          <div
            key={`${labels[index]}-${index}`}
            className="flex-1 min-w-0 flex items-end justify-center gap-[2px] h-full relative"
          >
            {[0.58, 0.8, 1].map(
              (multiplier, seriesIndex) => (
                <span
                  key={seriesIndex}
                  className="w-[20%] min-w-[3px] rounded-t-sm"
                  style={{
                    height: `${Math.max(
                      10,
                      normalized *
                        multiplier
                    )}%`,
                    backgroundColor:
                      CHART_COLORS[
                        (index +
                          seriesIndex) %
                          4
                      ],
                  }}
                />
              )
            )}

            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[6px] text-gray-500 truncate max-w-12">
              {labels[index] ??
                `Item ${index + 1}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DonutBreakdown({
  values,
  labels,
}: {
  values: number[]
  labels: string[]
}) {
  const normalizedTotal =
    values.reduce(
      (total, value) =>
        total + Math.max(0, value),
      0
    ) || 1

  let cursor = 0

  const segments = values.map(
    (value, index) => {
      const start = cursor
      const size =
        (Math.max(0, value) /
          normalizedTotal) *
        100
      cursor += size

      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${cursor}%`
    }
  )

  return (
    <div className="flex items-center gap-5">
      <div
        className="w-28 h-28 rounded-full p-6 flex-shrink-0"
        style={{
          background: `conic-gradient(${segments.join(
            ', '
          )})`,
        }}
      >
        <div className="w-full h-full bg-white rounded-full" />
      </div>

      <div className="space-y-1 min-w-0">
        {labels.slice(0, 5).map(
          (label, index) => (
            <div
              key={label}
              className="flex items-center gap-1.5"
            >
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor:
                    CHART_COLORS[
                      index %
                        CHART_COLORS.length
                    ],
                }}
              />

              <span className="text-[7px] text-gray-500 truncate">
                {label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function SolidPie({
  values,
  labels,
}: {
  values: number[]
  labels: string[]
}) {
  const total =
    values.reduce(
      (sum, value) =>
        sum + Math.max(0, value),
      0
    ) || 1

  let cursor = 0

  const segments = values.map(
    (value, index) => {
      const start = cursor
      const amount =
        (Math.max(0, value) /
          total) *
        100
      cursor += amount

      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${cursor}%`
    }
  )

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-28 h-28 rounded-full flex-shrink-0"
        style={{
          background: `conic-gradient(${segments.join(
            ', '
          )})`,
        }}
      />

      <div className="space-y-1 min-w-0">
        {labels.slice(0, 7).map(
          (label, index) => (
            <div
              key={label}
              className="flex items-center gap-1.5"
            >
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor:
                    CHART_COLORS[
                      index %
                        CHART_COLORS.length
                    ],
                }}
              />

              <span className="text-[7px] text-gray-500 truncate">
                {label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
