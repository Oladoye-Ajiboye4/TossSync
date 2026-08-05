const express = require('express')
const router = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const { getPublicKey, saveSubscription } = require('../utils/pushService')

/**
 * Web Push routes (STUB infrastructure).
 * The frontend can fetch the VAPID public key and register a subscription.
 */

// Expose VAPID public key to clients
router.get('/vapid-public-key', (req, res) => {
    return res.status(200).json({ publicKey: getPublicKey() })
})

// Save a client's PushSubscription (stub)
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const result = await saveSubscription(req.user._id, req.body.subscription)
        return res.status(201).json({ message: 'Subscription saved (stub)', ...result })
    } catch (err) {
        console.error('Push subscribe error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
})

module.exports = router
