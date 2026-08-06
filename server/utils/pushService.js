/**
 * Web Push API infrastructure for TossSync.
 *
 * Wires up the `web-push` package with VAPID keys and provides helpers to:
 *   - initialize VAPID details on boot (initPush)
 *   - expose the public key to the frontend (getPublicKey)
 *   - persist/remove a client's PushSubscription per user (saveSubscription / removeSubscription)
 *   - deliver notifications to a single subscription or to every device a user owns
 *     (sendNotification / sendNotificationToUser), pruning expired subscriptions.
 *
 * Env:
 *   VAPID_PUBLIC_KEY   – base64url public key (shared with the browser)
 *   VAPID_PRIVATE_KEY  – base64url private key (server only)
 *   VAPID_SUBJECT      – optional mailto:/https: contact (defaults to support address)
 */
require('dotenv').config()

const webpush = require('web-push')
const User = require('../models/user.model')

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@tosssync.com'

// Tracks whether setVapidDetails succeeded. When false, send helpers no-op
// gracefully instead of throwing so the rest of the app keeps working.
let initialized = false

/**
 * Initialize the web-push library with VAPID details.
 * Safe to call once on server boot. Returns true when Web Push is live.
 * @returns {boolean}
 */
const initPush = () => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.log('[pushService] VAPID keys not configured — Web Push disabled.')
        initialized = false
        return false
    }
    try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
        initialized = true
        console.log('[pushService] Web Push initialized ✅')
        return true
    } catch (err) {
        initialized = false
        console.error('[pushService] Failed to initialize Web Push:', err.message)
        return false
    }
}

/**
 * Whether Web Push is configured and ready to send.
 * @returns {boolean}
 */
const isEnabled = () => initialized

/**
 * Expose the public VAPID key to the frontend for subscription.
 * @returns {string}
 */
const getPublicKey = () => VAPID_PUBLIC_KEY

/**
 * Validate that an object looks like a browser PushSubscription.
 * @param {any} sub
 * @returns {boolean}
 */
const isValidSubscription = (sub) =>
    !!sub &&
    typeof sub.endpoint === 'string' &&
    sub.endpoint.length > 0 &&
    !!sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string'

/**
 * Reduce a raw/browser subscription to the shape we persist and send.
 * @param {object} sub
 * @returns {{endpoint: string, expirationTime: number|null, keys: {p256dh: string, auth: string}}}
 */
const normalizeSubscription = (sub) => ({
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
})

/**
 * Persist a client's PushSubscription against a user.
 * De-duplicates by endpoint so re-subscribing the same device won't pile up.
 * @param {string} userId
 * @param {object} subscription
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
const saveSubscription = async (userId, subscription) => {
    if (!isValidSubscription(subscription)) {
        return { ok: false, message: 'Invalid subscription object' }
    }

    const normalized = normalizeSubscription(subscription)

    // Remove any existing entry for this endpoint, then insert the fresh one.
    await User.updateOne(
        { _id: userId },
        { $pull: { push_subscriptions: { endpoint: normalized.endpoint } } }
    )
    await User.updateOne(
        { _id: userId },
        { $push: { push_subscriptions: normalized } }
    )

    console.log(`[pushService] saved subscription for user ${userId}`)
    return { ok: true }
}

/**
 * Remove a stored subscription (e.g. on unsubscribe or when it expires).
 * @param {string} userId
 * @param {string} endpoint
 * @returns {Promise<{ok: boolean, removed: number}>}
 */
const removeSubscription = async (userId, endpoint) => {
    if (!endpoint) return { ok: false, removed: 0 }
    const result = await User.updateOne(
        { _id: userId },
        { $pull: { push_subscriptions: { endpoint } } }
    )
    return { ok: true, removed: result.modifiedCount || 0 }
}

/**
 * Send a push notification to a single subscription.
 * Never throws — returns a structured result so batch callers can continue.
 * @param {object} subscription
 * @param {{title: string, body: string, data?: object}} payload
 * @param {object} [options] web-push options (e.g. { TTL })
 * @returns {Promise<{ok: boolean, statusCode?: number, expired?: boolean, error?: string, skipped?: boolean}>}
 */
const sendNotification = async (subscription, payload, options = {}) => {
    if (!initialized) {
        console.warn('[pushService] sendNotification called before init — skipping.')
        return { ok: false, skipped: true }
    }
    if (!isValidSubscription(subscription)) {
        return { ok: false, error: 'Invalid subscription object' }
    }

    try {
        const result = await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
            },
            JSON.stringify(payload),
            { TTL: 60 * 60, ...options } // default: keep queued up to 1h
        )
        return { ok: true, statusCode: result.statusCode }
    } catch (err) {
        // 404/410 mean the subscription is gone and should be pruned by the caller.
        const expired = err.statusCode === 404 || err.statusCode === 410
        if (!expired) {
            console.error('[pushService] sendNotification error:', err.statusCode, err.body || err.message)
        }
        return { ok: false, statusCode: err.statusCode, expired, error: err.body || err.message }
    }
}

/**
 * Send a notification to every device a user has subscribed.
 * Automatically prunes expired subscriptions from the user document.
 * @param {string} userId
 * @param {{title: string, body: string, data?: object}} payload
 * @param {object} [options] web-push options
 * @returns {Promise<{ok: boolean, sent: number, failed: number, pruned: number, reason?: string}>}
 */
const sendNotificationToUser = async (userId, payload, options = {}) => {
    if (!initialized) {
        return { ok: false, sent: 0, failed: 0, pruned: 0, reason: 'push-disabled' }
    }

    const user = await User.findById(userId).select('push_subscriptions')
    const subscriptions = user?.push_subscriptions || []
    if (subscriptions.length === 0) {
        return { ok: false, sent: 0, failed: 0, pruned: 0, reason: 'no-subscriptions' }
    }

    const results = await Promise.all(
        subscriptions.map((sub) => sendNotification(sub, payload, options))
    )

    // Collect endpoints whose subscriptions have expired and prune them in one write.
    const expiredEndpoints = subscriptions
        .filter((sub, index) => results[index].expired)
        .map((sub) => sub.endpoint)

    if (expiredEndpoints.length > 0) {
        await User.updateOne(
            { _id: userId },
            { $pull: { push_subscriptions: { endpoint: { $in: expiredEndpoints } } } }
        )
    }

    const sent = results.filter((r) => r.ok).length
    return {
        ok: sent > 0,
        sent,
        failed: results.length - sent,
        pruned: expiredEndpoints.length
    }
}

module.exports = {
    initPush,
    isEnabled,
    getPublicKey,
    saveSubscription,
    removeSubscription,
    sendNotification,
    sendNotificationToUser
}
