import React from 'react'

import { nextPickupFromSchedule } from '../../lib/cycleTime'
import ResidentTabShell from './resident/ResidentTabShell'
import CountdownHero from './resident/CountdownHero'
import ProviderStatusCard from './resident/ProviderStatusCard'
import HybridCycleToggle from './resident/HybridCycleToggle'
import PersonalScheduleCard from './resident/PersonalScheduleCard'
import MissedPickupDrawer from './resident/MissedPickupDrawer'
import HowItWorks from './resident/HowItWorks'

/**
 * Managed Resident View — linked to a provider.
 * Tabbed dual-cycle experience: Overview, Personal Schedule, Dual-Cycle Settings,
 * and How It Works. Header quick-actions (push + guide) live in the tab shell.
 */
const ManagedResidentView = ({ user, schedule, onRefresh, notify, errorNotify }) => {
  const providerNext = nextPickupFromSchedule(schedule)
  const personalDates = user?.personal_schedule?.pickup_dates || []
  const orgName = schedule?.organization_id?.name || user?.organization_id?.name || 'Your Provider'
  const cycleName = schedule?.cycle?.name || schedule?.cycle_name || 'Not assigned yet'

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'mdi:view-dashboard-outline',
      content: (
        <div className="flex flex-col gap-6">
          <CountdownHero providerNext={providerNext} personalDates={personalDates} />
          <ProviderStatusCard
            connected
            orgName={orgName}
            cycleName={cycleName}
            nextPickup={providerNext}
          />
          <MissedPickupDrawer notify={notify} errorNotify={errorNotify} />
        </div>
      )
    },
    {
      id: 'personal',
      label: 'Personal Schedule',
      icon: 'mdi:calendar-account-outline',
      content: (
        <PersonalScheduleCard
          user={user}
          onUpdate={onRefresh}
          notify={notify}
          errorNotify={errorNotify}
        />
      )
    },
    {
      id: 'dual',
      label: 'Dual-Cycle',
      icon: 'mdi:sync',
      content: (
        <HybridCycleToggle
          user={user}
          schedule={schedule}
          onUpdate={onRefresh}
          notify={notify}
          errorNotify={errorNotify}
        />
      )
    },
    {
      id: 'guide',
      label: 'How It Works',
      icon: 'mdi:book-open-variant',
      content: <HowItWorks />
    }
  ]

  return (
    <ResidentTabShell tabs={tabs} notify={notify} errorNotify={errorNotify} />
  )
}

export default ManagedResidentView
