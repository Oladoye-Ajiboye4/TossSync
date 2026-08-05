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
    pickup_dates: [{ type: Date }],
    next_pickup: { type: Date },
    missed_pickups: [{
        date: { type: Date, required: true },
        feedback: { type: String },
        reported_at: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

scheduleSchema.index({ organization_id: 1, resident_id: 1 })

const Schedule = mongoose.model('Schedule', scheduleSchema)

module.exports = Schedule
