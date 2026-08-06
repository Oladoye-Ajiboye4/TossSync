const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['resident', 'admin'], 
        default: 'resident' 
    },
    provider_status: { 
        type: String, 
        enum: ['solo', 'linked'], 
        default: 'solo' 
    },
    organization_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization', 
        default: null 
    },
    registration_code: { 
        type: String
        // No `default: null` — must remain undefined for users without a code
        // so the partial unique index below skips them (null is treated as a value).
    },
    business_id: { 
        type: String, 
        default: null 
    },
    area: {
        type: String,
        default: null
    },

    // Resident-owned autonomous schedule + reminder settings (Feature A/B)
    personal_schedule: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['weekly', 'bi-weekly', 'custom'],
            default: 'weekly'
        },
        // Selected weekday names for 'custom' frequency (e.g. ['Mon','Wed'])
        custom_days: { type: [String], default: [] },
        pickup_dates: [{ type: Date }],
        notification_time: { type: String, default: '08:00' }, // HH:mm 24h
        // Dynamic composite reminder lead time (value + unit)
        reminder_lead_value: { type: Number, default: 2, min: 0 },
        reminder_lead_unit: {
            type: String,
            enum: ['minutes', 'hours'],
            default: 'hours'
        },
        // Dynamic composite pickup schedule time (value + unit)
        pickup_time_value: { type: Number, default: 8, min: 0 },
        pickup_time_unit: {
            type: String,
            enum: ['minutes', 'hours'],
            default: 'hours'
        },
        // Resident's local IANA timezone, injected client-side for accurate firing on Render
        timezone: { type: String, default: 'UTC' },

        secondary_emails: {
            type: [String],
            validate: {
                validator: (emails) => Array.isArray(emails) && emails.length <= 2,
                message: 'A maximum of 2 secondary emails is allowed'
            },
            default: []
        },
        // Keep personal reminders active alongside the provider schedule
        hybrid_mode: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
})

// Unique only among documents that actually have a string registration_code.
// A partial index (unlike sparse) correctly ignores both missing AND null values.
userSchema.index(
    { registration_code: 1 },
    { unique: true, partialFilterExpression: { registration_code: { $type: 'string' } } }
)

const User = mongoose.model('User', userSchema)


module.exports = User
