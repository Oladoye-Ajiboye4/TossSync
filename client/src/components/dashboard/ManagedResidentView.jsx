import React, { useRef, useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import Button from '../ui/Button'
import api from '../../api/axios'

/** Compute time remaining parts from now until target date. */
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
    <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-secondary text-white flex items-center justify-center text-2xl sm:text-3xl font-extrabold tabular-nums">
      {String(value).padStart(2, '0')}
    </div>
    <span className="text-xs font-semibold uppercase tracking-wide text-[#5b4a3a]/70 mt-2">{label}</span>
  </div>
)

/**
 * Managed Resident View — linked to a provider.
 * Shows the official pickup cycle, an animated countdown, and a Missed Pickup button.
 */
const ManagedResidentView = ({ user, schedule, notify, errorNotify }) => {
  const rootRef = useRef(null)
  const nextPickup = schedule?.next_pickup
  const [countdown, setCountdown] = useState(getCountdown(nextPickup))
  const [reporting, setReporting] = useState(false)

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown(nextPickup)), 1000)
    return () => clearInterval(id)
  }, [nextPickup])

  // Staggered entrance of cards
  useGSAP(() => {
    gsap.from(rootRef.current.querySelectorAll('[data-animate]'), {
      autoAlpha: 0,
      y: 30,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.12
    })
  }, [])

  const handleMissedPickup = async () => {
    try {
      setReporting(true)
      const { data } = await api.post('/schedule/missed', { feedback: 'Pickup was missed' })
      notify?.(data.message || 'Missed pickup reported.')
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Could not report missed pickup.')
    } finally {
      setReporting(false)
    }
  }

  const orgName = schedule?.organization_id?.name || user?.organization_id?.name || 'Your Provider'
  const cycleName = schedule?.cycle_name || 'Not assigned yet'
  const nextDateStr = nextPickup
    ? new Date(nextPickup).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : 'To be scheduled'

  return (
    <div ref={rootRef} className="space-y-6">
      {/* Connected status */}
      <div data-animate className="flex items-center gap-3 rounded-2xl bg-primary/25 border border-primary/50 px-5 py-4">
        <Icon icon="mdi:check-decagram" width="26" height="26" className="text-secondary" />
        <div>
          <p className="font-bold text-secondary">Connected to {orgName}</p>
          <p className="text-sm text-[#3a4636]">Official cycle: <span className="font-semibold">{cycleName}</span></p>
        </div>
      </div>

      {/* Countdown */}
      <div data-animate className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] p-6 sm:p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#5b4a3a]/70">Next Pickup</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-secondary mt-1 mb-6">{nextDateStr}</h3>

        {countdown && !countdown.done ? (
          <div className="flex justify-center gap-3 sm:gap-5">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/30 px-5 py-3 text-secondary font-bold">
            <Icon icon="mdi:truck-check" width="24" height="24" />
            {nextPickup ? "It's pickup day!" : 'Awaiting schedule from your provider'}
          </div>
        )}
      </div>

      {/* Missed pickup */}
      <div data-animate className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-extrabold text-secondary">Missed your pickup?</h4>
          <p className="text-sm text-[#5b4a3a]/70">Let your provider know so they can follow up.</p>
        </div>
        <Button variant="danger" onClick={handleMissedPickup} disabled={reporting}>
          <Icon icon="mdi:alert-circle-outline" width="20" height="20" />
          {reporting ? 'Reporting...' : 'Report Missed Pickup'}
        </Button>
      </div>
    </div>
  )
}

export default ManagedResidentView
