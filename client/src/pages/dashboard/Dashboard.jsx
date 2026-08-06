import React, { useState, useEffect } from 'react'
import { ToastContainer, toast, Bounce } from 'react-toastify'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'

import api from '../../api/axios'
import { clearSession } from '../../hooks/useAuth'
import SoloResidentView from '../../components/dashboard/SoloResidentView'
import ManagedResidentView from '../../components/dashboard/ManagedResidentView'
import AdminDashboard from '../../components/dashboard/admin/AdminDashboard'

/**
 * Dashboard — unified router that conditionally renders the correct view
 * based on the authenticated user's role and provider_status:
 *   - role 'admin'          → AdminDashboard
 *   - provider_status 'linked' (resident) → ManagedResidentView
 *   - provider_status 'solo'   (resident) → SoloResidentView
 */
const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Themed toast notifications
  const notify = (message) => {
    toast.success(message, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
      transition: Bounce
    })
  }

  const errorNotify = (message) => {
    toast.error(message, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
      transition: Bounce
    })
  }

  // Fetch the authenticated user; if a linked resident, also fetch their schedule.
  const loadDashboard = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      errorNotify('No session found. Please sign in again.')
      setTimeout(() => navigate('/signin'), 1500)
      return
    }

    try {
      setLoading(true)
      const { data } = await api.get('/auth/dashboard')
      const fetchedUser = data.user
      setUser(fetchedUser)

      // Linked residents (non-admin) get their pickup schedule
      if (fetchedUser.role === 'resident' && fetchedUser.provider_status === 'linked') {
        try {
          const scheduleRes = await api.get('/schedule/me')
          setSchedule(scheduleRes.data.schedule)
        } catch (scheduleErr) {
          // A missing schedule (404) is expected until an admin assigns one
          if (scheduleErr?.response?.status !== 404) {
            console.error('Schedule fetch error:', scheduleErr)
          }
        }
      }
    } catch (error) {
      const status = error?.response?.status
      if (status === 401) {
        errorNotify('Session expired. Please sign in again.')
        clearSession()
        setTimeout(() => navigate('/signin'), 1500)
      } else {
        errorNotify(error?.response?.data?.message || 'Failed to load your dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    clearSession()
    notify('Logged out successfully!')
    setTimeout(() => navigate('/signin'), 1000)
  }

  // Called by SoloResidentView after a successful provider connection.
  const handleConnected = () => {
    loadDashboard()
  }

  // Called by resident components after personal schedule updates.
  const handleRefresh = () => {
    loadDashboard()
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-secondary mx-auto" />
          <p className="text-secondary font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Determine which view to render
  const renderView = () => {
    if (!user) return null
    if (user.role === 'admin') {
      return <AdminDashboard user={user} notify={notify} errorNotify={errorNotify} />
    }
    if (user.provider_status === 'linked') {
      return (
        <ManagedResidentView
          user={user}
          schedule={schedule}
          onRefresh={handleRefresh}
          notify={notify}
          errorNotify={errorNotify}
        />
      )
    }
    return (
      <SoloResidentView
        user={user}
        onConnected={handleConnected}
        onRefresh={handleRefresh}
        notify={notify}
        errorNotify={errorNotify}
      />
    )
  }

  // Contextual subtitle per role/status
  const getSubtitle = () => {
    if (!user) return ''
    if (user.role === 'admin') return 'Manage your organization, residents and pickup cycles'
    if (user.provider_status === 'linked') return 'Track your upcoming waste pickups'
    return 'Connect to a provider to get started'
  }

  return (
    <main className="min-h-screen w-full bg-background p-4 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon icon="mdi:recycle" width="28" height="28" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary">
                Welcome, {user?.username || 'User'}!
              </h1>
              <p className="text-[#5b4a3a]/70 text-sm sm:text-base">{getSubtitle()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-secondary text-white px-4 py-3 rounded-xl font-semibold hover:brightness-95 transition shadow-lg shadow-black/5"
          >
            <Icon icon="mdi:logout" width="20" height="20" />
            <span>Logout</span>
          </button>
        </div>

        {/* Role-based content */}
        {renderView()}

        {/* Footer */}
        <div className="text-center space-y-2 mt-10">
          <p className="text-[#5b4a3a]/60 text-xs">© 2026 TossSync. Keeping communities clean ♻️</p>
        </div>
      </div>

      <ToastContainer position="top-center" theme="light" transition={Bounce} />
    </main>
  )
}

export default Dashboard
