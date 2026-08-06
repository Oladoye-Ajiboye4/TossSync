import React, { useMemo, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import MiniCalendar from './MiniCalendar'
import { getPickupWeekContext } from '../../../../lib/pickupWeek'

/**
 * DashboardDateContext — top-of-dashboard time band.
 * Pairs the MiniCalendar with a "current date + Pickup Week" summary and a couple
 * of live tallies so the admin instantly understands the timeframe of the data.
 */
const DashboardDateContext = ({ residents = [] }) => {
  const rootRef = useRef(null)
  const ctx = useMemo(() => getPickupWeekContext(new Date(), 1), [])

  // Zero-loop weekly tallies via .filter()
  const tallies = useMemo(() => {
    const completed = residents.filter((r) => r.weekly_status === 'completed').length
    const pending = residents.filter((r) => r.weekly_status === 'pending').length
    const missed = residents.filter((r) => r.weekly_status === 'missed').length
    const total = residents.length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, pending, missed, total, rate }
  }, [residents])

  useGSAP(
    () => {
      gsap.from('[data-ctx-item]', {
        autoAlpha: 0,
        y: 16,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.08
      })
    },
    { scope: rootRef }
  )

  const stats = [
    { key: 'completed', label: 'Completed', value: tallies.completed, icon: 'mdi:check-circle-outline', tone: 'text-[#3a4636]', chip: 'bg-primary/25' },
    { key: 'pending', label: 'Pending', value: tallies.pending, icon: 'mdi:clock-outline', tone: 'text-secondary', chip: 'bg-tertiary/25' },
    { key: 'missed', label: 'Missed', value: tallies.missed, icon: 'mdi:alert-circle-outline', tone: 'text-red-600', chip: 'bg-red-100' }
  ]

  return (
    <div ref={rootRef} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Context panel */}
      <div
        data-ctx-item
        className="flex flex-col justify-between gap-5 rounded-2xl border border-tertiary/40 bg-gradient-to-br from-white to-primary/10 p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-secondary/60">Today</p>
            <p className="mt-1 text-lg font-extrabold text-[#5b4a3a] sm:text-xl">{ctx.longToday}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5 text-white">
              <Icon icon="mdi:truck-fast-outline" width="18" height="18" aria-hidden="true" />
              <span className="text-sm font-bold">
                Pickup Week {ctx.isoWeek}
              </span>
              <span className="text-xs font-medium opacity-90">• {ctx.weekRange}</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary/60">Completion</p>
            <p className="text-3xl font-black text-secondary">{tallies.rate}%</p>
            <p className="text-xs text-secondary/60">{tallies.completed}/{tallies.total} residents</p>
          </div>
        </div>

        {/* Weekly progress bar */}
        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-tertiary/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-700 ease-out"
              style={{ width: `${tallies.rate}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.key} className="flex items-center gap-2 rounded-xl border border-tertiary/30 bg-white/70 px-3 py-2">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${s.chip} ${s.tone}`}>
                  <Icon icon={s.icon} width="18" height="18" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-none text-[#5b4a3a]">{s.value}</p>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-secondary/60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div data-ctx-item>
        <MiniCalendar weekStartsOn={1} />
      </div>
    </div>
  )
}

export default DashboardDateContext
