import React, { useRef, useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../api/axios'
import CompositeTimeInput from './CompositeTimeInput'
import DaySelector from './DaySelector'
import PushNotificationToggle from './PushNotificationToggle'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'custom', label: 'Custom Days' }
]

const PersonalScheduleCard = ({ user, onUpdate, notify, errorNotify }) => {
  const personal = user?.personal_schedule || {}
  const [enabled, setEnabled] = useState(personal.enabled || false)
  const [frequency, setFrequency] = useState(personal.frequency || 'weekly')
  const [customDays, setCustomDays] = useState(personal.custom_days || [])
  const [notificationTime, setNotificationTime] = useState(personal.notification_time || '08:00')
  const [leadValue, setLeadValue] = useState(personal.reminder_lead_value ?? 2)
  const [leadUnit, setLeadUnit] = useState(personal.reminder_lead_unit || 'hours')
  const [pickupValue, setPickupValue] = useState(personal.pickup_time_value ?? 8)
  const [pickupUnit, setPickupUnit] = useState(personal.pickup_time_unit || 'hours')
  const [secondaryEmails, setSecondaryEmails] = useState(personal.secondary_emails || [])
  const [emailInput, setEmailInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState(personal.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const timeZones = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone')
    return ['UTC']
  }, [])


  const formRef = useRef(null)
  const { contextSafe } = useGSAP({ scope: formRef })

  const expandForm = contextSafe(() => {
    if (!formRef.current) return
    const content = formRef.current.querySelector('[data-expand]')
    if (!content) return
    gsap.to(content, {
      height: 'auto',
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out'
    })
  })

  const collapseForm = contextSafe(() => {
    if (!formRef.current) return
    const content = formRef.current.querySelector('[data-expand]')
    if (!content) return
    gsap.to(content, {
      height: 0,
      opacity: 0,
      duration: 0.4,
      ease: 'power3.in'
    })
  })

  const handleToggle = (checked) => {
    setEnabled(checked)
    if (checked) {
      expandForm()
    } else {
      collapseForm()
    }
  }

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    if (secondaryEmails.length >= 2) {
      errorNotify?.('Maximum 2 secondary emails allowed')
      return
    }
    if (secondaryEmails.includes(email)) {
      errorNotify?.('This email is already added')
      return
    }
    setSecondaryEmails((current) => [...current, email])
    setEmailInput('')
  }

  const handleRemoveEmail = (emailToRemove) => {
    setSecondaryEmails((current) => current.filter((email) => email !== emailToRemove))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      // Use explicit resident-selected IANA timezone so reminders fire accurately on Render.
      const { data } = await api.put('/schedule/personal', {
        enabled,
        frequency,
        custom_days: frequency === 'custom' ? customDays : [],
        notification_time: notificationTime,
        reminder_lead_value: Number(leadValue),
        reminder_lead_unit: leadUnit,
        pickup_time_value: Number(pickupValue),
        pickup_time_unit: pickupUnit,
        timezone,
        secondary_emails: secondaryEmails,
        hybrid_mode: personal.hybrid_mode || false
      })

      notify?.(data.message || 'Personal schedule saved')
      onUpdate?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to save personal schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={formRef} className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-secondary">Personal Pickup Schedule</h3>
          <p className="mt-1 text-sm text-secondary/70">Manage your own custom reminders.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-[#5b4a3a]">Enable</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleToggle(event.target.checked)}
            className="size-5 accent-secondary"
          />
        </label>
      </div>

      <div
        data-expand
        className={`flex flex-col gap-4 overflow-hidden ${enabled ? '' : 'h-0 opacity-0'}`}
      >
        <div>
          <label htmlFor="frequency" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
            Frequency
          </label>
          <select
            id="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          >
            {FREQUENCIES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {frequency === 'custom' && (
          <DaySelector selected={customDays} onChange={setCustomDays} />
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="notif-time" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
              Notification Time
            </label>
            <input
              id="notif-time"
              type="time"
              value={notificationTime}
              onChange={(event) => setNotificationTime(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <CompositeTimeInput
            id="lead-time"
            label="Reminder Lead Time"
            value={leadValue}
            unit={leadUnit}
            onValueChange={setLeadValue}
            onUnitChange={setLeadUnit}
          />
          <CompositeTimeInput
            id="pickup-time"
            label="Pickup Schedule Time"
            value={pickupValue}
            unit={pickupUnit}
            onValueChange={setPickupValue}
            onUnitChange={setPickupUnit}
          />
        </div>

        <div>
          <label htmlFor="personal-timezone" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
            Timezone
          </label>
          <input
            id="personal-timezone"
            list="tz-list-personal"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
          <datalist id="tz-list-personal">
            {timeZones.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
        </div>

        <PushNotificationToggle notify={notify} errorNotify={errorNotify} />


        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
            Secondary Emails ({secondaryEmails.length}/2)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), handleAddEmail())}
              placeholder="family@example.com"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
            <button
              type="button"
              onClick={handleAddEmail}
              disabled={secondaryEmails.length >= 2 || !emailInput.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-white hover:bg-secondary/90 disabled:bg-tertiary/60"
            >
              <Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" />
              Add
            </button>
          </div>
          {secondaryEmails.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {secondaryEmails.map((email) => (
                <li key={email} className="flex items-center justify-between gap-2 rounded-lg bg-primary/20 px-3 py-2">
                  <span className="truncate text-sm font-medium text-[#5b4a3a]">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    aria-label={`Remove ${email}`}
                    className="shrink-0 text-red-600 hover:text-red-700"
                  >
                    <Icon icon="mdi:close-circle" width="20" height="20" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-secondary px-4 text-sm font-bold text-secondary hover:bg-secondary/10 disabled:opacity-60"
        >
          <Icon icon="mdi:content-save-outline" width="20" height="20" aria-hidden="true" />
          {saving ? 'Saving...' : 'Save Personal Schedule'}
        </button>
      </div>
    </div>
  )
}

export default PersonalScheduleCard
