const express = require('express')
const router = express.Router()
const {
    getMySchedule,
    assignSchedule,
    reportMissedPickup,
    updatePersonalSchedule,
    updateResidentTracking
} = require('../controllers/schedule.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// Resident actions
router.get('/me', authenticate, getMySchedule)
router.post('/missed', authenticate, reportMissedPickup)
router.put('/personal', authenticate, updatePersonalSchedule)

// Admin action: assign a schedule to a resident
router.post('/assign', authenticate, authorize('admin'), assignSchedule)

// Admin action: update weekly status / skip-next tracking for a resident
router.patch('/tracking', authenticate, authorize('admin'), updateResidentTracking)


module.exports = router
