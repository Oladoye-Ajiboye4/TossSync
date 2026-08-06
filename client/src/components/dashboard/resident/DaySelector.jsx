import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Interactive multi-select day pills, revealed for the 'Custom Days' frequency.
 * Selection is managed purely with array methods (spread to add, .filter to remove).
 */
const DaySelector = ({ selected, onChange }) => {
  const wrapRef = useRef(null)

  useGSAP(() => {
    gsap.from('[data-day-pill]', {
      opacity: 0,
      y: 10,
      scale: 0.85,
      duration: 0.35,
      ease: 'back.out(1.7)',
      stagger: 0.04
    })
  }, { scope: wrapRef })

  const toggleDay = (day) => {
    const isSelected = selected.includes(day)
    onChange(isSelected ? selected.filter((d) => d !== day) : [...selected, day])
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
        Pickup Days
      </span>
      <div
        ref={wrapRef}
        className="flex flex-wrap gap-2 overflow-x-auto pb-1"
      >
        {DAYS.map((day) => {
          const active = selected.includes(day)
          return (
            <button
              key={day}
              type="button"
              data-day-pill
              aria-pressed={active}
              onClick={() => toggleDay(day)}
              className={`min-h-11 min-w-11 shrink-0 rounded-full px-4 text-sm font-bold ${
                active
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-primary/20 text-secondary hover:bg-primary/35'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DaySelector
