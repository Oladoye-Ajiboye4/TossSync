import React, { useMemo, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { formatSchedule } from '../../../../lib/cycleTime'

const FREQUENCY_BADGES = {
  weekly: { label: 'Weekly', className: 'bg-primary/30 text-secondary' },
  'bi-weekly': { label: 'Bi-Weekly', className: 'bg-tertiary/30 text-secondary' },
  monthly: { label: 'Monthly', className: 'bg-secondary/20 text-secondary' },
  custom: { label: 'Custom', className: 'bg-amber-100 text-amber-700' }
}

const OverviewTab = ({ organization }) => {
  const containerRef = useRef(null)

  const cards = useMemo(() => ([
    { label: 'Organization', value: organization.name, icon: 'mdi:domain' },
    { label: 'Business ID', value: organization.business_id, icon: 'mdi:identifier' },
    { label: 'Active Residents', value: organization.connected_residents?.length || 0, icon: 'mdi:account-group-outline' }
  ]), [organization])

  const pickups = useMemo(() => (
    (organization.pickup_cycles || []).map((cycle) => ({
      id: cycle._id || cycle.name,
      name: cycle.name,
      description: cycle.description,
      schedule: formatSchedule(cycle),
      badge: FREQUENCY_BADGES[cycle.frequency] || FREQUENCY_BADGES.custom
    }))
  ), [organization])

  useGSAP(() => {
    gsap.from('[data-metric-card]', {
      opacity: 0,
      y: 24,
      scale: 0.96,
      duration: 0.5,
      stagger: 0.08,
      ease: 'back.out(1.5)'
    })
    gsap.from('[data-feed-item]', {
      opacity: 0,
      x: -16,
      duration: 0.4,
      stagger: 0.06,
      delay: 0.2,
      ease: 'power3.out'
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            data-metric-card
            className="flex items-center gap-4 rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/25 text-secondary">
              <Icon icon={card.icon} width="24" height="24" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary/60">{card.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-[#5b4a3a]">{card.value}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Icon icon="mdi:truck-clock-outline" width="22" height="22" className="text-secondary" aria-hidden="true" />
          <h3 className="text-base font-bold text-[#5b4a3a]">Upcoming Pickups</h3>
        </div>

        {pickups.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {pickups.map((pickup) => (
              <li
                key={pickup.id}
                data-feed-item
                className="flex items-center justify-between gap-3 rounded-xl border border-tertiary/30 bg-background/40 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#5b4a3a]">{pickup.name}</p>
                  <p className="truncate text-sm text-secondary/70">
                    {pickup.schedule}{pickup.description ? ` • ${pickup.description}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pickup.badge.className}`}>
                  {pickup.badge.label}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-tertiary/50 p-8 text-center">
            <Icon icon="mdi:calendar-blank-outline" width="34" height="34" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
            <p className="text-sm text-secondary/70">No pickup cycles scheduled yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default OverviewTab
