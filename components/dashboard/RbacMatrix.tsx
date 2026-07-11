// components/dashboard/RbacMatrix.tsx
'use client'

import { ArrowRight } from 'lucide-react'

interface RbacEntry {
  name: string
  role: string
  email: string
  classroom: string
}

interface RbacMatrixProps {
  data: RbacEntry[]
  onShowAll?: () => void
  onEdit?: (entry: RbacEntry) => void
}

export const RbacMatrix = ({ data, onShowAll, onEdit }: RbacMatrixProps) => {
  return (
    <div className="mb-6 sm:mb-8">
      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#232A42] mb-3 sm:mb-4">Master Access Matrix (RBAC Modifiers)</h3>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800 font-medium whitespace-nowrap">{row.name}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700">
                      {row.role}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500 whitespace-nowrap">{row.email}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                    <select
                      defaultValue={row.classroom}
                      className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#C75712]"
                    >
                      <option>{row.classroom}</option>
                    </select>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                    <button 
                      onClick={() => onEdit?.(row)}
                      className="text-xs sm:text-sm text-blue-600 font-medium hover:underline touch-manipulation"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 pt-2">
          <button
            onClick={onShowAll}
            aria-label="Show all access entries"
            className="w-9 h-9 rounded-full border-2 border-[#232A42] flex items-center justify-center text-[#232A42] hover:bg-[#232A42] hover:text-white transition-colors touch-manipulation"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}