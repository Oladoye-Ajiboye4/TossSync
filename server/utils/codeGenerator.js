/**
 * Utility helpers for generating unique identifiers used across TossSync:
 *  - Business IDs for Organizations (Admins)
 *  - Registration codes for Managed Residents (respecting an org's custom format)
 */

/**
 * Generate a random numeric string of a given length.
 * @param {number} digits
 * @returns {string}
 */
const randomDigits = (digits = 4) => {
    let result = ''
    for (let i = 0; i < digits; i++) {
        result += Math.floor(Math.random() * 10)
    }
    return result
}

/**
 * Generate a random alphanumeric segment (uppercase).
 * @param {number} length
 * @returns {string}
 */
const randomAlphaNum = (length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // avoids ambiguous chars (0/O, 1/I)
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Generate a unique Business ID for an Organization.
 * Format: TS-XXXXXX (e.g. TS-9K3ABC)
 * @returns {string}
 */
const generateBusinessId = () => {
    return `TS-${randomAlphaNum(6)}`
}

/**
 * Generate a registration_code based on an organization's custom code_format.
 * @param {{prefix?: string, separator?: string, digits?: number}} codeFormat
 * @returns {string} e.g. RES-0042
 */
const generateRegistrationCode = (codeFormat = {}) => {
    const prefix = codeFormat.prefix || 'RES'
    const separator = codeFormat.separator || '-'
    const digits = codeFormat.digits || 4
    return `${prefix}${separator}${randomDigits(digits)}`
}

module.exports = {
    randomDigits,
    randomAlphaNum,
    generateBusinessId,
    generateRegistrationCode
}
