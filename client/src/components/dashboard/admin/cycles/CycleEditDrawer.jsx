import React, { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import CycleForm from './CycleForm'

/**
 * CycleEditDrawer — a right-side slide-out for editing an existing cycle.
 *
 * Reuses CycleForm (hydrated with the cycle's current values) so create + edit
 * stay perfectly in sync. GSAP drives the overlay fade and the panel slide; the
 * close animation runs before the parent unmounts the drawer.
 */
const CycleEditDrawer = ({ cycle, saving = false, onSave, onClose }) => {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  useGSAP(
    () => {
      gsap.set(overlayRef.current, { autoAlpha: 0 })
      gsap.set(panelRef.current, { xPercent: 100 })
      gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
      gsap.to(panelRef.current, { xPercent: 0, duration: 0.4, ease: 'power3.out' })
    },
    { scope: overlayRef, dependencies: [cycle?._id] }
  )

  const animateClose = () => {
    gsap.to(panelRef.current, { xPercent: 100, duration: 0.3, ease: 'power2.in' })
    gsap.to(overlayRef.current, {
      autoAlpha: 0,
      duration: 0.3,
      onComplete: () => onClose?.()
    })
  }

  if (!cycle) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && animateClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${cycle.name}`}
    >
      <div
        ref={panelRef}
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-tertiary/40 bg-background shadow-2xl"
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
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Icon icon="mdi:calendar-edit" width="24" height="24" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Edit Cycle</p>
              <h3 className="truncate text-xl font-extrabold">{cycle.name}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <CycleForm
            initial={cycle}
            submitting={saving}
            submitLabel="Save Changes"
            onSubmit={(payload) => onSave?.(cycle._id, payload)}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CycleEditDrawer
