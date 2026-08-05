import { signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from './firebase'
import api from '../api/axios'

/**
 * Map Firebase auth error codes to friendly messages.
 */
export const firebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
        case 'auth/popup-closed-by-user':
            return 'Popup closed. Please try again.'
        case 'auth/cancelled-popup-request':
            return 'Cancelled popup request. Try again.'
        case 'auth/popup-blocked':
            return 'Popup blocked by browser. Allow popups and try again.'
        case 'auth/unauthorized-domain':
            return 'Unauthorized domain. Contact support.'
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled. Contact support.'
        case 'auth/invalid-credential':
            return 'Invalid credential. Try again.'
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with a different sign-in method.'
        default:
            return "Couldn't complete social sign-in. Try again."
    }
}

/**
 * Perform a Firebase popup login (google | github), then exchange with our backend.
 * @param {'google'|'github'} providerName
 * @param {'resident'|'admin'} role
 * @returns {Promise<object>} the TossSync user object (with token)
 */
export const socialLogin = async (providerName = 'google', role = 'resident') => {
    const provider = providerName === 'github' ? githubProvider : googleProvider
    const result = await signInWithPopup(auth, provider)
    const fbUser = result.user

    const payload = {
        username: fbUser.displayName || fbUser.email?.split('@')[0],
        email: fbUser.email,
        provider: providerName,
        role
    }

    const { data } = await api.post('/auth/social', payload)
    return data.user
}

export { GoogleAuthProvider, GithubAuthProvider }
