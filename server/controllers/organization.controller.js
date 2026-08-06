const User = require('../models/user.model')
const Organization = require('../models/organization.model')
const bcrypt = require('bcryptjs')
const { generateRegistrationCode } = require('../utils/codeGenerator')
const { sendRegistrationCodeEmail } = require('../utils/emailService')

/**
 * CONNECT — Solo Resident links to an Admin Organization using its business_id.
 * Requires: authenticate. Body: { business_id }
 */
const connectToOrganization = async (req, res) => {
    try {
        const { business_id } = req.body
        if (!business_id) {
            return res.status(400).json({ message: 'Business ID is required' })
        }

        const organization = await Organization.findOne({ business_id })
        if (!organization) {
            return res.status(404).json({ message: 'No organization found with that Business ID' })
        }

        const user = req.user
        if (user.provider_status === 'linked') {
            return res.status(400).json({ message: 'You are already linked to a provider' })
        }

        user.organization_id = organization._id
        user.provider_status = 'linked'
        user.business_id = business_id
        await user.save()

        if (!organization.connected_residents.includes(user._id)) {
            organization.connected_residents.push(user._id)
            await organization.save()
        }

        return res.status(200).json({
            message: `Connected to ${organization.name} successfully`,
            organization: { id: organization._id, name: organization.name, business_id }
        })
    } catch (err) {
        console.error('Connect error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * GET MY ORGANIZATION — Admin fetches their org, cycles & connected residents.
 * Requires: authenticate + authorize('admin').
 */
const getMyOrganization = async (req, res) => {
    try {
        const organization = await Organization.findOne({ admin_id: req.user._id })
            .populate('connected_residents', 'username email area registration_code provider_status createdAt')

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }
        return res.status(200).json({ status: true, organization })
    } catch (err) {
        console.error('Get organization error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * UPDATE CODE FORMAT — Admin configures registration_code generation rules.
 * Requires: authenticate + authorize('admin'). Body: { prefix, separator, digits }
 */
const updateCodeFormat = async (req, res) => {
    try {
        const { prefix, separator, digits } = req.body
        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        if (prefix !== undefined) organization.code_format.prefix = prefix
        if (separator !== undefined) organization.code_format.separator = separator
        if (digits !== undefined) organization.code_format.digits = digits
        await organization.save()

        return res.status(200).json({ message: 'Code format updated', code_format: organization.code_format })
    } catch (err) {
        console.error('Update code format error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * CREATE CYCLE — Admin adds a custom pickup cycle to their org.
 * Requires: authenticate + authorize('admin').
 * Body: { name, frequency, day_of_week?, custom_dates?, description? }
 */
const createCycle = async (req, res) => {
    try {
        const { name, frequency, day_of_week, custom_dates, description } = req.body
        if (!name || !frequency) {
            return res.status(400).json({ message: 'Cycle name and frequency are required' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        organization.pickup_cycles.push({ name, frequency, day_of_week, custom_dates, description })
        await organization.save()

        return res.status(201).json({
            message: 'Pickup cycle created',
            pickup_cycles: organization.pickup_cycles
        })
    } catch (err) {
        console.error('Create cycle error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * CREATE MANAGED RESIDENT — Admin creates a resident who receives a registration_code by email.
 * Requires: authenticate + authorize('admin'). Body: { username, email, password? }
 */
const createManagedResident = async (req, res) => {
    try {
        const { username, email, password } = req.body
        if (!username || !email) {
            return res.status(400).json({ message: 'Username and email are required' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' })
        }

        // Generate a unique registration_code respecting the org's format
        let registration_code
        let attempts = 0
        do {
            registration_code = generateRegistrationCode(organization.code_format)
            attempts++
        } while (await User.findOne({ registration_code }) && attempts < 10)

        const rawPassword = password || Math.random().toString(36).slice(-10)
        const hashedPassword = bcrypt.hashSync(rawPassword, bcrypt.genSaltSync(10))

        const resident = new User({
            username,
            email,
            password: hashedPassword,
            role: 'resident',
            provider_status: 'linked',
            organization_id: organization._id,
            business_id: organization.business_id,
            registration_code
        })
        await resident.save()

        organization.connected_residents.push(resident._id)
        await organization.save()

        // (A) Email the registration_code to the new resident
        sendRegistrationCodeEmail({
            to: email,
            username,
            registrationCode: registration_code,
            organizationName: organization.name
        }).catch((e) => console.error('Failed to send registration code email:', e))

        return res.status(201).json({
            message: 'Managed resident created; registration code emailed',
            resident: { id: resident._id, username, email, registration_code }
        })
    } catch (err) {
        console.error('Create managed resident error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * UPDATE FORM SCHEMA — Admin configures custom registration fields.
 * Requires: authenticate + authorize('admin'). Body: { resident_form_schema: [{ id, label, type, required, placeholder }] }
 */
const updateFormSchema = async (req, res) => {
    try {
        const { resident_form_schema } = req.body
        if (!Array.isArray(resident_form_schema)) {
            return res.status(400).json({ message: 'resident_form_schema must be an array' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        organization.resident_form_schema = resident_form_schema
        await organization.save()

        return res.status(200).json({ 
            message: 'Registration form schema updated', 
            resident_form_schema: organization.resident_form_schema 
        })
    } catch (err) {
        console.error('Update form schema error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * BULK UPLOAD — Admin uploads CSV/Excel-parsed residents.
 * Requires: authenticate + authorize('admin'). Body: { residents: [{ username, email }] }
 * NOTE: File parsing (multer + csv/xlsx) is stubbed on the route; this accepts a parsed array.
 */
const bulkUploadResidents = async (req, res) => {
    try {
        const { residents } = req.body
        if (!Array.isArray(residents) || residents.length === 0) {
            return res.status(400).json({ message: 'A non-empty residents array is required' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const created = []
        const skipped = []

        for (const row of residents) {
            const { username, email } = row
            if (!username || !email) {
                skipped.push({ row, reason: 'Missing username or email' })
                continue
            }
            if (await User.findOne({ email })) {
                skipped.push({ row, reason: 'Email already exists' })
                continue
            }

            let registration_code
            let attempts = 0
            do {
                registration_code = generateRegistrationCode(organization.code_format)
                attempts++
            } while (await User.findOne({ registration_code }) && attempts < 10)

            const rawPassword = Math.random().toString(36).slice(-10)
            const hashedPassword = bcrypt.hashSync(rawPassword, bcrypt.genSaltSync(10))

            const resident = new User({
                username,
                email,
                password: hashedPassword,
                role: 'resident',
                provider_status: 'linked',
                organization_id: organization._id,
                business_id: organization.business_id,
                registration_code
            })
            await resident.save()
            organization.connected_residents.push(resident._id)
            created.push({ username, email, registration_code })

            sendRegistrationCodeEmail({
                to: email,
                username,
                registrationCode: registration_code,
                organizationName: organization.name
            }).catch((e) => console.error('Bulk email failed for', email, e))
        }

        await organization.save()
        return res.status(201).json({
            message: `Bulk upload complete: ${created.length} created, ${skipped.length} skipped`,
            created,
            skipped
        })
    } catch (err) {
        console.error('Bulk upload error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = {
    connectToOrganization,
    getMyOrganization,
    updateCodeFormat,
    updateFormSchema,
    createCycle,
    createManagedResident,
    bulkUploadResidents
}
