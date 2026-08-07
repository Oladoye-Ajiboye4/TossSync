import React from 'react'
import { Icon } from '@iconify/react'
import { buildGoogleCalendarUrl, formatPickupDateTime } from '../../../lib/cycleTime'

/**
 * CalendarSyncCard — Offline Alarm via Google Calendar.
 *
 * Surfaces an "Add to Google Calendar" button when the resident has a next
 * pickup date (provider schedule or personal reminder). Clicking the link
 * opens Google Calendar's template editor pre-filled with the pickup event,
 * giving the resident a native device alarm that works even when offline.
 *
 * Zero-Loop Rule: pure data prep; no array iteration needed for a single event.
 */
const CalendarSyncCard = ({ nextPickup, providerName = 'Your Provider' }) => {
  if (!nextPickup) return null

  const calendarUrl = buildGoogleCalendarUrl({ date: nextPickup, providerName })
  if (!calendarUrl) return null

  const dateTimeLabel = formatPickupDateTime(nextPickup)

  return (
    <div className="rounded-3xl border border-tertiary/40 bg-gradient-to-br from-white/95 to-primary/5 p-6 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] sm:p-8">
      <div className="mb-5 flex items-start gap-4">
        <div className="rounded-2xl bg-primary/30 p-3">
          <Icon icon="mdi:calendar-clock" width="26" height="26" className="text-secondary" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-extrabold text-secondary">Offline Reminder</h3>
          <p className="text-sm text-[#5b4a3a]/70">
            Sync your next pickup to Google Calendar for a native device alarm.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-background/60 p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary/60">
          Next Pickup
        </div>
        <div className="text-base font-bold text-[#5b4a3a]">{dateTimeLabel || 'Upcoming'}</div>
      </div>

      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-base font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-secondary/90 active:scale-[0.98]"
      >
        <Icon icon="mdi:calendar-plus" width="20" height="20" />
        Add to Google Calendar
      </a>

      <p className="mt-3 text-center text-xs text-[#5b4a3a]/60">
        Opens in a new tab • Works even when you're offline
      </p>
    </div>
  )
}

export default CalendarSyncCard
