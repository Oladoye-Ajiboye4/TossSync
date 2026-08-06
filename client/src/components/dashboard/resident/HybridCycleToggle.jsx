import React, { useState } from 'react'
import { Icon } from '@iconify/react'

import api from '../../../api/axios'

/**
 * Hybrid Cycle Toggle — allows residents to keep personal reminders
 * active alongside their provider's official schedule when linked.
 */
const HybridCycleToggle = ({ user, schedule, onUpdate, notify, errorNotify }) => {
  const personal = user?.personal_schedule || {}
  const [hybridMode, setHybridMode] = useState(personal.hybrid_mode || false)
  const [saving, setSaving] = useState(false)

  const handleToggle = async (checked) => {
    try {
      setSaving(true)
      setHybridMode(checked)
      const { data } = await api.put('/schedule/personal', {
        enabled: personal.enabled,
        frequency: personal.frequency,
        notification_time: personal.notification_time,
        reminder_lead_time: personal.reminder_lead_time,
        secondary_emails: personal.secondary_emails || [],
        hybrid_mode: checked
      })
      notify?.(data.message || `Hybrid mode ${checked ? 'enabled' : 'disabled'}`)
      onUpdate?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to update hybrid mode')
      setHybridMode(!checked)
    } finally {
      setSaving(false)
    }
  }

  const orgName = schedule?.organization_id?.name || 'Your Provider'
  const cycleName = schedule?.cycle_name || 'Official Cycle'

  return (
    <div className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-secondary">Dual-Cycle Mode</h3>
          <p className="mt-1 text-sm text-secondary/70">
            Keep your personal reminders active alongside the provider schedule.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-[#5b4a3a]">{hybridMode ? 'On' : 'Off'}</span>
          <input
            type="checkbox"
            checked={hybridMode}
            onChange={(event) => handleToggle(event.target.checked)}
            disabled={saving}
            className="size-5 accent-secondary disabled:opacity-50"
          />
        </label>
      </div>

      {hybridMode && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-xl border border-primary/50 bg-primary/20 p-4">
            <Icon icon="mdi:domain" width="22" height="22" className="shrink-0 text-secondary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-bold text-secondary">{orgName} Schedule</p>
              <p className="text-sm text-secondary/70">{cycleName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-tertiary/50 bg-tertiary/20 p-4">
            <Icon icon="mdi:account-clock-outline" width="22" height="22" className="shrink-0 text-secondary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-bold text-secondary">Your Personal Schedule</p>
              <p className="text-sm text-secondary/70">
                {personal.enabled ? `${personal.frequency} reminders` : 'Not configured'}
              </p>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Icon icon="mdi:information-outline" width="18" height="18" className="shrink-0 mt-0.5" aria-hidden="true" />
              <p>Both schedules will send you email reminders independently. Your countdown timer shows whichever pickup comes first.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HybridCycleToggle
