// components/dashboard/StatsCard.tsx
'use client'

import { TrendingUp, ArrowRight } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  color?: string
  subtitle?: string
  icon?: React.ReactNode
  trend?: string
  trendDirection?: 'up' | 'down'
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export const StatsCard = ({
  title,
  value,
  color = 'text-[#C75712]',
  subtitle,
  icon,
  trend,
  trendDirection = 'up',
  className = '',
  onClick,
  children,
}: StatsCardProps) => {
  return (
    <div className={`bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm font-semibold text-[#232A42] mb-1 sm:mb-2 pr-2">{title}</p>
          <p className={`text-xl sm:text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {icon && (
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gray-100 flex items-center justify-center">
              {icon}
            </div>
          )}
          {trend && (
            <span className={`text-[9px] sm:text-xs font-semibold ${trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}