const express = require('express')
const router = express.Router()
const {
    signup,
    signin,
    socialAuth,
    forgotPassword,
    resetPassword,
    getDashboard
} = require('../controllers/auth.controller')
const { authenticate } = require('../middlewares/auth.middleware')

// Public auth routes
router.post('/signup', signup)          // resident (solo) or admin signup
router.post('/signin', signin)          // dual-mode: email/password OR registration_code
router.post('/social', socialAuth)      // Firebase Google/GitHub exchange
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Protected
router.get('/dashboard', authenticate, getDashboard)

module.exports = router
