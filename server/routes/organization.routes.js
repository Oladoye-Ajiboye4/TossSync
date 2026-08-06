const express = require('express')
const router = express.Router()
const {
    connectToOrganization,
    getMyOrganization,
    updateCodeFormat,
    updateFormSchema,
    createCycle,
    updateCycle,
    deleteCycle,
    createManagedResident,
    bulkUploadResidents,
    updateResident,
    disconnectResident
} = require('../controllers/organization.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// Resident action: link a solo account to an org via business_id
router.post('/connect', authenticate, connectToOrganization)

// Admin-only CRM actions
router.get('/me', authenticate, authorize('admin'), getMyOrganization)
router.put('/code-format', authenticate, authorize('admin'), updateCodeFormat)
router.put('/form-schema', authenticate, authorize('admin'), updateFormSchema)
router.post('/cycles', authenticate, authorize('admin'), createCycle)
router.patch('/cycles/:cycleId', authenticate, authorize('admin'), updateCycle)
router.delete('/cycles/:cycleId', authenticate, authorize('admin'), deleteCycle)
router.post('/residents', authenticate, authorize('admin'), createManagedResident)
router.post('/residents/bulk', authenticate, authorize('admin'), bulkUploadResidents)

// Admin-only resident lifecycle management (CRM Command Center)
router.patch('/residents/:id', authenticate, authorize('admin'), updateResident)
router.delete('/residents/:id', authenticate, authorize('admin'), disconnectResident)


module.exports = router
