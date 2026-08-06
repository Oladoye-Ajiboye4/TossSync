const Schedule = require('../models/schedule.model')
const Organization = require('../models/organization.model')
const User = require('../models/user.model')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


/**
 * GET MY SCHEDULE — Managed Resident fetches their pickup cycle & next pickup.
 * Requires: authenticate.
 */
const getMySchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findOne({ resident_id: req.user._id })
            .populate('organization_id', 'name business_id')
        if (!schedule) {
            return res.status(404).json({ message: 'No schedule found for this resident' })
        }
        return res.status(200).json({ status: true, schedule })
    } catch (err) {
        console.error('Get schedule error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * CREATE / ASSIGN SCHEDULE — Admin assigns a cycle & pickup dates to a resident.
 * Requires: authenticate + authorize('admin').
 * Body: { resident_id, cycle_name, pickup_dates: [Date], next_pickup? }
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

        const dates = Array.isArray(pickup_dates) ? pickup_dates.map((d) => new Date(d)) : []
        const computedNext = next_pickup
            ? new Date(next_pickup)
            : dates.filter((d) => d >= new Date()).sort((a, b) => a - b)[0] || null

        let schedule = await Schedule.findOne({ resident_id, organization_id: organization._id })
        if (schedule) {
            schedule.cycle_name = cycle_name
            schedule.pickup_dates = dates
            schedule.next_pickup = computedNext
            schedule.updatedAt = new Date()
        } else {
            schedule = new Schedule({
                organization_id: organization._id,
                resident_id,
                cycle_name,
                pickup_dates: dates,
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

module.exports = {
    getMySchedule,
    assignSchedule,
    reportMissedPickup,
    updatePersonalSchedule
}
