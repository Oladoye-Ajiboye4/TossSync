/**
 * cycleTime — shared helpers for the Pickup Cycles builder.
 *
 * The backend stores each cycle's days as numeric day_of_week values
 * (0 = Sunday … 6 = Saturday) plus an optional 24h "HH:mm" pickup_time.
 * These helpers translate between that storage shape and the human-friendly
 * Mon–Sun pills + hour/minute + AM/PM controls the admin interacts with.
 *
 * Every transform uses pure array methods (.map/.filter/.reduce/.sort) and
 * spreads — never a for/while loop (project Zero-Loop Rule).
 */

// Interactive pills, ordered Mon → Sun, mapped to their backend numeric value.
export const DAY_PILLS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 }
]

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Reading order helper: treat Sunday (0) as the last day of the week.
const readingOrder = (day) => (day === 0 ? 7 : day)

export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
]

const FREQUENCY_LABEL = FREQUENCY_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label
  return acc
}, {})

export const frequencyLabel = (frequency) => FREQUENCY_LABEL[frequency] || 'Custom'

/**
 * Normalise any cycle into a numeric[] of days, newest schema first
 * (days_of_week), falling back to the legacy single day_of_week.
 */
export const cycleDays = (cycle = {}) => {
  if (Array.isArray(cycle.days_of_week) && cycle.days_of_week.length > 0) {
    return [...cycle.days_of_week]
  }
  if (typeof cycle.day_of_week === 'number') return [cycle.day_of_week]
  return []
}

/** Sort numeric days into Mon-first reading order (pure sort on a copy). */
export const sortDays = (days = []) =>
  [...days].sort((a, b) => readingOrder(a) - readingOrder(b))

/** "Mon, Wed, Fri" — or friendly summaries for the empty / full week. */
export const formatDays = (days = []) => {
  const sorted = sortDays(days)
  if (sorted.length === 0) return 'No days set'
  if (sorted.length === 7) return 'Every day'
  return sorted.map((day) => DAY_SHORT[day]).join(', ')
}

/** Parse stored "HH:mm" (24h) into { hour (1–12), minute, meridiem }. */
export const parseTime = (value) => {
  if (typeof value !== 'string' || !value.includes(':')) {
    return { hour: 7, minute: 0, meridiem: 'AM' }
  }
  const [rawHour, rawMinute] = value.split(':')
  const hour24 = Number(rawHour)
  const minute = Number(rawMinute) || 0
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute, meridiem }
}

/** Build a stored "HH:mm" (24h) string from hour (1–12) + minute + meridiem. */
export const buildTime = (hour, minute, meridiem) => {
  const base = Number(hour) % 12
  const hour24 = meridiem === 'PM' ? base + 12 : base
  const hh = String(hour24).padStart(2, '0')
  const mm = String(Number(minute) || 0).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Display "HH:mm" (24h) as "7:00 AM" — returns null when no time is set. */
export const formatTime = (value) => {
  if (typeof value !== 'string' || !value.includes(':')) return null
  const { hour, minute, meridiem } = parseTime(value)
  return `${hour}:${String(minute).padStart(2, '0')} ${meridiem}`
}

/** One-line human summary combining days + time, e.g. "Mon, Thu • 7:00 AM". */
export const formatSchedule = (cycle = {}) => {
  const days = formatDays(cycleDays(cycle))
  const time = formatTime(cycle.pickup_time)
  return time ? `${days} • ${time}` : days
}

/** 'Sat' → 6, 'mon' → 1, 6 → 6. Returns null when it can't be resolved. */
export const dayToNumber = (day) => {
  if (typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) return day
  if (typeof day !== 'string') return null
  const idx = DAY_SHORT.findIndex(
    (abbr) => abbr.toLowerCase() === day.trim().slice(0, 3).toLowerCase()
  )
  return idx === -1 ? null : idx
}

/** Normalise a mixed array of day strings/numbers into a clean sorted number[]. */
const normalizeDayNumbers = (pickupDays) =>
  (Array.isArray(pickupDays) ? pickupDays : [])
    .map(dayToNumber)
    .filter((d) => d !== null)
    .reduce((acc, d) => (acc.includes(d) ? acc : [...acc, d]), [])
    .sort((a, b) => a - b)

/**
 * Parse a pickup time string into { hours (0–23), minutes }.
 * Accepts "10:00 AM", "7:00 am", "07:00" (24h) or "19:30" (24h).
 * Defaults to 08:00 when the value is missing/unparseable.
 */
const parseClock = (pickupTimeStr) => {
  if (typeof pickupTimeStr !== 'string' || !pickupTimeStr.includes(':')) {
    return { hours: 8, minutes: 0 }
  }
  const match = pickupTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/)
  if (!match) return { hours: 8, minutes: 0 }

  let hours = Number(match[1])
  const minutes = Number(match[2]) || 0
  const meridiem = match[3] ? match[3].toUpperCase() : null

  if (meridiem === 'AM') hours = hours === 12 ? 0 : hours
  else if (meridiem === 'PM') hours = hours === 12 ? 12 : hours + 12

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return { hours: 8, minutes: 0 }
  return { hours, minutes }
}

/**
 * getNextPickupDate — the next upcoming pickup occurrence as a native Date.
 *
 * @param {Array<string|number>} pickupDays   e.g. ["Sat"] or ["Mon","Thu"] (or numbers 0–6)
 * @param {string}               pickupTimeStr e.g. "10:00 AM" / "07:00 AM" / "18:30"
 * @param {Date}                 [from=new Date()] reference "now" (kept for testability)
 * @returns {Date|null}          the next occurrence, or null when no valid days given
 *
 * If today is a pickup day but its time has already passed, the next matching day
 * in the cycle is targeted (rolling into next week when today is the only day).
 */
export const getNextPickupDate = (pickupDays, pickupTimeStr, from = new Date()) => {
  const days = normalizeDayNumbers(pickupDays)
  if (days.length === 0) return null

  const { hours, minutes } = parseClock(pickupTimeStr)
  const now = from instanceof Date && !Number.isNaN(from.getTime()) ? from : new Date()

  const thisWeek = Array.from({ length: 7 }, (_, offset) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes, 0, 0)
  )
    .filter((d) => days.includes(d.getDay()) && d.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0]

  if (thisWeek) return thisWeek

  // Every matching slot this week has passed → roll to the next occurrence.
  return (
    Array.from({ length: 7 }, (_, offset) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 + offset, hours, minutes, 0, 0)
    )
      .filter((d) => days.includes(d.getDay()))
      .sort((a, b) => a.getTime() - b.getTime())[0] || null
  )
}

/**
 * Full, human date-time for the resident hero, e.g.
 * "Saturday, August 8, 2026 at 10:00 AM". Returns null for a missing/invalid date.
 */
export const formatPickupDateTime = (date) => {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const datePart = d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${datePart} at ${timePart}`
}

/**
 * Resolve the next pickup Date for an assigned schedule object.
 * Prefers a server-computed next_pickup, otherwise derives it from the cycle's
 * days_of_week + pickup_time (handles both the enriched `cycle` sub-object and
 * flat schedule fields). Returns null when nothing is assigned/derivable.
 */
export const nextPickupFromSchedule = (schedule) => {
  if (!schedule) return null
  if (schedule.next_pickup) {
    const d = new Date(schedule.next_pickup)
    if (!Number.isNaN(d.getTime())) return d
  }
  const cycle = schedule.cycle || schedule
  const days = cycleDays(cycle)
  if (days.length === 0) return null
  return getNextPickupDate(days, cycle.pickup_time || schedule.pickup_time)
}
