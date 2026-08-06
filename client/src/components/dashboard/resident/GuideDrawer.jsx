import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import HowItWorks from './HowItWorks'

/**
 * Guide Drawer — a top-level "How It Works / Guide" action that opens a
 * slide-out drawer containing the interactive documentation.
 * The overlay is portaled to <body> so its fixed positioning is not trapped
 * by the sticky header's backdrop-filter containing block.
 */
const GuideDrawer = ({ compact = false }) => {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)

  // Drive the slide-in/out animation from `open`. Refs are read inside the
  // effect (allowed), never during render.
  useGSAP(() => {
    if (open) {
      gsap.set(overlayRef.current, { display: 'flex' })
      gsap.fromTo(overlayRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
      gsap.fromTo(panelRef.current, { xPercent: 100 }, { xPercent: 0, duration: 0.4, ease: 'power3.out' })
    } else {
      gsap.to(panelRef.current, { xPercent: 100, duration: 0.35, ease: 'power3.in' })
      gsap.to(overlayRef.current, {
        autoAlpha: 0,
        duration: 0.3,
        onComplete: () => {
          gsap.set(overlayRef.current, { display: 'none' })
        }
      })
    }
  }, { dependencies: [open], scope: overlayRef })

  const openDrawer = () => setOpen(true)
  const closeDrawer = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-secondary hover:bg-secondary/10 ${
          compact ? 'border-2 border-tertiary' : 'border-2 border-secondary'
        }`}
      >
        <Icon icon="mdi:book-open-variant" width="20" height="20" aria-hidden="true" />
        <span className="whitespace-nowrap">How It Works</span>
      </button>

      {createPortal(
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 hidden items-stretch justify-end bg-black/40"
          onClick={(event) => event.target === overlayRef.current && closeDrawer()}
          role="dialog"
          aria-modal="true"
          aria-label="How TossSync works guide"
        >
          <div
            ref={panelRef}
            className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-tertiary/40 p-5 sm:p-6">
              <h3 className="text-xl font-extrabold text-secondary">Guide & Tutorial</h3>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close"
                className="flex size-11 items-center justify-center rounded-xl text-secondary hover:bg-tertiary/20"
              >
                <Icon icon="mdi:close" width="24" height="24" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <HowItWorks />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default GuideDrawer
