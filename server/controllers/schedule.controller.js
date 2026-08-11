const Schedule = require('../models/schedule.model')
const Organization = require('../models/organization.model')
const User = require('../models/user.model')
const { getNextPickupDate } = require('../utils/pickupDate')
const { DateTime } = require('luxon')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Resolve the official cycle sub-document a schedule points at.
 * Prefers the explicit foreign key (assigned_cycle_id); falls back to the
 * cycle_name string for schedules created before the FK existed.
 */
const resolveCycle = (organization, schedule) => {
    const cycles = organization?.pickup_cycles || []
    if (schedule.assigned_cycle_id) {
        const byId = cycles.find((c) => String(c._id) === String(schedule.assigned_cycle_id))
        if (byId) return byId
    }
    return cycles.find((c) => c.name === schedule.cycle_name) || null
}

/** The cycle's days as numbers 0–6 (new days_of_week[] or legacy single day). */
const cycleDayNumbers = (cycle) => {
    if (!cycle) return []
    if (Array.isArray(cycle.days_of_week) && cycle.days_of_week.length > 0) {
        return [...cycle.days_of_week]
    }
    return typeof cycle.day_of_week === 'number' ? [cycle.day_of_week] : []
}


/**
 * GET MY SCHEDULE — Managed Resident fetches their pickup cycle & next pickup.
 * Requires: authenticate.
 *
 * Performs a relational re-join against the organization's live pickup_cycles so
 * the resident always sees the cycle's current days/time (even if the admin edited
 * it after assignment) and a freshly-recomputed next_pickup relative to "now".
 */
const getMySchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findOne({ resident_id: req.user._id })
            .populate('organization_id', 'name business_id pickup_cycles')
        if (!schedule) {
            return res.status(404).json({ message: 'No schedule found for this resident' })
        }

        // Re-join to the assigned cycle to pull authoritative days + time, then
        // recompute the next occurrence so a stale next_pickup never leaks through.
        const organization = schedule.organization_id
        const cycle = resolveCycle(organization, schedule)
        const days = cycleDayNumbers(cycle)
        const pickupTime = cycle?.pickup_time || schedule.pickup_time || null
        const computedNext = days.length > 0 ? getNextPickupDate(days, pickupTime) : schedule.next_pickup

        // Persist the refreshed denormalized values opportunistically (best effort).
        if (cycle) {
            schedule.days_of_week = days
            schedule.pickup_time = pickupTime || undefined
            schedule.next_pickup = computedNext || schedule.next_pickup
            schedule.save().catch((e) => console.error('Schedule refresh save failed:', e))
        }

        // Return a plain object enriched with the joined cycle context.
        const payload = {
            ...schedule.toObject(),
            days_of_week: days,
            pickup_time: pickupTime,
            next_pickup: computedNext || schedule.next_pickup,
            cycle: cycle
                ? {
                    _id: cycle._id,
                    name: cycle.name,
                    frequency: cycle.frequency,
                    days_of_week: days,
                    day_of_week: cycle.day_of_week,
                    pickup_time: cycle.pickup_time || null,
                    description: cycle.description || ''
                }
                : null
        }

        return res.status(200).json({ status: true, schedule: payload })
    } catch (err) {
        console.error('Get schedule error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}


/**
 * CREATE / ASSIGN SCHEDULE — Admin assigns a cycle & pickup dates to a resident.
 * Requires: authenticate + authorize('admin').
 * Body: { resident_id, cycle_name, pickup_dates?: [Date], next_pickup? }
 *
 * DATA LINKAGE: the cycle the admin selected is looked up on the organization so
 * we can persist a real foreign key (assigned_cycle_id) AND denormalize its
 * days_of_week + pickup_time onto the resident's Schedule. next_pickup is then
 * computed from those official days/time — so the resident dashboard shows an
 * accurate upcoming date instead of "Not scheduled yet".
 */
const assignSchedule = async (req, res) => {
    try {
        const { resident_id, cycle_name, pickup_dates, next_pickup } = req.body
        if (!resident_id || !cycle_name) {
            return res.status(400).json({ message: 'resident_id and cycle_name are required' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        // Ownership guard: the resident must belong to this admin's organization.
        const owns = (organization.connected_residents || []).some(
            (r) => String(r) === String(resident_id)
        )
        if (!owns) {
            return res.status(403).json({ message: 'This resident is not part of your organization' })
        }

        // Resolve the official cycle the admin picked (by name) so we can link it.
        const cycle = (organization.pickup_cycles || []).find((c) => c.name === cycle_name)
        if (!cycle) {
            return res.status(404).json({ message: `No pickup cycle named "${cycle_name}" exists` })
        }

        const days = cycleDayNumbers(cycle)
        const pickupTime = cycle.pickup_time || null

        // Prefer an explicit next_pickup, then any future custom date, then the
        // recurring day/time computation — guaranteeing a concrete upcoming date.
        const explicitDates = Array.isArray(pickup_dates)
            ? pickup_dates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()))
            : []
        const nextFromDates = explicitDates.filter((d) => d >= new Date()).sort((a, b) => a - b)[0] || null
        // Compute the next_pickup in UTC, interpreting the pickupTime in the
        // cycle's timezone (cycle.timezone) or falling back to the organization's timezone.
        const cycleTimezone = (cycle && cycle.timezone) || (organization.timezone) || 'UTC'

        const computedNext = next_pickup
            ? new Date(next_pickup)
            : nextFromDates || (days.length > 0 ? (function () {
                // Use Luxon to compute the next occurrence in the admin zone, then return a JS Date (UTC instant).
                const { hours, minutes } = (function () {
                    const match = String(pickupTime || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/)
                    if (!match) return { hours: 8, minutes: 0 }
                    let hrs = Number(match[1])
                    const mins = Number(match[2]) || 0
                    const mer = match[3] ? match[3].toUpperCase() : null
                    if (mer === 'AM') hrs = hrs === 12 ? 0 : hrs
                    else if (mer === 'PM') hrs = hrs === 12 ? 12 : hrs + 12
                    if (hrs < 0 || hrs > 23) hrs = 8
                    return { hours: hrs, minutes: mins }
                })();

                const nowAdmin = DateTime.now().setZone(cycleTimezone)
                const candidates = Array.from({ length: 14 }, (_, offset) =>
                    nowAdmin.plus({ days: offset }).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
                ).filter((dt) => days.includes(dt.weekday % 7) && dt.toMillis() > nowAdmin.toMillis())
                    .sort((a, b) => a.toMillis() - b.toMillis())

                const nextAdminDT = candidates[0]
                return nextAdminDT ? nextAdminDT.setZone('utc').toJSDate() : null
            })() : null)

        let schedule = await Schedule.findOne({ resident_id, organization_id: organization._id })
        if (schedule) {
            schedule.cycle_name = cycle_name
            schedule.assigned_cycle_id = cycle._id
            schedule.days_of_week = days
            schedule.pickup_time = pickupTime || undefined
            schedule.pickup_dates = explicitDates
            schedule.next_pickup = computedNext
            schedule.updatedAt = new Date()
        } else {
            schedule = new Schedule({
                organization_id: organization._id,
                resident_id,
                cycle_name,
                assigned_cycle_id: cycle._id,
                days_of_week: days,
                pickup_time: pickupTime || undefined,
                pickup_dates: explicitDates,
                next_pickup: computedNext
            })
        }
        await schedule.save()

        return res.status(201).json({ message: 'Schedule assigned', schedule })
    } catch (err) {
        console.error('Assign schedule error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * REPORT MISSED PICKUP — Managed Resident reports a missed pickup with feedback.
 * Requires: authenticate. Body: { date?, feedback }
 */
const reportMissedPickup = async (req, res) => {
    try {
        const { date, feedback } = req.body
        const schedule = await Schedule.findOne({ resident_id: req.user._id })
        if (!schedule) {
            return res.status(404).json({ message: 'No schedule found for this resident' })
        }

        schedule.missed_pickups.push({
            date: date ? new Date(date) : new Date(),
            feedback: feedback || '',
            reported_at: new Date()
        })
        schedule.updatedAt = new Date()
        await schedule.save()

        return res.status(201).json({
            message: 'Missed pickup reported. Your provider has been notified.',
            missed_pickups: schedule.missed_pickups
        })
    } catch (err) {
        console.error('Report missed pickup error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * UPDATE PERSONAL SCHEDULE — Resident saves their autonomous pickup cycle & reminders.
 * Available always (solo or linked). Requires: authenticate.
 * Body: { enabled, frequency, pickup_dates, notification_time, reminder_lead_time, secondary_emails, hybrid_mode }
 */
const updatePersonalSchedule = async (req, res) => {
    try {
        const {
            enabled,
            frequency,
            custom_days,
            pickup_dates,
            notification_time,
            reminder_lead_value,
            reminder_lead_unit,
            pickup_time_value,
            pickup_time_unit,
            timezone,
            secondary_emails,
            hybrid_mode
        } = req.body

        const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const VALID_UNITS = ['minutes', 'hours']

        // Sanitize selected custom days against the allow-list (no loops)
        const cleanedDays = Array.isArray(custom_days)
            ? custom_days
                .filter((day) => VALID_DAYS.includes(day))
                .filter((day, index, arr) => arr.indexOf(day) === index)
            : []

        const toUnit = (unit, fallback) => (VALID_UNITS.includes(unit) ? unit : fallback)
        const toValue = (value, fallback) => {
            const n = Number(value)
            return Number.isFinite(n) && n >= 0 ? n : fallback
        }


        // Normalize + validate secondary emails using array methods (no loops)
        const cleanedEmails = Array.isArray(secondary_emails)
            ? secondary_emails
                .map((email) => String(email).trim().toLowerCase())
                .filter((email) => email.length > 0)
            : []

        const uniqueEmails = cleanedEmails.filter((email, index) => cleanedEmails.indexOf(email) === index)

        if (uniqueEmails.length > 2) {
            return res.status(400).json({ message: 'A maximum of 2 secondary emails is allowed' })
        }

        const invalidEmail = uniqueEmails.find((email) => !EMAIL_REGEX.test(email))
        if (invalidEmail) {
            return res.status(400).json({ message: `Invalid email address: ${invalidEmail}` })
        }

        const dates = Array.isArray(pickup_dates)
            ? pickup_dates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()))
            : []

        const user = await User.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        user.personal_schedule = {
            enabled: enabled ?? user.personal_schedule?.enabled ?? false,
            frequency: frequency ?? user.personal_schedule?.frequency ?? 'weekly',
            custom_days: cleanedDays,
            pickup_dates: dates,
            notification_time: notification_time ?? user.personal_schedule?.notification_time ?? '08:00',
            reminder_lead_value: toValue(reminder_lead_value, user.personal_schedule?.reminder_lead_value ?? 2),
            reminder_lead_unit: toUnit(reminder_lead_unit, user.personal_schedule?.reminder_lead_unit ?? 'hours'),
            pickup_time_value: toValue(pickup_time_value, user.personal_schedule?.pickup_time_value ?? 8),
            pickup_time_unit: toUnit(pickup_time_unit, user.personal_schedule?.pickup_time_unit ?? 'hours'),
            timezone: typeof timezone === 'string' && timezone.length > 0
                ? timezone
                : user.personal_schedule?.timezone ?? 'UTC',
            secondary_emails: uniqueEmails,
            hybrid_mode: hybrid_mode ?? user.personal_schedule?.hybrid_mode ?? false
        }

        await user.save()

        return res.status(200).json({
            message: 'Personal schedule saved',
            personal_schedule: user.personal_schedule
        })
    } catch (err) {
        console.error('Update personal schedule error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * UPDATE RESIDENT TRACKING — Admin sets a resident's weekly status and/or skip-next flag.
 * Powers the CRM Command Center "Weekly Status" badges and "Skip Next Pickup" toggle.
 * Requires: authenticate + authorize('admin').
 * Body: { resident_id, weekly_status?, skip_next? }
 */
const VALID_STATUSES = ['pending', 'completed', 'missed']

const updateResidentTracking = async (req, res) => {
    try {
        const { resident_id, weekly_status, skip_next } = req.body
        if (!resident_id) {
            return res.status(400).json({ message: 'resident_id is required' })
        }

        if (weekly_status !== undefined && !VALID_STATUSES.includes(weekly_status)) {
            return res.status(400).json({ message: 'Invalid weekly_status value' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const schedule = await Schedule.findOne({ resident_id, organization_id: organization._id })
        if (!schedule) {
            return res.status(404).json({ message: 'Assign a cycle to this resident before tracking status' })
        }

        if (weekly_status !== undefined) {
            schedule.weekly_status = weekly_status
            // Auto-log a missed pickup entry so the modal Activity Log stays truthful
            if (weekly_status === 'missed') {
                schedule.missed_pickups.push({
                    date: new Date(),
                    feedback: 'Marked missed by admin',
                    reported_at: new Date()
                })
            }
        }
        if (skip_next !== undefined) {
            schedule.skip_next = Boolean(skip_next)
        }
        schedule.status_updated_at = new Date()
        schedule.updatedAt = new Date()
        await schedule.save()

        return res.status(200).json({ message: 'Tracking updated', schedule })
    } catch (err) {
        console.error('Update resident tracking error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = {
    getMySchedule,
    assignSchedule,
    reportMissedPickup,
    updatePersonalSchedule,
    updateResidentTracking
}

