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
