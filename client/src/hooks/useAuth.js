import { useCallback } from 'react'
import { useNavigate } from 'react-router'

/**
 * Lightweight auth helpers backed by localStorage.
 * Centralizes session read/write/clear so components stay clean.
 */
export const getStoredUser = () => {
    try {
        const raw = localStorage.getItem('user')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export const getToken = () => localStorage.getItem('token')

export const setSession = (user) => {
    if (user?.token) localStorage.setItem('token', user.token)
    localStorage.setItem('user', JSON.stringify(user))
}

export const clearSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
}

const useAuth = () => {
    const navigate = useNavigate()

    const login = useCallback((user, redirect = '/dashboard') => {
        setSession(user)
        navigate(redirect)
    }, [navigate])

    const logout = useCallback((redirect = '/signin') => {
        clearSession()
        navigate(redirect)
    }, [navigate])

    return {
        user: getStoredUser(),
        token: getToken(),
        isAuthenticated: !!getToken(),
        login,
        logout
    }
}

export default useAuth
