/**
 * statusConfig.js — shared lookup maps for weekly-status presentation.
 * Kept in a non-component module so React Fast Refresh stays happy
 * (components files should only export components).
 */

export const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    icon: 'mdi:check-circle',
    className: 'bg-primary/30 text-[#3a4636] ring-1 ring-primary/50'
  },
  pending: {
    label: 'Pending',
    icon: 'mdi:clock-outline',
    className: 'bg-tertiary/25 text-secondary ring-1 ring-tertiary/50'
  },
  missed: {
    label: 'Missed',
    icon: 'mdi:alert-circle',
    className: 'bg-red-100 text-red-700 ring-1 ring-red-300'
  }
}
