import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../../api/axios'
import CycleCombobox from './CycleCombobox'
import StatusBadge from './StatusBadge'
import { STATUS_CONFIG } from './statusConfig'
import { formatShortDate } from '../../../../lib/pickupWeek'


/**
 * ResidentDetailModal — the deep-management surface for a single resident.
 *
 * Baseline (from spec): edit Name + Area, confirm-guarded Disconnect.
 * Innovations added for a waste-management admin:
 *   1. Weekly Status control (Pending / Completed / Missed) — one tap to reconcile a route.
 *   2. "Skip Next Pickup" toggle — resident travelling / bin already emptied.
 *   3. Quick Email — pre-composed mailto about this week's pickup, plus copy-to-clipboard.
 *   4. Activity Log — reverse-chronological timeline of missed pickups.
 *
 * Mobile-first: a bottom sheet on phones, a centered dialog on larger screens.
 * All list rendering uses .map()/.sort() (zero-loop).
 */

const STATUS_ACTIONS = [
  { value: 'completed', label: 'Completed', icon: 'mdi:check-circle-outline' },
  { value: 'pending', label: 'Pending', icon: 'mdi:clock-outline' },
  { value: 'missed', label: 'Missed', icon: 'mdi:alert-circle-outline' }
]

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'

const ResidentDetailModal = ({
  resident,
  cycles = [],
  onClose,
  onPatch,
  onRemove,
  notify,
  errorNotify
}) => {
  const overlayRef = useRef(null)
  const sheetRef = useRef(null)

  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [skipBusy, setSkipBusy] = useState(false)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [copied, setCopied] = useState('')

  // Hydrate editable fields whenever a different resident is opened.
  useEffect(() => {
    if (resident) {
      setName(resident.username || '')
      setArea(resident.area || '')
      setConfirmingDisconnect(false)
      setCopied('')
    }
  }, [resident])

  const isDirty = useMemo(() => {
    if (!resident) return false
    return name.trim() !== (resident.username || '') || area.trim() !== (resident.area || '')
  }, [name, area, resident])

  // Reverse-chronological activity log (zero-loop: map + sort).
  const activityLog = useMemo(() => {
    const missed = (resident?.missed_pickups || []).map((entry, index) => ({
      id: entry._id || `${entry.date}-${index}`,
      date: entry.date,
      feedback: entry.feedback || 'Missed pickup',
      reportedAt: entry.reported_at || entry.date
    }))
    return missed.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))
  }, [resident])

  useGSAP(
    () => {
      gsap.set(overlayRef.current, { autoAlpha: 0 })
      gsap.set(sheetRef.current, { autoAlpha: 0, y: 40, scale: 0.98 })
      gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
      gsap.to(sheetRef.current, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: 'back.out(1.5)',
        delay: 0.05
      })
      gsap.from('[data-modal-section]', {
        autoAlpha: 0,
        y: 14,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.15
      })
    },
    { scope: overlayRef, dependencies: [resident?._id] }
  )

  const animateClose = () => {
    gsap.to(sheetRef.current, { autoAlpha: 0, y: 40, scale: 0.98, duration: 0.28, ease: 'power2.in' })
    gsap.to(overlayRef.current, {
      autoAlpha: 0,
      duration: 0.28,
      onComplete: () => onClose?.()
    })
  }

  if (!resident) return null

  const residentId = resident._id
  const status = resident.weekly_status || 'pending'

  const handleSaveProfile = async () => {
    if (!isDirty || !name.trim()) return
    try {
      setSavingProfile(true)
      const { data } = await api.patch(`/organization/residents/${residentId}`, {
        username: name.trim(),
        area: area.trim()
      })
      onPatch?.(residentId, {
        username: data.resident?.username ?? name.trim(),
        area: data.resident?.area ?? (area.trim() || null)
      })
      notify?.('Resident profile updated')
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to update resident')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAssignCycle = async (cycleName) => {
    try {
      setAssigning(true)
      await api.post('/schedule/assign', {
        resident_id: residentId,
        cycle_name: cycleName,
        pickup_dates: []
      })
      onPatch?.(residentId, { assigned_cycle: cycleName })
      notify?.(`Assigned "${cycleName}"`)
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to assign cycle')
    } finally {
      setAssigning(false)
    }
  }

  const handleSetStatus = async (nextStatus) => {
    if (nextStatus === status) return
    try {
      setStatusBusy(true)
      await api.patch('/schedule/tracking', {
        resident_id: residentId,
        weekly_status: nextStatus
      })
      onPatch?.(residentId, { weekly_status: nextStatus })
      notify?.(`Marked ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`)
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Could not update status. Assign a cycle first.')
    } finally {
      setStatusBusy(false)
    }
  }

  const handleToggleSkip = async () => {
    const next = !resident.skip_next
    try {
      setSkipBusy(true)
      await api.patch('/schedule/tracking', {
        resident_id: residentId,
        skip_next: next
      })
      onPatch?.(residentId, { skip_next: next })
      notify?.(next ? 'Next pickup will be skipped' : 'Skip removed — pickup resumed')
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Could not update skip setting. Assign a cycle first.')
    } finally {
      setSkipBusy(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      await api.delete(`/organization/residents/${residentId}`)
      notify?.(`${resident.username} disconnected`)
      onRemove?.(residentId)
      animateClose()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to disconnect resident')
      setDisconnecting(false)
    }
  }

  const copyToClipboard = async (text, key) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1600)
    } catch {
      errorNotify?.('Clipboard unavailable')
    }
  }

  const quickEmailHref = () => {
    const subject = encodeURIComponent('Your upcoming waste pickup')
    const body = encodeURIComponent(
      `Hi ${resident.username || 'there'},\n\n` +
        `This is a quick note from your waste management team regarding your ` +
        `${resident.assigned_cycle || 'scheduled'} pickup${resident.area ? ` in ${resident.area}` : ''}.\n\n` +
        `Please have your bins out the night before collection.\n\nThank you!`
    )
    return `mailto:${resident.email}?subject=${subject}&body=${body}`
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === overlayRef.current && animateClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Manage ${resident.username}`}
    >
      <div
        ref={sheetRef}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-tertiary/40 bg-background shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-br from-secondary to-[#9c6538] px-5 pb-5 pt-6 text-white sm:px-6">
          <button
            type="button"
            onClick={animateClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <Icon icon="mdi:close" width="20" height="20" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-black">
              {initials(resident.username)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-extrabold">{resident.username}</h3>
              <p className="truncate text-sm text-white/80">{resident.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} size="sm" />
                {resident.skip_next && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">
                    <Icon icon="mdi:debug-step-over" width="13" height="13" aria-hidden="true" />
                    Skipping next
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-6">
            {/* Editable profile */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel icon="mdi:account-edit-outline" text="Profile" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Resident name"
                    className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                </Field>
                <Field label="Area / Zone">
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Block C, Lekki Phase 1"
                    className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!isDirty || !name.trim() || savingProfile}
                className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-secondary px-4 text-sm font-bold text-white hover:bg-secondary/90 disabled:opacity-50"
              >
                <Icon icon={savingProfile ? 'mdi:loading' : 'mdi:content-save-outline'} width="18" height="18" className={savingProfile ? 'animate-spin' : ''} aria-hidden="true" />
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </section>

            {/* Assigned cycle */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel icon="mdi:calendar-sync-outline" text="Assigned Cycle" />
              <CycleCombobox
                cycles={cycles}
                value={resident.assigned_cycle || ''}
                onSelect={handleAssignCycle}
                loading={assigning}
                placeholder="Type a day or time…"
              />
            </section>

            {/* Weekly status control */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel icon="mdi:list-status" text="Weekly Status" />
              <div className="grid grid-cols-3 gap-2">
                {STATUS_ACTIONS.map((action) => {
                  const isActive = status === action.value
                  return (

                    <button
                      key={action.value}
                      type="button"
                      onClick={() => handleSetStatus(action.value)}
                      disabled={statusBusy}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-bold transition-colors disabled:opacity-60 ${
                        isActive
                          ? 'border-secondary bg-secondary text-white shadow-sm'
                          : 'border-tertiary/40 bg-white text-secondary/70 hover:border-secondary/50'
                      }`}
                    >
                      <Icon icon={action.icon} width="20" height="20" aria-hidden="true" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Skip next pickup toggle */}
            <section data-modal-section>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-tertiary/40 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tertiary/20 text-secondary">
                    <Icon icon="mdi:debug-step-over" width="20" height="20" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#5b4a3a]">Skip Next Pickup</p>
                    <p className="text-xs text-secondary/70">Pause one collection without changing the cycle.</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(resident.skip_next)}
                  onClick={handleToggleSkip}
                  disabled={skipBusy}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                    resident.skip_next ? 'bg-secondary' : 'bg-tertiary/40'
                  }`}
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
                      resident.skip_next ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Quick actions */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel icon="mdi:lightning-bolt-outline" text="Quick Actions" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <a
                  href={quickEmailHref()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-tertiary/50 bg-white px-3 text-sm font-bold text-secondary hover:border-secondary hover:bg-primary/10"
                >
                  <Icon icon="mdi:email-fast-outline" width="18" height="18" aria-hidden="true" />
                  Quick Email
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resident.email, 'email')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-tertiary/50 bg-white px-3 text-sm font-bold text-secondary hover:border-secondary hover:bg-primary/10"
                >
                  <Icon icon={copied === 'email' ? 'mdi:check' : 'mdi:content-copy'} width="18" height="18" aria-hidden="true" />
                  {copied === 'email' ? 'Copied!' : 'Copy Email'}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resident.registration_code, 'code')}
                  disabled={!resident.registration_code}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-tertiary/50 bg-white px-3 text-sm font-bold text-secondary hover:border-secondary hover:bg-primary/10 disabled:opacity-40"
                >
                  <Icon icon={copied === 'code' ? 'mdi:check' : 'mdi:key-outline'} width="18" height="18" aria-hidden="true" />
                  {copied === 'code' ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </section>

            {/* Activity log */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel
                icon="mdi:history"
                text="Activity Log"
                trailing={
                  <span className="rounded-full bg-tertiary/25 px-2 py-0.5 text-[11px] font-bold text-secondary">
                    {activityLog.length} missed
                  </span>
                }
              />
              {activityLog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-tertiary/50 p-6 text-center">
                  <Icon icon="mdi:emoticon-happy-outline" width="28" height="28" className="mx-auto mb-1 text-primary" aria-hidden="true" />
                  <p className="text-sm text-secondary/70">No missed pickups on record. </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {activityLog.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 rounded-xl border border-tertiary/30 bg-white p-3"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <Icon icon="mdi:truck-remove-outline" width="16" height="16" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#5b4a3a]">{formatShortDate(entry.date)}</p>
                        <p className="break-words text-xs text-secondary/70">{entry.feedback}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Danger zone */}
            <section data-modal-section className="flex flex-col gap-3">
              <SectionLabel icon="mdi:shield-alert-outline" text="Danger Zone" tone="danger" />
              {!confirmingDisconnect ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  <Icon icon="mdi:account-remove-outline" width="18" height="18" aria-hidden="true" />
                  Disconnect Resident
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-red-700">
                    <Icon icon="mdi:alert" width="18" height="18" className="mt-0.5 shrink-0" aria-hidden="true" />
                    Remove {resident.username} from your organization? They revert to a solo account and their schedule is cleared.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setConfirmingDisconnect(false)}
                      disabled={disconnecting}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-tertiary bg-white px-4 text-sm font-bold text-secondary hover:bg-tertiary/10 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <Icon icon={disconnecting ? 'mdi:loading' : 'mdi:account-remove'} width="18" height="18" className={disconnecting ? 'animate-spin' : ''} aria-hidden="true" />
                      {disconnecting ? 'Removing…' : 'Yes, disconnect'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* --- small presentational helpers (kept in-file to avoid over-fragmenting) --- */

const SectionLabel = ({ icon, text, trailing, tone }) => (
  <div className="flex items-center justify-between">
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${
        tone === 'danger' ? 'text-red-600' : 'text-secondary/70'
      }`}
    >
      <Icon icon={icon} width="16" height="16" aria-hidden="true" />
      {text}
    </span>
    {trailing}
  </div>
)

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary/60">{label}</span>
    {children}
  </label>
)

export default ResidentDetailModal
