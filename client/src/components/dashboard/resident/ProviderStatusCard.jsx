import React from 'react'
import { Icon } from '@iconify/react'

/**
 * Provider Status Card — shows connection status and official cycle details.
 * Renders a "connected" state when a schedule/org exists, otherwise a "solo" prompt.
 */
const ProviderStatusCard = ({ connected, orgName, cycleName, nextPickup }) => {
  const nextStr = nextPickup
    ? new Date(nextPickup).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Not scheduled yet'

  if (!connected) {
    return (
      <div className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-tertiary/30">
            <Icon icon="mdi:link-off" width="24" height="24" className="text-secondary" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-extrabold text-secondary">No provider connected</h4>
            <p className="text-sm text-secondary/70">You're in Solo Mode. Connect a provider to see their official cycle here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-primary/50 bg-white/90 p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/30">
          <Icon icon="mdi:check-decagram" width="24" height="24" className="text-secondary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-extrabold text-secondary">Connected to {orgName}</h4>
          <p className="text-sm text-secondary/70">Official provider schedule</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-background/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-secondary/60">Cycle</dt>
          <dd className="mt-1 font-bold text-secondary">{cycleName}</dd>
        </div>
        <div className="rounded-2xl bg-background/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-secondary/60">Next Official Pickup</dt>
          <dd className="mt-1 font-bold text-secondary">{nextStr}</dd>
        </div>
      </dl>
    </div>
  )
}

export default ProviderStatusCard
