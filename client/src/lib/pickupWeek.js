/**
 * pickupWeek.js — Zero-loop date & "Pickup Week" helpers for the CRM Command Center.
 *
 * Every derived collection here is produced with array methods (Array.from + .map),
 * never with for/while loops, to honour the project's strict Zero-Loop Rule.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/** Strip the time component so day-level comparisons are stable. */
export const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Add N whole days to a date (N may be negative). */
export const addDays = (date, amount) => new Date(startOfDay(date).getTime() + amount * DAY_MS)

/**
 * Start of the "pickup week". weekStartsOn defaults to Monday (1) which matches
 * how most waste-collection operations plan their routes.
 */
export const startOfWeek = (date, weekStartsOn = 1) => {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  return new Date(d.getTime() - diff * DAY_MS)
}

export const endOfWeek = (date, weekStartsOn = 1) =>
  new Date(startOfWeek(date, weekStartsOn).getTime() + 6 * DAY_MS)

export const isSameDay = (a, b) => {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

/** Inclusive "is this day within [start, end]" check at day granularity. */
export const isWithinWeek = (date, start, end) => {
  const t = startOfDay(date).getTime()
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime()
}

/** ISO-8601 week number (1–53). */
export const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
}

/**
 * Build a 6×7 (42 cell) month matrix as a flat array using Array.from — no loops.
 * Each cell carries enough metadata for the mini-calendar to style itself.
 */
export const buildMonthMatrix = (viewDate, weekStartsOn = 1) => {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const gridStart = startOfWeek(firstOfMonth, weekStartsOn)
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, weekStartsOn)
  const weekEnd = endOfWeek(today, weekStartsOn)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS)
    return {
      key: date.toISOString(),
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === viewDate.getMonth(),
      isToday: isSameDay(date, today),
      inPickupWeek: isWithinWeek(date, weekStart, weekEnd)
    }
  })
}

export const formatLongDate = (date) => {
  const d = new Date(date)
  return `${WEEKDAY_LONG[d.getDay()]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export const formatShortDate = (date) => {
  const d = new Date(date)
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** e.g. "Jun 8 – Jun 14" (adds the year only when the range spans two years). */
export const formatWeekRange = (start, end) => {
  const s = new Date(start)
  const e = new Date(end)
  const left = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}`
  const right = `${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`
  const yearSuffix = s.getFullYear() === e.getFullYear() ? '' : `, ${e.getFullYear()}`
  return `${left} – ${right}${yearSuffix}`
}

/** Convenient bundle describing "now" for the dashboard header. */
export const getPickupWeekContext = (reference = new Date(), weekStartsOn = 1) => {
  const today = startOfDay(reference)
  const weekStart = startOfWeek(today, weekStartsOn)
  const weekEnd = endOfWeek(today, weekStartsOn)
  return {
    today,
    weekStart,
    weekEnd,
    isoWeek: getISOWeek(today),
    longToday: formatLongDate(today),
    weekRange: formatWeekRange(weekStart, weekEnd)
  }
}
