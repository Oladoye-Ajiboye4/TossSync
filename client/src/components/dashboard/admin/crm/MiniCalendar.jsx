import React, { useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import {
  buildMonthMatrix,
  MONTH_LONG,
  WEEKDAY_SHORT
} from '../../../../lib/pickupWeek'

/**
 * MiniCalendar — compact, styled month widget.
 * The 42-cell grid is built with Array.from (zero-loop) and re-animated by GSAP
 * whenever the admin pages between months.
 */
const MiniCalendar = ({ weekStartsOn = 1 }) => {
  const [viewDate, setViewDate] = useState(() => new Date())
  const gridRef = useRef(null)

  // Reorder weekday headers so the first column matches weekStartsOn (no loops)
  const weekdayHeaders = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[(i + weekStartsOn) % 7]),
    [weekStartsOn]
  )

  const cells = useMemo(
    () => buildMonthMatrix(viewDate, weekStartsOn),
    [viewDate, weekStartsOn]
  )

  useGSAP(
    () => {
      gsap.fromTo(
        '[data-cal-cell]',
        { autoAlpha: 0, scale: 0.8 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.28,
          ease: 'power2.out',
          stagger: 0.006
        }
      )
    },
    { dependencies: [viewDate], scope: gridRef }
  )

  const changeMonth = (delta) =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))

  const goToday = () => setViewDate(new Date())

  return (
    <div className="rounded-2xl border border-tertiary/40 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/25 text-secondary">
            <Icon icon="mdi:calendar-month-outline" width="18" height="18" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-[#5b4a3a]">
            {MONTH_LONG[viewDate.getMonth()]} {viewDate.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="flex size-8 items-center justify-center rounded-lg text-secondary hover:bg-primary/15"
          >
            <Icon icon="mdi:chevron-left" width="18" height="18" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-secondary hover:bg-primary/15"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="flex size-8 items-center justify-center rounded-lg text-secondary hover:bg-primary/15"
          >
            <Icon icon="mdi:chevron-right" width="18" height="18" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdayHeaders.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-secondary/50"
          >
            {label}
          </div>
        ))}
      </div>

      <div ref={gridRef} className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const base =
            'relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-colors'
          const tone = cell.isToday
            ? 'bg-secondary text-white shadow-sm'
            : cell.inPickupWeek
              ? 'bg-primary/25 text-[#3a4636]'
              : cell.inMonth
                ? 'text-[#5b4a3a] hover:bg-tertiary/15'
                : 'text-secondary/30'
          return (
            <div key={cell.key} data-cal-cell className={`${base} ${tone}`}>
              {cell.day}
              {cell.inPickupWeek && !cell.isToday && (
                <span className="absolute bottom-1 size-1 rounded-full bg-secondary/70" />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-tertiary/20 pt-3 text-[11px] text-secondary/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-secondary" /> Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary/60" /> Pickup Week
        </span>
      </div>
    </div>
  )
}

export default MiniCalendar
