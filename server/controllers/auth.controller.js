const User = require('../models/user.model')
const Organization = require('../models/organization.model')
const PasswordReset = require('../models/passwordReset.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { sendRegistrationCodeEmail, sendMail } = require('../utils/emailService')
const { generateBusinessId, generateRegistrationCode } = require('../utils/codeGenerator')
require('dotenv').config()

/** Helper: sign a JWT for a user document. */
const signToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

/** Helper: shape the user object returned to the client (no password). */
const publicUser = (user, token) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    provider_status: user.provider_status,
    organization_id: user.organization_id,
    registration_code: user.registration_code,
    business_id: user.business_id,
    createdAt: user.createdAt,
    token
})

/**
 * SIGN UP — Resident (Solo) OR Admin (Organization).
 * Body: { username, email, password, role?: 'resident'|'admin', organizationName? }
 *  - role 'admin' also provisions an Organization with an auto business_id.
 */
const signup = async (req, res) => {
    try {
        const { username, email, password, role = 'resident', organizationName } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email and password are required' })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' })
        }

        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = bcrypt.hashSync(password, salt)

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: role === 'admin' ? 'admin' : 'resident',
            provider_status: 'solo'
        })

        // Admins get an Organization provisioned with a unique business_id
        let organization = null
        if (newUser.role === 'admin') {
            const business_id = generateBusinessId()
            organization = new Organization({
                name: organizationName || `${username}'s Organization`,
                business_id,
                admin_id: newUser._id
            })
            newUser.organization_id = organization._id
            newUser.business_id = business_id
            await organization.save()
        }

        await newUser.save()

        const token = signToken(newUser)
        return res.status(201).json({
            message: 'Signup successful',
            user: publicUser(newUser, token),
            organization: organization ? { id: organization._id, name: organization.name, business_id: organization.business_id } : null
        })
    } catch (err) {
        console.error('Signup error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * SIGN IN — Two-role login system.
 * Managed Mode: Body: { registration_code }
 * Solo Mode:    Body: { email, password }
 */
const signin = async (req, res) => {
    try {
        const { email, password, registration_code } = req.body

        // ---- Managed Mode: login via registration_code ----
        if (registration_code) {
            const user = await User.findOne({ registration_code })
            if (!user) {
                return res.status(404).json({ message: 'Invalid registration code' })
            }
            const token = signToken(user)
            return res.status(200).json({
                message: 'Login successful (Managed Mode)',
                mode: 'managed',
                user: publicUser(user, token)
            })
        }

        // ---- Solo Mode: login via email + password ----
        if (email && password) {
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(404).json({ message: 'User with this email was not found' })
            }
            const isMatch = bcrypt.compareSync(password, user.password)
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect password' })
            }
            const token = signToken(user)
            return res.status(200).json({
                message: `Login successful${user.role === 'admin' ? ' (Admin)' : ' (Solo Mode)'}`,
                mode: user.role === 'admin' ? 'admin' : 'solo',
                user: publicUser(user, token)
            })
        }

        return res.status(400).json({
            message: 'Provide either an email & password (Solo Mode) or a registration code (Managed Mode)'
        })
    } catch (err) {
        console.error('Signin error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * SOCIAL AUTH — sign in / sign up via Firebase (Google, GitHub).
 * Body: { username, email, provider, role? }
 * Upserts a user by email; social users don't use a local password.
 */
const socialAuth = async (req, res) => {
    try {
        const { username, email, provider, role } = req.body
        if (!email) {
            return res.status(400).json({ message: 'Email is required for social login' })
        }

        let user = await User.findOne({ email })

        if (!user) {
            // First-time social user — create a resident (or admin) account.
            // Store a random hashed password placeholder (unused for social login).
            const placeholder = bcrypt.hashSync(`${provider}:${Date.now()}:${Math.random()}`, bcrypt.genSaltSync(10))
            user = new User({
                username: username || email.split('@')[0],
                email,
                password: placeholder,
                role: role === 'admin' ? 'admin' : 'resident',
                provider_status: 'solo'
            })

            if (user.role === 'admin') {
                const business_id = generateBusinessId()
                const organization = new Organization({
                    name: `${user.username}'s Organization`,
                    business_id,
                    admin_id: user._id
                })
                user.organization_id = organization._id
                user.business_id = business_id
                await organization.save()
            }

            await user.save()
        }

        const token = signToken(user)
        return res.status(200).json({
            message: `Social login successful (${provider || 'oauth'})`,
            mode: user.role === 'admin' ? 'admin' : 'solo',
            user: publicUser(user, token)
        })
    } catch (err) {
        console.error('Social auth error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * FORGOT PASSWORD — issue reset token & email a reset link.
 * Body: { email }
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.status(400).json({ message: 'Email is required' })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: 'User with this email was not found' })
        }

        const existingReset = await PasswordReset.findOne({ email })
        if (existingReset) {
            try {
                jwt.verify(existingReset.token, process.env.JWT_SECRET)
                return res.status(400).json({ message: 'A password reset link has already been sent. Please check your inbox.' })
            } catch (e) {
                await PasswordReset.deleteOne({ email })
            }
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' })
        await new PasswordReset({ email, token }).save()

        const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`
        const html = `
            <div style="font-family: 'Segoe UI', sans-serif; max-width:600px; margin:0 auto; padding:30px; background:#F7F1DE; border-radius:12px;">
                <h2 style="color:#B87C4C;">Reset your TossSync password 🔐</h2>
                <p style="color:#5b4a3a;">We received a request to reset the password for <strong>${email}</strong>.</p>
                <p style="color:#5b4a3a;">This link expires in <strong>15 minutes</strong>.</p>
                <p style="text-align:center; margin:30px 0;">
                    <a href="${resetLink}" style="background:#B87C4C; color:#fff; padding:14px 30px; border-radius:8px; text-decoration:none; font-weight:600;">Reset Password</a>
                </p>
                <p style="color:#8a7a68; font-size:13px; word-break:break-all;">${resetLink}</p>
            </div>
        `

        await sendMail({ to: email, subject: 'Reset Your TossSync Password 🔐', html })
        return res.status(200).json({ message: 'Password reset link sent to your email!' })
    } catch (err) {
        console.error('Forgot password error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * RESET PASSWORD — set a new password using a valid reset token.
 * Body: { token, password }
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' })
        }

        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (e) {
            return res.status(400).json({ message: 'Invalid or expired token' })
        }

        const user = await User.findOne({ email: decoded.email })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const salt = bcrypt.genSaltSync(10)
        user.password = bcrypt.hashSync(password, salt)
        await user.save()
        await PasswordReset.deleteOne({ email: decoded.email })

        return res.status(200).json({ message: 'Password reset successful' })
    } catch (err) {
        console.error('Reset password error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * GET DASHBOARD — return the authenticated user (populated org if linked).
 * Requires authenticate middleware (req.user set).
 */
const getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('organization_id')
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' })
        }
        return res.status(200).json({ status: true, message: 'Authorized', user })
    } catch (err) {
        console.error('Dashboard error:', err)
        return res.status(500).json({ status: false, message: 'Internal server error' })
    }
}

module.exports = {
    signup,
    signin,
    forgotPassword,
    resetPassword,
    getDashboard,
    // exported helpers for reuse in other controllers
    signToken,
    publicUser
}
