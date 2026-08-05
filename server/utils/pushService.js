/**
 * Web Push API infrastructure (STUB).
 *
 * This module scaffolds the Web Push notification pipeline for TossSync.
 * It is intentionally stubbed out — wire up the `web-push` package and VAPID
 * keys when ready to go live.
 *
 * Setup checklist (for later):
 *   1. npm install web-push
 *   2. Generate VAPID keys:  npx web-push generate-vapid-keys
 *   3. Add VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to .env
 *   4. Persist client PushSubscription objects (per user) in the DB
 *   5. Replace the stub bodies below with real webpush.sendNotification calls
 */
require('dotenv').config()

// let webpush = require('web-push') // uncomment once installed

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

/**
 * Initialize the web-push library with VAPID details.
 * STUB: no-op until web-push is installed & keys are configured.
 */
const initPush = () => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.log('[pushService] VAPID keys not configured — Web Push disabled (stub mode).')
        return false
    }
    // webpush.setVapidDetails(
    //     'mailto:support@tosssync.com',
    //     VAPID_PUBLIC_KEY,
    //     VAPID_PRIVATE_KEY
    // )
    console.log('[pushService] initPush called (stub).')
    return true
}

/**
 * Expose the public VAPID key to the frontend for subscription.
 * @returns {string}
 */
const getPublicKey = () => VAPID_PUBLIC_KEY

/**
 * Persist a client's PushSubscription. STUB.
 * @param {string} userId
 * @param {object} subscription
 * @returns {Promise<{ok: boolean}>}
 */
const saveSubscription = async (userId, subscription) => {
    console.log(`[pushService] (stub) saveSubscription for user ${userId}`)
    // TODO: store `subscription` against the user document
    return { ok: true }
}

/**
 * Send a push notification to a single subscription. STUB.
 * @param {object} subscription
 * @param {{title: string, body: string, data?: object}} payload
 * @returns {Promise<{ok: boolean, stub: boolean}>}
 */
const sendNotification = async (subscription, payload) => {
    console.log('[pushService] (stub) sendNotification:', payload?.title)
    // return webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true, stub: true }
}

module.exports = {
    initPush,
    getPublicKey,
    saveSubscription,
    sendNotification
}
