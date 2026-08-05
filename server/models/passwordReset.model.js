const mongoose = require('mongoose')

const passwordResetSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    token: { type: String, required: true },
    expireAt: { 
        type: Date, 
        required: true, 
        default: Date.now, 
        index: { expires: '15m' } 
    },
    createdAt: { type: Date, default: Date.now }
})

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema)

module.exports = PasswordReset
