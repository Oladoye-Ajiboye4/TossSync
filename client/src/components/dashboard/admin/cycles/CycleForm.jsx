import React, { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import {
  DAY_PILLS,
  FREQUENCY_OPTIONS,
  cycleDays,
  buildTime,
  parseTime
} from '../../../../lib/cycleTime'

const MERIDIEMS = ['AM', 'PM']

/**
 * CycleForm — the shared create/edit surface for an official pickup cycle.
 *
 * Renders: Cycle Name, an interactive Mon–Sun pill row (multi-select managed
 * purely with .filter()/spread), a Frequency selector, and a Pickup Time control
 * (numeric hour + minute paired with an AM/PM toggle) mirroring the resident
 * dashboard's dynamic time inputs. Emits a normalised payload on submit.
 *
 * Zero-Loop Rule: every list/selection transform below is .map()/.filter().
 */
const CycleForm = ({ initial = null, submitting = false, submitLabel = 'Create Official Cycle', onSubmit }) => {
  const seedTime = useMemo(() => parseTime(initial?.pickup_time), [initial])

  const [name, setName] = useState(initial?.name || '')
  const [days, setDays] = useState(() => cycleDays(initial || {}))
  const [frequency, setFrequency] = useState(initial?.frequency || 'weekly')
  const [hour, setHour] = useState(seedTime.hour)
  const [minute, setMinute] = useState(seedTime.minute)
  const [meridiem, setMeridiem] = useState(seedTime.meridiem)
  const [timezone, setTimezone] = useState(
    initial?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  )
  const [error, setError] = useState('')

  const timeZones = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone')
    return ['UTC']
  }, [])

  // Multi-select toggle: spread to add, .filter() to remove (never a loop).
  const toggleDay = (value) => {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]))
  }

  const cycleMeridiem = () => {
    setMeridiem((prev) => MERIDIEMS.filter((m) => m !== prev)[0] || 'AM')
  }

  const clampHour = (raw) => {
    const n = Number(raw)
    if (Number.isNaN(n)) return ''
    return Math.min(12, Math.max(1, Math.trunc(n)))
  }

  const clampMinute = (raw) => {
    const n = Number(raw)
    if (Number.isNaN(n)) return ''
    return Math.min(59, Math.max(0, Math.trunc(n)))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give this cycle a name residents will recognise.')
      return
    }
    if (days.length === 0) {
      setError('Select at least one pickup day.')
      return
    }
    setError('')
    onSubmit?.({
      name: name.trim(),
      frequency,
      days_of_week: days,
      pickup_time: buildTime(hour || 12, minute || 0, meridiem),
      timezone
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Cycle name */}
      <div>
        <label htmlFor="cycle-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
          Cycle Name
        </label>
        <input
          id="cycle-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekday Morning Route"
          className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Interactive day pills */}
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
          Pickup Days
        </span>
        <div className="flex flex-wrap gap-2">
          {DAY_PILLS.map((pill) => {
            const active = days.includes(pill.value)
            return (
              <button
                key={pill.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(pill.value)}
                className={`min-h-11 min-w-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${active
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-primary/20 text-secondary hover:bg-primary/35'
                  }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Frequency + Pickup time */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cycle-frequency" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
            Frequency
          </label>
          <select
            id="cycle-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white px-3 text-sm font-semibold text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
            Pickup Time
          </span>
          <div className="flex overflow-hidden rounded-xl border border-tertiary/50 bg-white focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
            <input
              aria-label="Hour"
              type="number"
              min="1"
              max="12"
              inputMode="numeric"
              value={hour}
              onChange={(e) => setHour(clampHour(e.target.value))}
              className="min-h-11 w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm text-[#5b4a3a] outline-none"
            />
            <span className="flex items-center px-1 text-lg font-bold text-secondary/50">:</span>
            <input
              aria-label="Minute"
              type="number"
              min="0"
              max="59"
              inputMode="numeric"
              value={String(minute).padStart(2, '0')}
              onChange={(e) => setMinute(clampMinute(e.target.value))}
              className="min-h-11 w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm text-[#5b4a3a] outline-none"
            />
            <button
              type="button"
              onClick={cycleMeridiem}
              aria-label={`Switch meridiem, currently ${meridiem}`}
              className="min-h-11 min-w-[64px] shrink-0 border-l border-tertiary/50 bg-primary/25 px-3 text-sm font-bold text-secondary hover:bg-primary/40"
            >
              {meridiem}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="cycle-timezone" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
          Timezone
        </label>
        <input
          id="cycle-timezone"
          list="tz-list-admin"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
        />
        <datalist id="tz-list-admin">
          {timeZones.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
          <Icon icon="mdi:alert-circle-outline" width="16" height="16" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-secondary px-5 text-sm font-bold text-white hover:bg-secondary/90 disabled:opacity-50"
      >
        <Icon icon={submitting ? 'mdi:loading' : 'mdi:calendar-plus'} width="18" height="18" className={submitting ? 'animate-spin' : ''} aria-hidden="true" />
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

export default CycleForm
