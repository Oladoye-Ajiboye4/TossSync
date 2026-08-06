import React from 'react'
import { Icon } from '@iconify/react'

import { STATUS_CONFIG } from './statusConfig'

/**
 * StatusBadge — dynamic weekly completion pill for the CRM table.
 * Config is a lookup map (no conditionals-as-loops) keyed by status.
 */
const StatusBadge = ({ status = 'pending', size = 'md', className = '' }) => {

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
  const iconSize = size === 'sm' ? 13 : 15

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold ${config.className} ${sizing} ${className}`}
    >
      <Icon icon={config.icon} width={iconSize} height={iconSize} aria-hidden="true" />
      {config.label}
    </span>
  )
}

export default StatusBadge
