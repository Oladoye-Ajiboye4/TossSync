import axios from 'axios'

/**
 * Central axios instance for TossSync.
 * - baseURL points at the Express API (/api prefix)
 * - request interceptor attaches the JWT from localStorage
 * - response interceptor clears session on 401
 */
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7890'}/api`,
    headers: { 'Content-Type': 'application/json' }
})

// Attach JWT to every request if present
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Handle expired/invalid tokens globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            const path = window.location.pathname
            // Avoid redirect loops on auth pages
            if (!['/signin', '/signup', '/'].includes(path)) {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            }
        }
        return Promise.reject(error)
    }
)

export default api
