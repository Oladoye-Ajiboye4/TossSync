/*
 * One-off migration script: recompute `next_pickup` for all Schedule documents
 * using the authoritative cycle timezone (cycle.timezone || organization.timezone).
 * Run with: NODE_ENV=production node scripts/recompute_next_pickups.js
 */
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Schedule = require('../models/schedule.model')
const Organization = require('../models/organization.model')
const { DateTime } = require('luxon')

    ; (async () => {
        try {
            await connectDB()
            const schedules = await Schedule.find().lean()
            console.log(`Found ${schedules.length} schedules`)

            for (const s of schedules) {
                try {
                    const org = await Organization.findById(s.organization_id).lean()
                    if (!org) continue

                    const cycle = (org.pickup_cycles || []).find((c) => String(c._id) === String(s.assigned_cycle_id))
                    const days = (Array.isArray(cycle?.days_of_week) && cycle.days_of_week.length > 0)
                        ? cycle.days_of_week
                        : (Array.isArray(s.days_of_week) ? s.days_of_week : [])
                    const pickupTime = (cycle && cycle.pickup_time) || s.pickup_time || null
                    if (!pickupTime || !days || days.length === 0) continue

                    const tz = (cycle && cycle.timezone) || org.timezone || 'UTC'
                    const match = String(pickupTime || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/)
                    const hours = match ? Number(match[1]) : 8
                    const minutes = match ? Number(match[2]) : 0

                    const nowAdmin = DateTime.now().setZone(tz)
                    const candidates = Array.from({ length: 14 }, (_, offset) =>
                        nowAdmin.plus({ days: offset }).set({ hour: hours % 24, minute: minutes, second: 0, millisecond: 0 })
                    ).filter((dt) => (days || []).includes(dt.weekday % 7) && dt.toMillis() > nowAdmin.toMillis())
                        .sort((a, b) => a.toMillis() - b.toMillis())

                    const next = candidates[0]
                    if (next) {
                        await Schedule.updateOne({ _id: s._id }, { $set: { next_pickup: next.setZone('utc').toJSDate(), updatedAt: new Date() } })
                        console.log(`Updated schedule ${s._id} -> ${next.toISO()}`)
                    }
                } catch (err) {
                    console.error('Error updating schedule', s._id, err)
                }
            }

            console.log('Migration complete')
            process.exit(0)
        } catch (err) {
            console.error('Migration failed', err)
            process.exit(1)
        }
    })()
