const express = require('express')
const router = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const { getPublicKey, saveSubscription, removeSubscription } = require('../utils/pushService')

/**
 * Web Push routes.
 * The frontend fetches the VAPID public key, registers a subscription,
 * and can unsubscribe a device.
 */

// Expose VAPID public key to clients
router.get('/vapid-public-key', (req, res) => {
    return res.status(200).json({ publicKey: getPublicKey() })
})

// Save a client's PushSubscription against the authenticated user
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const result = await saveSubscription(req.user._id, req.body.subscription)
        if (!result.ok) {
            return res.status(400).json({ message: result.message || 'Invalid subscription' })
        }
        return res.status(201).json({ message: 'Subscription saved', ...result })
    } catch (err) {
        console.error('Push subscribe error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
})

// Remove a device's PushSubscription (unsubscribe)
router.post('/unsubscribe', authenticate, async (req, res) => {
    try {
        const result = await removeSubscription(req.user._id, req.body.endpoint)
        return res.status(200).json({ message: 'Subscription removed', ...result })
    } catch (err) {
        console.error('Push unsubscribe error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
})

module.exports = router

