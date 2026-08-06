/**
 * pickupDate.js — pure, dependency-free "next pickup" date maths (server side).
 *
 * The Schedule stores each assigned cycle's days as numeric day_of_week values
 * (0 = Sunday … 6 = Saturday) plus an optional 24h "HH:mm" pickup_time. The admin
 * UI, however, thinks in day-abbreviation strings ("Mon","Sat") and 12h times
 * ("10:00 AM"). These helpers bridge both worlds and locate the next occurrence.
 *
 * Zero-Loop Rule: every derivation uses Array.from + .map/.filter/.sort — never a
 * for/while loop.
 */

// Index === day number (matches JS Date.getDay()): 0 = Sunday … 6 = Saturday.
const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 'Sat' → 6, 'mon' → 1, 6 → 6. Returns null when it can't be resolved. */
const toDayNumber = (day) => {
    if (typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) return day
    if (typeof day !== 'string') return null
    const idx = DAY_ABBRS.findIndex((abbr) => abbr.toLowerCase() === day.trim().slice(0, 3).toLowerCase())
    return idx === -1 ? null : idx
}

/** Normalise a mixed array of day strings/numbers into a clean sorted number[]. */
const normalizeDays = (pickupDays) =>
    (Array.isArray(pickupDays) ? pickupDays : [])
        .map(toDayNumber)
        .filter((d) => d !== null)
        .reduce((acc, d) => (acc.includes(d) ? acc : [...acc, d]), [])
        .sort((a, b) => a - b)

/**
 * Parse a time string into { hours (0–23), minutes }.
 * Accepts "10:00 AM", "7:00 am", "07:00" (24h) or "19:30" (24h).
 * Defaults to 08:00 when the value is missing/unparseable.
 */
const parseTimeString = (pickupTimeStr) => {
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
 * @param {Array<string|number>} pickupDays  e.g. ["Sat"] or ["Mon","Thu"] (or numbers 0–6)
 * @param {string}               pickupTimeStr e.g. "10:00 AM" / "07:00 AM" / "18:30"
 * @param {Date}                 [from=new Date()] reference "now" (kept for testability)
 * @returns {Date|null}          next occurrence, or null when no valid days are given
 *
 * Logic: from today, scan the next 7 day-offsets (0…6). For each candidate day that
 * is in the cycle, build the target datetime; if today's slot has already passed we
 * simply fall through to the next matching day. The soonest strictly-future datetime
 * wins.
 */
const getNextPickupDate = (pickupDays, pickupTimeStr, from = new Date()) => {
    const days = normalizeDays(pickupDays)
    if (days.length === 0) return null

    const { hours, minutes } = parseTimeString(pickupTimeStr)
    const now = from instanceof Date && !Number.isNaN(from.getTime()) ? from : new Date()

    // Build one candidate datetime per offset 0..6, keep those that (a) land on a
    // pickup day and (b) are strictly in the future, then take the earliest.
    const candidate = Array.from({ length: 7 }, (_, offset) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes, 0, 0)
        return d
    })
        .filter((d) => days.includes(d.getDay()) && d.getTime() > now.getTime())
        .sort((a, b) => a.getTime() - b.getTime())[0]

    // If every matching slot this week has passed (only possible when today is the
    // sole pickup day and its time is gone), roll to that same weekday next week.
    if (!candidate) {
        const nextWeek = Array.from({ length: 7 }, (_, offset) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 + offset, hours, minutes, 0, 0)
            return d
        })
            .filter((d) => days.includes(d.getDay()))
            .sort((a, b) => a.getTime() - b.getTime())[0]
        return nextWeek || null
    }

    return candidate
}

module.exports = {
    DAY_ABBRS,
    toDayNumber,
    normalizeDays,
    parseTimeString,
    getNextPickupDate
}
