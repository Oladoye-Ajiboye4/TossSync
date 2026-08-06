import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import { formatPickupDateTime } from '../../../lib/cycleTime'


const getCountdown = (target) => {
  if (!target) return null
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: false
  }
}

const CountdownUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-2xl font-extrabold tabular-nums text-white sm:h-20 sm:w-20 sm:text-3xl">
      {String(value).padStart(2, '0')}
    </div>
    <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-secondary/70">{label}</span>
  </div>
)

/**
 * Smart Countdown Hero — counts down to whichever pickup is soonest
 * across the provider schedule and the resident's personal schedule.
 */
const CountdownHero = ({ providerNext, personalDates }) => {
  // Pure sorted list of all candidate pickups (sorting is pure, no Date.now()).
  const candidates = useMemo(() => (
    [providerNext, ...(personalDates || [])]
      .filter((date) => Boolean(date))
      .map((date) => ({ date, source: date === providerNext ? 'Provider' : 'Personal' }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [providerNext, personalDates])

  const [nextPickup, setNextPickup] = useState(null)
  const [countdown, setCountdown] = useState(null)

  // Date.now() is impure, so future-date selection runs inside the effect/interval only.
  useEffect(() => {
    const compute = () => {
      const next = candidates.filter((c) => new Date(c.date).getTime() > Date.now())[0] || null
      setNextPickup(next)
      setCountdown(getCountdown(next?.date))
    }
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [candidates])



  const nextDateStr = formatPickupDateTime(nextPickup?.date) || 'No upcoming pickup'

  return (
    <div
      data-animate
      className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 text-center shadow-sm sm:p-8"
    >
      <div className="mb-1 flex items-center justify-center gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary/70">Next Pickup</p>
        {nextPickup?.source && (
          <span className="rounded-full bg-primary/30 px-2 py-0.5 text-xs font-bold text-secondary">
            {nextPickup.source}
          </span>
        )}
      </div>
      <h3 className="mb-6 mt-1 text-2xl font-extrabold text-secondary sm:text-3xl">{nextDateStr}</h3>

      {countdown && !countdown.done ? (
        <div className="flex justify-center gap-3 sm:gap-5">
          <CountdownUnit value={countdown.days} label="Days" />
          <CountdownUnit value={countdown.hours} label="Hours" />
          <CountdownUnit value={countdown.minutes} label="Mins" />
          <CountdownUnit value={countdown.seconds} label="Secs" />
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/30 px-5 py-3 font-bold text-secondary">
          <Icon icon="mdi:truck-check" width="24" height="24" aria-hidden="true" />
          {nextPickup ? "It's pickup day!" : 'Set a personal schedule to get reminders'}
        </div>
      )}
    </div>
  )
}

export default CountdownHero
