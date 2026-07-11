// components/dashboard/FinancialLedger.tsx
'use client'

import { ArrowRight } from 'lucide-react'

interface LedgerEntry {
  date: string
  name: string
  class: string
  invoiceId: string
  amount: string
  status: string
}

interface FinancialLedgerProps {
  data: LedgerEntry[]
  statusStyles: Record<string, string>
  onShowAll?: () => void
}

export const FinancialLedger = ({ data, statusStyles, onShowAll }: FinancialLedgerProps) => {
  return (
    <div className="mb-6 sm:mb-8">
      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#232A42] mb-3 sm:mb-4">Financial Ledger Management</h3>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800 font-medium whitespace-nowrap">{row.name}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500 whitespace-nowrap">{row.class}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500 whitespace-nowrap">{row.invoiceId}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-800 font-semibold whitespace-nowrap">{row.amount}</td>
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${statusStyles[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 pt-2">
          <button
            onClick={onShowAll}
            aria-label="Show all ledger entries"
            className="w-9 h-9 rounded-full border-2 border-[#232A42] flex items-center justify-center text-[#232A42] hover:bg-[#232A42] hover:text-white transition-colors touch-manipulation"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 font-medium">show</span>
        </div>
      </div>
      <button 
        onClick={onShowAll}
        className="sm:hidden mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#232A42] text-[#232A42] text-sm font-medium touch-manipulation"
      >
        Show all <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}