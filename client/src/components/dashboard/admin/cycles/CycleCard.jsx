import React from 'react'
import { Icon } from '@iconify/react'

import { cycleDays, sortDays, formatTime, frequencyLabel } from '../../../../lib/cycleTime'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const FREQUENCY_BADGE = {
  weekly: 'bg-primary/30 text-secondary',
  'bi-weekly': 'bg-tertiary/30 text-secondary',
  monthly: 'bg-secondary/20 text-secondary',
  custom: 'bg-amber-100 text-amber-700'
}

/**
 * CycleCard — one official pickup cycle at a glance.
 *
 * Surfaces the cycle name, its selected days (rendered as compact chips), the
 * pickup time, a frequency badge, and a LIVE "Assigned Residents" count computed
 * by the parent via .filter() on connected residents. Edit + Delete are exposed
 * as explicit actions. Purely presentational — all mutations bubble up.
 */
const CycleCard = ({ cycle, assignedCount = 0, onEdit, onDelete, deleting = false }) => {
  const days = sortDays(cycleDays(cycle))
  const time = formatTime(cycle.pickup_time)
  const badgeClass = FREQUENCY_BADGE[cycle.frequency] || FREQUENCY_BADGE.custom
  const tz = cycle.timezone || ''

  return (
    <article
      data-cycle-card
      className="flex flex-col gap-4 rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/25 text-secondary">
            <Icon icon="mdi:calendar-clock" width="22" height="22" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-base font-bold text-[#5b4a3a]">{cycle.name}</h4>
            {cycle.description && (
              <p className="truncate text-xs text-secondary/60">{cycle.description}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
          {frequencyLabel(cycle.frequency)}
        </span>
      </div>

      {/* Day chips */}
      <div className="flex flex-wrap gap-1.5">
        {days.length === 0 ? (
          <span className="text-sm italic text-secondary/40">No days set</span>
        ) : (
          days.map((day) => (
            <span
              key={day}
              className="inline-flex min-w-9 items-center justify-center rounded-lg bg-primary/15 px-2 py-1 text-xs font-bold text-secondary"
            >
              {DAY_SHORT[day]}
            </span>
          ))
        )}
      </div>

      {/* Meta: time + assigned count */}
      <div className="flex flex-wrap items-center gap-4 border-t border-tertiary/20 pt-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#5b4a3a]">
          <Icon icon="mdi:clock-outline" width="16" height="16" className="text-secondary/70" aria-hidden="true" />
          {time || 'Flexible time'}{tz ? ` • ${tz}` : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 text-secondary/80">
          <Icon icon="mdi:account-group-outline" width="16" height="16" className="text-secondary/70" aria-hidden="true" />
          {assignedCount} {assignedCount === 1 ? 'resident' : 'residents'} assigned
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEdit?.(cycle)}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-tertiary/50 bg-white px-3 text-sm font-bold text-secondary hover:border-secondary hover:bg-primary/10"
        >
          <Icon icon="mdi:pencil-outline" width="16" height="16" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(cycle)}
          disabled={deleting}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-300 bg-red-50 px-3 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          <Icon icon={deleting ? 'mdi:loading' : 'mdi:trash-can-outline'} width="16" height="16" className={deleting ? 'animate-spin' : ''} aria-hidden="true" />
          Delete
        </button>
      </div>
    </article>
  )
}

export default CycleCard
