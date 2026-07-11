// components/dashboard/SectionPlaceholder.tsx
'use client'

import { Plus, Edit } from 'lucide-react'

interface SectionPlaceholderProps {
  title: string
  description: string
  icon: React.ElementType
  onAdd?: () => void
  onManage?: () => void
}

export const SectionPlaceholder = ({ 
  title, 
  description, 
  icon: Icon,
  onAdd,
  onManage 
}: SectionPlaceholderProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 text-center">
      <div className="flex flex-col items-center">
        <div className="p-3 sm:p-4 bg-[#232A42]/5 rounded-full mb-3 sm:mb-4">
          <Icon className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-[#232A42]/40" />
        </div>
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md">{description}</p>
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 justify-center">
          <button 
            onClick={onAdd}
            className="min-h-[40px] px-3 py-1.5 sm:px-4 sm:py-2 bg-[#C75712] text-white rounded-lg hover:bg-[#D96A1E] active:bg-[#B84E10] transition-colors text-xs sm:text-sm flex items-center gap-2 touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Add New
          </button>
          <button 
            onClick={onManage}
            className="min-h-[40px] px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-xs sm:text-sm flex items-center gap-2 touch-manipulation"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Manage
          </button>
        </div>
      </div>
    </div>
  )
}