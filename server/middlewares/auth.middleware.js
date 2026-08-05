const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

/**
 * Verify JWT from the Authorization header and attach the user to req.user.
 * Usage: router.get('/route', authenticate, controller)
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ status: false, message: 'Authorization header is missing' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
        return res.status(401).json({ status: false, message: 'Token is missing' })
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ status: false, message: 'Token is expired or invalid' })
        }

        try {
            // Token may carry an id (managed logins) or email (solo logins)
            const query = decoded.id ? { _id: decoded.id } : { email: decoded.email }
            const user = await User.findOne(query)
            if (!user) {
                return res.status(404).json({ status: false, message: 'User not found' })
            }
            req.user = user
            next()
        } catch (error) {
            console.error(error)
            return res.status(500).json({ status: false, message: 'Internal server error' })
        }
    })
}

/**
 * Restrict a route to a specific role (e.g. 'admin').
 * Usage: router.post('/route', authenticate, authorize('admin'), controller)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ status: false, message: 'Access denied: insufficient permissions' })
        }
        next()
    }
}

module.exports = { authenticate, authorize }
