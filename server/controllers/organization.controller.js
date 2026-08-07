const User = require('../models/user.model')
const Organization = require('../models/organization.model')
const Schedule = require('../models/schedule.model')
const bcrypt = require('bcryptjs')
const { generateRegistrationCode } = require('../utils/codeGenerator')
const { sendRegistrationCodeEmail } = require('../utils/emailService')
const { signToken, publicUser } = require('./auth.controller')


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
 * GET PUBLIC ORGANIZATION — Public lookup of an org's branding + custom
 * registration fields via its business_id. Powers the self-service /invite
 * onboarding route. No auth required; only non-sensitive fields are exposed.
 * Params: :business_id
 */
const getPublicOrganization = async (req, res) => {
    try {
        const business_id = String(req.params.business_id || '').trim()
        if (!business_id) {
            return res.status(400).json({ message: 'Business ID is required' })
        }

        const organization = await Organization.findOne({ business_id })
            .select('name business_id resident_form_schema')
            .lean()

        if (!organization) {
            return res.status(404).json({ message: 'No organization found with that Business ID' })
        }

        // Only surface the safe, public-facing subset of each custom field.
        const fields = (organization.resident_form_schema || []).map((field) => ({
            id: field.id,
            label: field.label,
            type: field.type || 'text',
            required: Boolean(field.required),
            placeholder: field.placeholder || ''
        }))

        return res.status(200).json({
            status: true,
            organization: {
                name: organization.name,
                business_id: organization.business_id,
                resident_form_schema: fields
            }
        })
    } catch (err) {
        console.error('Get public organization error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * JOIN ORGANIZATION — Public self-service resident onboarding via /invite.
 * Creates a brand-new resident, links them to the org identified by business_id,
 * and persists their answers to the org's custom fields. Returns a signed JWT so
 * the resident lands straight in their dashboard.
 * Body: { username, email, password, business_id, custom_fields?: { [label]: value } }
 */
const joinOrganization = async (req, res) => {
    try {
        const { username, email, password, business_id, custom_fields } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email and password are required' })
        }
        if (!business_id) {
            return res.status(400).json({ message: 'A valid invite link (Business ID) is required' })
        }

        const organization = await Organization.findOne({ business_id })
        if (!organization) {
            return res.status(404).json({ message: 'No organization found with that Business ID' })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' })
        }

        // Keep only answers that map to a real field defined by this org, keyed by
        // label (zero-loop: reduce over the schema). Enforces required fields too.
        const schema = organization.resident_form_schema || []
        const answers = custom_fields && typeof custom_fields === 'object' ? custom_fields : {}
        const missingRequired = schema
            .filter((field) => field.required)
            .filter((field) => !String(answers[field.label] ?? '').trim())
            .map((field) => field.label)

        if (missingRequired.length > 0) {
            return res.status(400).json({
                message: `Please complete the required field(s): ${missingRequired.join(', ')}`
            })
        }

        const cleanCustomFields = schema.reduce((acc, field) => {
            const value = answers[field.label]
            if (value !== undefined && String(value).trim() !== '') {
                acc[field.label] = String(value).trim()
            }
            return acc
        }, {})

        // Generate a unique registration_code respecting the org's format.
        let registration_code
        let attempts = 0
        do {
            registration_code = generateRegistrationCode(organization.code_format)
            attempts++
        } while (await User.findOne({ registration_code }) && attempts < 10)

        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10))

        // Some orgs collect a dedicated "Area" field — mirror it onto the first-class
        // `area` column so existing CRM views keep working.
        const areaAnswer = Object.keys(cleanCustomFields)
            .filter((label) => label.trim().toLowerCase() === 'area')
            .map((label) => cleanCustomFields[label])[0]

        const resident = new User({
            username,
            email,
            password: hashedPassword,
            role: 'resident',
            provider_status: 'linked',
            organization_id: organization._id,
            business_id: organization.business_id,
            registration_code,
            custom_fields: cleanCustomFields,
            area: areaAnswer || null
        })
        await resident.save()

        organization.connected_residents.push(resident._id)
        await organization.save()

        const token = signToken(resident)
        return res.status(201).json({
            message: `Welcome to ${organization.name}!`,
            user: publicUser(resident, token),
            organization: { id: organization._id, name: organization.name, business_id }
        })
    } catch (err) {
        console.error('Join organization error:', err)
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
            .lean()

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        // Pull every schedule for this org once, then index by resident_id via .reduce()
        // (zero-loop) so each resident can be enriched with live CRM tracking data.
        const schedules = await Schedule.find({ organization_id: organization._id }).lean()
        const scheduleByResident = schedules.reduce((acc, schedule) => {
            acc[String(schedule.resident_id)] = schedule
            return acc
        }, {})

        const enrichedResidents = (organization.connected_residents || []).map((resident) => {
            const schedule = scheduleByResident[String(resident._id)]
            return {
                ...resident,
                assigned_cycle: schedule?.cycle_name || null,
                // Expose the foreign key so the UI can match residents to a specific
                // cycle even if two cycles ever shared a display name.
                assigned_cycle_id: schedule?.assigned_cycle_id || null,
                weekly_status: schedule?.weekly_status || 'pending',
                skip_next: schedule?.skip_next || false,
                next_pickup: schedule?.next_pickup || null,
                missed_pickups: schedule?.missed_pickups || [],
                status_updated_at: schedule?.status_updated_at || null
            }
        })

        return res.status(200).json({
            status: true,
            organization: { ...organization, connected_residents: enrichedResidents }
        })
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
 * Normalize a days_of_week payload into a clean, de-duplicated, calendar-sorted
 * array of integers 0–6. Pure array methods only (Zero-Loop Rule).
 */
const sanitizeDays = (days) => {
    if (!Array.isArray(days)) return []
    return days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .reduce((acc, d) => (acc.includes(d) ? acc : [...acc, d]), [])
        .sort((a, b) => a - b)
}

/**
 * CREATE CYCLE — Admin adds an official pickup cycle to their org.
 * Requires: authenticate + authorize('admin').
 * Body: { name, frequency, days_of_week?, pickup_time?, day_of_week?, custom_dates?, description? }
 */
const createCycle = async (req, res) => {
    try {
        const { name, frequency, days_of_week, pickup_time, day_of_week, custom_dates, description } = req.body
        if (!name || !frequency) {
            return res.status(400).json({ message: 'Cycle name and frequency are required' })
        }

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const cleanDays = sanitizeDays(days_of_week)
        // Keep the legacy single-day field in sync with the first selected day.
        const primaryDay = cleanDays.length > 0 ? cleanDays[0] : day_of_week

        organization.pickup_cycles.push({
            name,
            frequency,
            days_of_week: cleanDays,
            pickup_time: pickup_time || undefined,
            day_of_week: primaryDay,
            custom_dates,
            description
        })
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
 * UPDATE CYCLE — Admin edits an existing pickup cycle.
 * Requires: authenticate + authorize('admin'). Params: :cycleId
 * Body: { name?, frequency?, days_of_week?, pickup_time?, description? }
 */
const updateCycle = async (req, res) => {
    try {
        const { cycleId } = req.params
        const { name, frequency, days_of_week, pickup_time, description } = req.body

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const cycle = organization.pickup_cycles.id(cycleId)
        if (!cycle) {
            return res.status(404).json({ message: 'Pickup cycle not found' })
        }

        if (typeof name === 'string' && name.trim().length > 0) cycle.name = name.trim()
        if (typeof frequency === 'string' && frequency.length > 0) cycle.frequency = frequency
        if (description !== undefined) cycle.description = description
        if (pickup_time !== undefined) cycle.pickup_time = pickup_time || undefined
        if (days_of_week !== undefined) {
            const cleanDays = sanitizeDays(days_of_week)
            cycle.days_of_week = cleanDays
            cycle.day_of_week = cleanDays.length > 0 ? cleanDays[0] : cycle.day_of_week
        }
        await organization.save()

        return res.status(200).json({
            message: 'Pickup cycle updated',
            pickup_cycles: organization.pickup_cycles
        })
    } catch (err) {
        console.error('Update cycle error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * DELETE CYCLE — Admin removes a pickup cycle from their org.
 * Requires: authenticate + authorize('admin'). Params: :cycleId
 */
const deleteCycle = async (req, res) => {
    try {
        const { cycleId } = req.params

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const exists = (organization.pickup_cycles || []).some((c) => String(c._id) === String(cycleId))
        if (!exists) {
            return res.status(404).json({ message: 'Pickup cycle not found' })
        }

        // Remove via .filter() (Zero-Loop Rule)
        organization.pickup_cycles = organization.pickup_cycles.filter(
            (c) => String(c._id) !== String(cycleId)
        )
        await organization.save()

        return res.status(200).json({
            message: 'Pickup cycle deleted',
            pickup_cycles: organization.pickup_cycles
        })
    } catch (err) {
        console.error('Delete cycle error:', err)
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

/**
 * UPDATE RESIDENT — Admin edits a connected resident's editable profile (name, area).
 * Requires: authenticate + authorize('admin'). Params: :id. Body: { username?, area? }
 */
const updateResident = async (req, res) => {
    try {
        const { id } = req.params
        const { username, area } = req.body

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        // Ownership guard: the resident must belong to this admin's organization
        const owns = (organization.connected_residents || []).some((r) => String(r) === String(id))
        if (!owns) {
            return res.status(403).json({ message: 'This resident is not part of your organization' })
        }

        const resident = await User.findById(id)
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' })
        }

        if (typeof username === 'string' && username.trim().length > 0) {
            resident.username = username.trim()
        }
        if (area !== undefined) {
            resident.area = typeof area === 'string' && area.trim().length > 0 ? area.trim() : null
        }
        await resident.save()

        return res.status(200).json({
            message: 'Resident updated',
            resident: { id: resident._id, username: resident.username, area: resident.area }
        })
    } catch (err) {
        console.error('Update resident error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

/**
 * DISCONNECT RESIDENT — Admin removes a resident from the organization.
 * Detaches the user (reverts to solo) and clears their org schedule. Non-destructive to the account.
 * Requires: authenticate + authorize('admin'). Params: :id
 */
const disconnectResident = async (req, res) => {
    try {
        const { id } = req.params

        const organization = await Organization.findOne({ admin_id: req.user._id })
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' })
        }

        const owns = (organization.connected_residents || []).some((r) => String(r) === String(id))
        if (!owns) {
            return res.status(403).json({ message: 'This resident is not part of your organization' })
        }

        // Remove the reference via .filter() (zero-loop)
        organization.connected_residents = organization.connected_residents.filter(
            (r) => String(r) !== String(id)
        )
        await organization.save()

        // Revert the resident back to a solo account
        await User.findByIdAndUpdate(id, {
            provider_status: 'solo',
            organization_id: null,
            business_id: null,
            $unset: { registration_code: 1 }
        })

        // Clean up their org-scoped schedule so stale tracking data is not left behind
        await Schedule.deleteOne({ resident_id: id, organization_id: organization._id })

        return res.status(200).json({ message: 'Resident disconnected from your organization' })
    } catch (err) {
        console.error('Disconnect resident error:', err)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = {
    connectToOrganization,
    getPublicOrganization,
    joinOrganization,
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
}

