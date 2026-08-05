const Schedule = require('../models/schedule.model')
const Organization = require('../models/organization.model')

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

module.exports = {
    getMySchedule,
    assignSchedule,
    reportMissedPickup
}
