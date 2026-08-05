const express = require('express')
const router = express.Router()
const {
    getMySchedule,
    assignSchedule,
    reportMissedPickup
} = require('../controllers/schedule.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// Resident actions
router.get('/me', authenticate, getMySchedule)
router.post('/missed', authenticate, reportMissedPickup)

// Admin action: assign a schedule to a resident
router.post('/assign', authenticate, authorize('admin'), assignSchedule)

module.exports = router
