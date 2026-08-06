import React, { useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const STEPS = [
  {
    icon: 'mdi:sync',
    title: 'Personal & Provider schedules coexist',
    body: 'Your personal pickup reminders run independently from your provider\'s official cycle. When Dual-Cycle Mode is on, both fire on their own timelines — the countdown always shows whichever pickup comes first.'
  },
  {
    icon: 'mdi:email-fast-outline',
    title: 'Secondary emails & browser push',
    body: 'Add up to 2 secondary email recipients (family or housemates) to receive the same reminders. Enable browser push notifications to get an instant alert on this device at your chosen lead time.'
  },
  {
    icon: 'mdi:bell-ring-outline',
    title: 'Choosing your lead time',
    body: 'Set a numeric lead time and toggle between Minutes and Hours. A reminder is dispatched that far ahead of each scheduled pickup, in your local timezone.'
  },
  {
    icon: 'mdi:domain',
    title: 'When your provider updates the cycle',
    body: 'If your provider changes their official schedule, it updates here automatically — no action needed. Your personal reminders stay exactly as you configured them.'
  },
  {
    icon: 'mdi:alert-circle-outline',
    title: 'Reporting a missed pickup',
    body: 'If a truck does not arrive, open the Missed Pickup reporter from the Overview tab and submit feedback. Your provider is notified so they can follow up.'
  }
]

/**
 * How It Works — interactive step-by-step documentation & tutorial.
 * Steps animate in on mount with a GSAP stagger.
 */
const HowItWorks = () => {
  const rootRef = useRef(null)

  useGSAP(() => {
    gsap.from('[data-step]', {
      autoAlpha: 0,
      x: -20,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.1
    })
  }, { scope: rootRef })

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <div className="rounded-3xl border border-primary/40 bg-primary/20 p-6 sm:p-8">
        <h3 className="text-xl font-extrabold text-secondary">How TossSync Works</h3>
        <p className="mt-1 text-sm text-[#5b4a3a]/80">
          A quick guide to schedules, reminders, and staying in sync with your provider.
        </p>
      </div>

      {STEPS.map((step, index) => (
        <div
          key={step.title}
          data-step
          className="flex items-start gap-4 rounded-3xl border border-tertiary/40 bg-white/90 p-5 shadow-sm sm:p-6"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white">
            <Icon icon={step.icon} width="24" height="24" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/30 px-2 py-0.5 text-xs font-bold text-secondary">
                Step {index + 1}
              </span>
              <h4 className="font-extrabold text-secondary">{step.title}</h4>
            </div>
            <p className="mt-1 text-sm text-[#5b4a3a]/80">{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default HowItWorks
