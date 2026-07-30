import type { LucideIcon } from 'lucide-react'

export type AdminWorkspaceRouteId =
  | 'global'
  | 'financial'
  | 'academic'
  | 'users'

export interface AdminWorkspaceNotification {
  id: string
  title: string
  description: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
}

export interface AdminWorkspaceQuickAction {
  id: string
  label: string
  Icon: LucideIcon
  tone?: 'primary' | 'danger'
  onClick: () => void
}
