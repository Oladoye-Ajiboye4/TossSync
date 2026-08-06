import React, { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import PushNotificationToggle from './PushNotificationToggle'
import GuideDrawer from './GuideDrawer'

/**
 * ResidentTabShell — sticky header with quick action controls (push + guide)
 * and a horizontally scrollable pill tab bar. Panels swap with a GSAP fade/slide.
 *
 * Props:
 *  - tabs: [{ id, label, icon, content }]
 *  - notify, errorNotify: toast helpers passed to the push toggle
 */
const ResidentTabShell = ({ tabs, notify, errorNotify }) => {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const panelRef = useRef(null)

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0]

  // Animate the active panel whenever the tab changes.
  useGSAP(() => {
    gsap.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    )
  }, { dependencies: [activeId], scope: panelRef })

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-30 -mx-4 bg-background/90 px-4 pb-3 pt-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          <GuideDrawer compact />
          <PushNotificationToggle notify={notify} errorNotify={errorNotify} compact />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Resident dashboard sections">
          {tabs.map((tab) => {
            const active = tab.id === activeId
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(tab.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold ${
                  active
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-primary/20 text-secondary hover:bg-primary/35'
                }`}
              >
                <Icon icon={tab.icon} width="20" height="20" aria-hidden="true" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div ref={panelRef} role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  )
}

export default ResidentTabShell
