'use client'

const CHART_COLORS = [
  '#2f80c8',
  '#5c8fd5',
  '#7560d8',
  '#9850ca',
  '#c348b0',
  '#ef3422',
  '#f47a1f',
  '#f4aa2f',
  '#ffe22d',
  '#74c72f',
  '#45a73e',
  '#54be78',
  '#5ec4ab',
  '#78c8d1',
  '#70b8d9',
  '#8bd0ee',
]

const HORIZONTAL_BAR_STYLES = [
  {
    gradient:
      'linear-gradient(90deg, #ff674d 0%, #ff9842 50%, #ffc44f 100%)',
    texture:
      'radial-gradient(circle at 38% 55%, rgba(255,255,255,0.12) 0 2px, transparent 3px)',
  },
  {
    gradient:
      'linear-gradient(90deg, #087f89 0%, #08aaa0 52%, #3ad7ae 100%)',
    texture:
      'radial-gradient(circle at 42% 48%, rgba(255,255,255,0.12) 0 2px, transparent 3px)',
  },
  {
    gradient:
      'linear-gradient(90deg, #0865c7 0%, #008fd0 52%, #00d0c7 100%)',
    texture:
      'radial-gradient(circle at 36% 60%, rgba(255,255,255,0.12) 0 2px, transparent 3px)',
  },
]

interface PieSegment {
  value: number
  percentage: number
  startAngle: number
  endAngle: number
  color: string
  label: string
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value))
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians =
    ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x:
      centerX +
      radius * Math.cos(angleInRadians),
    y:
      centerY +
      radius * Math.sin(angleInRadians),
  }
}

function createPieSegments(
  values: number[],
  labels: string[]
): PieSegment[] {
  const normalizedValues = values.map((value) =>
    Math.max(0, value)
  )

  const total =
    normalizedValues.reduce(
      (sum, value) => sum + value,
      0
    ) || 1

  let currentAngle = 0

  return normalizedValues.map(
    (value, index) => {
      const percentage =
        (value / total) * 100

      const startAngle = currentAngle
      const endAngle =
        currentAngle +
        (value / total) * 360

      currentAngle = endAngle

      return {
        value,
        percentage,
        startAngle,
        endAngle,
        color:
          CHART_COLORS[
            index % CHART_COLORS.length
          ],
        label:
          labels[index] ??
          `Item ${index + 1}`,
      }
    }
  )
}

function createSectorPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(
    centerX,
    centerY,
    radius,
    endAngle
  )

  const end = polarToCartesian(
    centerX,
    centerY,
    radius,
    startAngle
  )

  const largeArcFlag =
    endAngle - startAngle <= 180
      ? 0
      : 1

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function createDonutPath(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart =
    polarToCartesian(
      centerX,
      centerY,
      outerRadius,
      endAngle
    )

  const outerEnd =
    polarToCartesian(
      centerX,
      centerY,
      outerRadius,
      startAngle
    )

  const innerStart =
    polarToCartesian(
      centerX,
      centerY,
      innerRadius,
      startAngle
    )

  const innerEnd =
    polarToCartesian(
      centerX,
      centerY,
      innerRadius,
      endAngle
    )

  const largeArcFlag =
    endAngle - startAngle <= 180
      ? 0
      : 1

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}

export function HorizontalBars({
  items,
}: {
  items: Array<{
    label: string
    value: number
  }>
}) {
  return (
    <div className="mx-auto w-full max-w-[520px] space-y-4">
      {items.map((item, index) => {
        const safeValue = clamp(
          item.value,
          0,
          100
        )

        const style =
          HORIZONTAL_BAR_STYLES[
            index %
              HORIZONTAL_BAR_STYLES.length
          ]

        return (
          <div
            key={item.label}
            className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4"
          >
            <span className="truncate text-[12px] font-extrabold text-[#233f7b] sm:text-[14px]">
              {item.label}
            </span>

            <div className="relative h-9 overflow-hidden rounded-r-[20px] bg-[#e3e6e9] sm:h-10">
              <div
                className="relative flex h-full min-w-[66px] items-center overflow-hidden rounded-r-[20px] transition-[width] duration-700 ease-out"
                style={{
                  width: `${safeValue}%`,
                  backgroundImage: `${style.texture}, ${style.gradient}`,
                  backgroundSize:
                    '58px 58px, 100% 100%',
                  backgroundRepeat:
                    'repeat, no-repeat',
                }}
              >
                <span className="relative z-10 pl-4 text-[17px] font-semibold leading-none text-white drop-shadow-sm sm:text-[19px]">
                  {Math.round(safeValue)}%
                </span>

                <span className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-[20px] bg-white/5" />
              </div>
            </div>
          </div>
        )
      })}
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

  const width = 360
  const height = 150
  const padding = 24

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

  const pointList = safeValues.map(
    (value, index) => {
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

      return {
        x,
        y,
        value,
      }
    }
  )

  const companionList = safeValues.map(
    (value, index) => {
      const shifted = Math.max(
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
        ((shifted - minValue) / range) *
          (height - padding * 2)

      return {
        x,
        y,
      }
    }
  )

  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="mb-1 flex items-center justify-end gap-3">
        <span className="inline-flex items-center gap-1 text-[8px] text-gray-500">
          <span className="h-2 w-2 rounded-full bg-[#7f63e8]" />
          GPA
        </span>

        <span className="inline-flex items-center gap-1 text-[8px] text-gray-500">
          <span className="h-2 w-2 rounded-full bg-[#22b8c7]" />
          Target
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
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
          points={companionList
            .map(
              (point) =>
                `${point.x},${point.y}`
            )
            .join(' ')}
          fill="none"
          stroke="#22b8c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={pointList
            .map(
              (point) =>
                `${point.x},${point.y}`
            )
            .join(' ')}
          fill="none"
          stroke="#7f63e8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pointList.map(
          (point, index) => (
            <circle
              key={`${point.value}-${index}`}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#ffffff"
              stroke="#7f63e8"
              strokeWidth="2"
            />
          )
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
  const safeValue = clamp(
    value,
    0,
    100
  )

  return (
    <div className="flex flex-col items-center">
      <div
        className="h-14 w-14 rounded-full p-[6px] sm:h-16 sm:w-16"
        style={{
          background: `conic-gradient(${color} ${safeValue}%, #ececec ${safeValue}% 100%)`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
          <span className="text-[10px] font-bold text-gray-800">
            {Math.round(safeValue)}%
          </span>
        </div>
      </div>

      <span className="mt-1 max-w-16 text-center text-[8px] text-gray-500">
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
  const width = 480
  const height = 230

  const margin = {
    top: 18,
    right: 16,
    bottom: 45,
    left: 38,
  }

  const plotWidth =
    width -
    margin.left -
    margin.right

  const plotHeight =
    height -
    margin.top -
    margin.bottom

  const groupWidth =
    plotWidth /
    Math.max(1, values.length)

  const barWidth = Math.min(
    15,
    groupWidth / 5
  )

  const yTicks = [0, 25, 50, 75, 100]

  const seriesColors = [
    '#f1ad38',
    '#75a96c',
    '#d66f4d',
  ]

  return (
    <div className="mx-auto w-full max-w-[520px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Grouped resource usage chart"
      >
        {yTicks.map((tick) => {
          const y =
            margin.top +
            plotHeight -
            (tick / 100) * plotHeight

          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke="#dfe2e4"
                strokeWidth="1"
              />

              <text
                x={margin.left - 9}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill="#646b72"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {values.map((rawValue, index) => {
          const safeValue = clamp(
            rawValue,
            0,
            100
          )

          const seriesValues = [
            clamp(
              safeValue * 0.5 +
                (index % 2) * 8,
              0,
              100
            ),
            clamp(
              safeValue * 0.72 +
                ((index + 1) % 2) * 7,
              0,
              100
            ),
            safeValue,
          ]

          const groupStart =
            margin.left +
            index * groupWidth +
            groupWidth / 2 -
            (barWidth * 3 + 6) / 2

          return (
            <g key={`${labels[index]}-${index}`}>
              {seriesValues.map(
                (seriesValue, seriesIndex) => {
                  const barHeight =
                    (seriesValue / 100) *
                    plotHeight

                  const x =
                    groupStart +
                    seriesIndex *
                      (barWidth + 3)

                  const y =
                    margin.top +
                    plotHeight -
                    barHeight

                  return (
                    <rect
                      key={seriesIndex}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={
                        seriesColors[
                          seriesIndex
                        ]
                      }
                    />
                  )
                }
              )}

              <text
                x={
                  margin.left +
                  index * groupWidth +
                  groupWidth / 2
                }
                y={height - 18}
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="#444b52"
              >
                {(
                  labels[index] ??
                  `Product ${index + 1}`
                ).slice(0, 12)}
              </text>
            </g>
          )
        })}
      </svg>
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
  const segments = createPieSegments(
    values,
    labels
  )

  const width = 360
  const height = 230
  const centerX = 180
  const centerY = 112
  const outerRadius = 68
  const innerRadius = 37

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Lab and equipment availability donut chart"
      >
        {segments.map(
          (segment, index) => {
            const middleAngle =
              (segment.startAngle +
                segment.endAngle) /
              2

            const lineStart =
              polarToCartesian(
                centerX,
                centerY,
                outerRadius - 2,
                middleAngle
              )

            const lineMiddle =
              polarToCartesian(
                centerX,
                centerY,
                outerRadius + 20,
                middleAngle
              )

            const rightSide =
              lineMiddle.x >= centerX

            const lineEndX =
              lineMiddle.x +
              (rightSide ? 32 : -32)

            const textX =
              lineEndX +
              (rightSide ? 5 : -5)

            const textAnchor =
              rightSide
                ? 'start'
                : 'end'

            return (
              <g key={segment.label}>
                <path
                  d={createDonutPath(
                    centerX,
                    centerY,
                    outerRadius,
                    innerRadius,
                    segment.startAngle,
                    segment.endAngle
                  )}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                <polyline
                  points={`${lineStart.x},${lineStart.y} ${lineMiddle.x},${lineMiddle.y} ${lineEndX},${lineMiddle.y}`}
                  fill="none"
                  stroke="#606970"
                  strokeWidth="1.2"
                />

                <circle
                  cx={lineStart.x}
                  cy={lineStart.y}
                  r="2.5"
                  fill="#ffffff"
                  stroke="#606970"
                  strokeWidth="1"
                />

                <text
                  x={textX}
                  y={lineMiddle.y - 4}
                  textAnchor={textAnchor}
                  fontSize="17"
                  fontWeight="700"
                  fill={segment.color}
                >
                  {Math.round(
                    segment.percentage
                  )}
                  %
                </text>

                <text
                  x={textX}
                  y={lineMiddle.y + 10}
                  textAnchor={textAnchor}
                  fontSize="7"
                  fill="#596168"
                >
                  {segment.label.slice(
                    0,
                    18
                  )}
                </text>
              </g>
            )
          }
        )}

        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius - 1}
          fill="#ffffff"
        />
      </svg>
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
  const segments = createPieSegments(
    values,
    labels
  )

  const width = 245
  const height = 215
  const centerX = 110
  const centerY = 108
  const radius = 78

  return (
    <div className="mx-auto grid w-full max-w-[540px] grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,245px)_minmax(120px,1fr)]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-[245px]"
        role="img"
        aria-label="Resource allocation pie chart"
      >
        {segments.map((segment) => {
          const middleAngle =
            (segment.startAngle +
              segment.endAngle) /
            2

          const percentagePosition =
            polarToCartesian(
              centerX,
              centerY,
              radius + 12,
              middleAngle
            )

          return (
            <g key={segment.label}>
              <path
                d={createSectorPath(
                  centerX,
                  centerY,
                  radius,
                  segment.startAngle,
                  segment.endAngle
                )}
                fill={segment.color}
                stroke="#ffffff"
                strokeWidth="4"
              />

              {segment.percentage >= 3 && (
                <text
                  x={
                    percentagePosition.x
                  }
                  y={
                    percentagePosition.y +
                    3
                  }
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="600"
                  fill="#42484d"
                >
                  {segment.percentage.toFixed(
                    segment.percentage < 10
                      ? 2
                      : 1
                  )}
                  %
                </text>
              )}
            </g>
          )
        })}

        <circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill="#ffffff"
        />
      </svg>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-1">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex min-w-0 items-center gap-1.5"
          >
            <span
              className="h-2.5 w-2.5 flex-shrink-0"
              style={{
                backgroundColor:
                  segment.color,
              }}
            />

            <span className="truncate text-[8px] leading-tight text-gray-600">
              {segment.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}