import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../api/axios'
import OverviewTab from './tabs/OverviewTab'
import ConnectedResidentsTab from './tabs/ConnectedResidentsTab'
import PickupCyclesTab from './tabs/PickupCyclesTab'
import FormBuilderTab from './tabs/FormBuilderTab'
import ShareTab from './tabs/ShareTab'
import BulkToolsTab from './tabs/BulkToolsTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard-outline' },
  { id: 'residents', label: 'Connected Residents', icon: 'mdi:account-group' },
  { id: 'cycles', label: 'Pickup Cycles', icon: 'mdi:calendar-clock' },
  { id: 'onboarding', label: 'Registration Fields', icon: 'mdi:form-textbox' },
  { id: 'share', label: 'Share & Invite', icon: 'mdi:share-variant-outline' },
  { id: 'bulk', label: 'Bulk Tools', icon: 'mdi:database-cog-outline' }
]


const AdminDashboard = ({ user, notify, errorNotify }) => {
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const panelRef = useRef(null)

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/organization/me')
      setOrganization(data.organization)
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }, [errorNotify])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useGSAP(() => {
    if (!organization) return
    gsap.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    )
  }, { dependencies: [activeTab, organization], scope: panelRef })

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="size-10 animate-spin rounded-full border-4 border-tertiary/30 border-t-secondary" />
          <p className="text-sm font-medium text-secondary/70">Loading your organization...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <Icon icon="mdi:alert-circle-outline" width="40" height="40" className="mx-auto mb-3 text-red-600" aria-hidden="true" />
        <p className="font-bold text-[#5b4a3a]">Organization not found</p>
        <p className="mt-1 text-sm text-secondary/70">Please contact support if this issue persists.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="sticky top-0 z-30 -mx-4 border-b border-tertiary/40 bg-background/90 px-4 pb-3 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="mb-3">
          <p className="text-sm font-semibold text-secondary">{user?.username || organization.name}</p>
          <h1 className="text-2xl font-extrabold text-[#5b4a3a]">Admin Dashboard</h1>
        </div>

        <nav
          role="tablist"
          aria-label="Admin dashboard sections"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold ${
                  isActive
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-white text-secondary/80 hover:bg-primary/20'
                }`}
              >
                <Icon icon={tab.icon} width="18" height="18" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </header>

      <div
        ref={panelRef}
        id={`${activeTab}-panel`}
        role="tabpanel"
        className="min-h-64"
      >
        {activeTab === 'overview' && <OverviewTab organization={organization} />}
        {activeTab === 'residents' && (
          <ConnectedResidentsTab
            organization={organization}
            onUpdate={fetchOrganization}
            onNavigate={setActiveTab}
            notify={notify}
            errorNotify={errorNotify}
          />
        )}
        {activeTab === 'cycles' && (
          <PickupCyclesTab
            organization={organization}
            onRefresh={fetchOrganization}
            notify={notify}
            errorNotify={errorNotify}
          />
        )}
        {activeTab === 'onboarding' && (
          <FormBuilderTab
            organization={organization}
            onRefresh={fetchOrganization}

            notify={notify}
            errorNotify={errorNotify}
          />
        )}
        {activeTab === 'share' && (
          <ShareTab organization={organization} notify={notify} errorNotify={errorNotify} />
        )}
        {activeTab === 'bulk' && (
          <BulkToolsTab
            organization={organization}
            onRefresh={fetchOrganization}
            notify={notify}
            errorNotify={errorNotify}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
