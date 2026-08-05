const express = require('express')
const router = express.Router()
const {
    connectToOrganization,
    getMyOrganization,
    updateCodeFormat,
    createCycle,
    createManagedResident,
    bulkUploadResidents
} = require('../controllers/organization.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// Resident action: link a solo account to an org via business_id
router.post('/connect', authenticate, connectToOrganization)

// Admin-only CRM actions
router.get('/me', authenticate, authorize('admin'), getMyOrganization)
router.put('/code-format', authenticate, authorize('admin'), updateCodeFormat)
router.post('/cycles', authenticate, authorize('admin'), createCycle)
router.post('/residents', authenticate, authorize('admin'), createManagedResident)
router.post('/residents/bulk', authenticate, authorize('admin'), bulkUploadResidents)

module.exports = router
