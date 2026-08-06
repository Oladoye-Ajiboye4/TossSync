import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../api/axios'


/**
 * Missed Pickup Reporter — action button with a slide-out drawer
 * for logging a missed pickup with optional feedback.
 */
const MissedPickupDrawer = ({ notify, errorNotify }) => {
  const [feedback, setFeedback] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const overlayRef = useRef(null)
  const panelRef = useRef(null)
  const { contextSafe } = useGSAP({ scope: overlayRef })

  const openDrawer = contextSafe(() => {
    gsap.set(overlayRef.current, { display: 'flex' })
    gsap.fromTo(overlayRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
    gsap.fromTo(panelRef.current, { xPercent: 100 }, { xPercent: 0, duration: 0.4, ease: 'power3.out' })
  })

  const closeDrawer = contextSafe(() => {
    gsap.to(panelRef.current, { xPercent: 100, duration: 0.35, ease: 'power3.in' })
    gsap.to(overlayRef.current, {
      autoAlpha: 0,
      duration: 0.3,
      onComplete: () => {
        gsap.set(overlayRef.current, { display: 'none' })
      }
    })
  })

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const { data } = await api.post('/schedule/missed', {
        feedback: feedback.trim() || 'Pickup was missed'
      })
      notify?.(data.message || 'Missed pickup reported.')
      setFeedback('')
      closeDrawer()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Could not report missed pickup.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        data-animate
        className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:p-8"
      >
        <div>
          <h4 className="text-lg font-extrabold text-secondary">Missed your pickup?</h4>
          <p className="text-sm text-secondary/70">Log it so your provider can follow up.</p>
        </div>
        <button
          type="button"
          onClick={openDrawer}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700"
        >
          <Icon icon="mdi:alert-circle-outline" width="20" height="20" aria-hidden="true" />
          Report Missed Pickup
        </button>
      </div>

      {createPortal(
        <div

        ref={overlayRef}
        className="fixed inset-0 z-50 hidden items-stretch justify-end bg-black/40"
        onClick={(event) => event.target === overlayRef.current && closeDrawer()}
        role="dialog"
        aria-modal="true"
        aria-label="Report missed pickup"
      >
        <div
          ref={panelRef}
          className="flex h-full w-full max-w-md flex-col gap-5 bg-background p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-secondary">Report Missed Pickup</h3>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close"
              className="flex size-11 items-center justify-center rounded-xl text-secondary hover:bg-tertiary/20"
            >
              <Icon icon="mdi:close" width="24" height="24" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm text-secondary/70">
            Tell us what happened. This helps your provider improve service.
          </p>

          <div className="flex-1">
            <label htmlFor="missed-feedback" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
              Feedback (optional)
            </label>
            <textarea
              id="missed-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              placeholder="e.g., Truck did not arrive on the scheduled day."
              className="w-full rounded-xl border border-tertiary/50 bg-white px-3 py-2 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-tertiary px-4 text-sm font-bold text-secondary hover:bg-tertiary/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Icon icon="mdi:send" width="18" height="18" aria-hidden="true" />
              {submitting ? 'Reporting...' : 'Submit Report'}
            </button>
          </div>
        </div>
        </div>,
        document.body
      )}
    </>
  )
}


export default MissedPickupDrawer
