const mongoose = require('mongoose')

const scheduleSchema = new mongoose.Schema({
    organization_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization', 
        required: true 
    },
    resident_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    cycle_name: { type: String, required: true },
    // Explicit foreign key → Organization.pickup_cycles[]._id (the official cycle).
    // This makes the assignment a real relation instead of a loose name string.
    assigned_cycle_id: { type: mongoose.Schema.Types.ObjectId },
    // Denormalized copy of the assigned cycle's schedule, captured at assign-time,
    // so the resident dashboard can compute the next pickup without a second lookup.
    days_of_week: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday … 6 = Saturday
    pickup_time: { type: String },                    // official time as 24h "HH:mm"
    pickup_dates: [{ type: Date }],
    next_pickup: { type: Date },
    missed_pickups: [{
        date: { type: Date, required: true },
        feedback: { type: String },
        reported_at: { type: Date, default: Date.now }
    }],
    // CRM weekly completion tracking, controlled by the admin command center
    weekly_status: {
        type: String,
        enum: ['pending', 'completed', 'missed'],
        default: 'pending'
    },
    // "Skip Next Pickup" toggle (e.g. resident traveling / bin already emptied)
    skip_next: { type: Boolean, default: false },
    status_updated_at: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

})

scheduleSchema.index({ organization_id: 1, resident_id: 1 })

const Schedule = mongoose.model('Schedule', scheduleSchema)

module.exports = Schedule
