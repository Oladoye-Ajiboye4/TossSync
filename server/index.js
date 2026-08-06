const express = require('express')
const cors = require('cors')
require('dotenv').config()

const connectDB = require('./config/db')
const { initPush } = require('./utils/pushService')

// Route modules
const authRoutes = require('./routes/auth.routes')
const organizationRoutes = require('./routes/organization.routes')
const scheduleRoutes = require('./routes/schedule.routes')
const pushRoutes = require('./routes/push.routes')

const app = express()

// Allowed frontend origins (Vite dev server may use 5173 or fall back to 5174, etc.)
const allowedOrigins = (process.env.APP_URL || 'http://localhost:5173,http://localhost:5174,https://toss-sync.vercel.app/')
    .split(',')
    .map((o) => o.trim())

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (e.g., curl, Postman) that have no origin
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())


// Initialize services
connectDB()
initPush()

// Mount modular routers
app.use('/api/auth', authRoutes)
app.use('/api/organization', organizationRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/push', pushRoutes)

// Health check
app.get('/', (req, res) => {
    res.status(200).json({ message: 'TossSync API is running ♻️' })
})

const PORT = process.env.PORT || process.env.port || 7890

app.listen(PORT, () => {
    console.log(`TossSync server listening on http://localhost:${PORT}`)
})
