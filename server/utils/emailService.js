/**
 * Centralized Nodemailer email service for TossSync.
 * Provides reusable transporter + branded templates for:
 *  (A) Welcome / registration_code delivery on account creation
 *  (B) Pickup reminder notifications
 * Also retains a generic sendMail wrapper for password reset, etc.
 */
const nodemailer = require('nodemailer')
require('dotenv').config()

// TossSync brand palette (mirrors client CSS variables)
const THEME = {
    primary: '#A8BBA3',   // Sage
    secondary: '#B87C4C', // Brown
    tertiary: '#C4A484',  // Light Brown
    background: '#F7F1DE'  // Beige
}

/**
 * Create and return a configured Nodemailer transporter.
 * @returns {import('nodemailer').Transporter}
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'oladoyeajiboye@gmail.com',
            pass: process.env.GOOGLE_APP_PASSWORD
        }
    })
}

/**
 * Generic send wrapper. Returns a promise so callers can await it.
 * `from` / `replyTo` are optional overrides — when omitted we fall back to the
 * default TossSync identity. This lets pickup reminders be sent *on behalf of*
 * the resident's provider (dynamic From) while replies route to the admin.
 * @param {{to: string|string[], subject: string, html: string, from?: string, replyTo?: string}} options
 * @returns {Promise<any>}
 */
const sendMail = ({ to, subject, html, from, replyTo }) => {
    const transporter = createTransporter()
    const mailOptions = {
        from: from || `"TossSync Team" <${process.env.EMAIL_USER || 'oladoyeajiboye@gmail.com'}>`,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {})
    }
    return transporter.sendMail(mailOptions)
}

/**
 * Base HTML wrapper for consistent branding.
 */
const layout = (title, subtitle, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: ${THEME.background}; }
    .header { background: ${THEME.primary}; padding: 40px 20px; text-align: center; border-radius: 15px 15px 0 0; }
    .header h1 { color: #2f3a2b; margin: 0; font-size: 30px; font-weight: 700; }
    .header p { color: #4a5544; margin: 8px 0 0 0; font-size: 14px; }
    .content { padding: 40px 30px; background: #ffffff; }
    .greeting { font-size: 22px; color: ${THEME.secondary}; font-weight: 600; margin: 0 0 15px 0; }
    .message { color: #5b4a3a; font-size: 16px; line-height: 1.6; margin: 15px 0; }
    .highlight { color: ${THEME.secondary}; font-weight: 600; }
    .code-box { background: ${THEME.background}; border: 2px dashed ${THEME.tertiary}; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center; }
    .code-box .code { font-family: monospace; font-size: 28px; letter-spacing: 4px; color: ${THEME.secondary}; font-weight: 700; }
    .info-box { background: ${THEME.background}; border-left: 4px solid ${THEME.primary}; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .cta-button { display: inline-block; background: ${THEME.secondary}; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: ${THEME.secondary}; color: #fff; padding: 30px; text-align: center; border-radius: 0 0 15px 15px; }
    .footer p { margin: 8px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>♻️ ${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p style="margin-top:0;"><strong>TossSync — Waste Pickup, Simplified</strong></p>
      <p>© ${new Date().getFullYear()} TossSync. All rights reserved.</p>
      <p style="font-size:11px; opacity:0.85;">This is an automated email. Please don't reply directly.</p>
    </div>
  </div>
</body>
</html>
`

/**
 * (A) Send a welcome email containing the resident's registration_code.
 * @param {{to: string, username: string, registrationCode: string, organizationName?: string}} params
 * @returns {Promise<any>}
 */
const sendRegistrationCodeEmail = ({ to, username, registrationCode, organizationName }) => {
    const body = `
        <p class="greeting">Welcome, ${username}! 👋</p>
        <p class="message">
            Your TossSync account has been created${organizationName ? ` under <span class="highlight">${organizationName}</span>` : ''}.
            Use the registration code below to sign in as a <span class="highlight">Managed Resident</span>.
        </p>
        <div class="code-box">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#8a7a68; margin-bottom:8px;">Your Registration Code</div>
            <div class="code">${registrationCode}</div>
        </div>
        <div class="info-box">
            <p class="message" style="margin:0;">
                Keep this code safe. You'll use it (instead of an email &amp; password) to access your pickup schedule.
            </p>
        </div>
        <center>
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/signin" class="cta-button">Sign In to TossSync</a>
        </center>
    `
    return sendMail({
        to,
        subject: `Your TossSync Registration Code 🔑`,
        html: layout('Welcome to TossSync', 'Your account is ready', body)
    })
}

/**
 * (B) Send a pickup reminder email.
 * When `adminOrgName` is provided the email is sent *on behalf of* the provider
 * (dynamic From identity) and `adminEmail` is wired as Reply-To so resident
 * replies land in the admin's inbox rather than the shared TossSync mailbox.
 * @param {{
 *   to: string,
 *   username: string,
 *   pickupDate: Date,
 *   cycleName?: string,
 *   adminOrgName?: string,
 *   adminEmail?: string
 * }} params
 * @returns {Promise<any>}
 */
const sendPickupReminderEmail = ({ to, username, pickupDate, cycleName, adminOrgName, adminEmail }) => {
    const dateStr = new Date(pickupDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const body = `
        <p class="greeting">Hi ${username}! 🗑️</p>
        <p class="message">
            This is a friendly reminder that your next waste pickup${cycleName ? ` (<span class="highlight">${cycleName}</span>)` : ''} is scheduled for:
        </p>
        <div class="code-box">
            <div class="code" style="font-size:20px; letter-spacing:1px;">${dateStr}</div>
        </div>
        <div class="info-box">
            <p class="message" style="margin:0;">
                Please have your waste ready for collection the night before or early on the pickup day.
            </p>
        </div>
    `
    // Dynamically brand the sender as the resident's provider when known.
    const from = adminOrgName ? `"${adminOrgName}" <noreply@tosssync.com>` : undefined
    return sendMail({
        to,
        subject: `♻️ Pickup Reminder — ${dateStr}`,
        html: layout('Pickup Reminder', 'Your next collection is coming up', body),
        from,
        replyTo: adminEmail
    })
}

/**
 * (C) Fan out a single pickup reminder to an entire resident array at once.
 * Zero-Loop Rule: the resident list is `.filter()`-ed then `.map()`-ped straight
 * into a Promise array and awaited together with `Promise.all` — no imperative
 * iteration. Every email inherits the same dynamic provider From / Reply-To.
 * @param {{
 *   residents: Array<{ email: string, username?: string }>,
 *   pickupDate: Date,
 *   cycleName?: string,
 *   adminOrgName?: string,
 *   adminEmail?: string
 * }} params
 * @returns {Promise<any[]>} resolves once every reminder has been dispatched
 */
const sendPickupReminderBatch = ({ residents = [], pickupDate, cycleName, adminOrgName, adminEmail }) =>
    Promise.all(
        residents
            .filter((resident) => resident && resident.email)
            .map((resident) =>
                sendPickupReminderEmail({
                    to: resident.email,
                    username: resident.username || 'Resident',
                    pickupDate,
                    cycleName,
                    adminOrgName,
                    adminEmail
                })
            )
    )

module.exports = {
    createTransporter,
    sendMail,
    sendRegistrationCodeEmail,
    sendPickupReminderEmail,
    sendPickupReminderBatch,
    THEME
}
