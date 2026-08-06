const mongoose = require('mongoose')

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    business_id: { type: String, unique: true, required: true },
    admin_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    code_format: {
        prefix: { type: String, default: 'RES' },
        separator: { type: String, default: '-' },
        digits: { type: Number, default: 4 }
    },
    pickup_cycles: [{
        name: { type: String, required: true },
        frequency: { 
            type: String, 
            enum: ['weekly', 'bi-weekly', 'monthly', 'custom'], 
            required: true 
        },
        day_of_week: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 6 = Saturday
        custom_dates: [Date],
        description: { type: String }
    }],
    resident_form_schema: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ['text', 'email', 'tel', 'number', 'textarea'], default: 'text' },
        required: { type: Boolean, default: false },
        placeholder: { type: String }
    }],
    connected_residents: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    createdAt: { type: Date, default: Date.now }
})

const Organization = mongoose.model('Organization', organizationSchema)

module.exports = Organization
