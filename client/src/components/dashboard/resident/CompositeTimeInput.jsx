import React from 'react'

const UNITS = ['minutes', 'hours']

/**
 * Composite numeric input with an attached unit toggle (Minutes / Hours).
 * Replaces rigid dropdowns with a unified, mobile-friendly control.
 */
const CompositeTimeInput = ({ id, label, value, unit, onValueChange, onUnitChange }) => {
  const toggleUnit = () => {
    const next = UNITS.filter((u) => u !== unit)[0] || 'hours'
    onUnitChange(next)
  }

  return (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-xl border border-tertiary/50 bg-background/40 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
        <input
          id={id}
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-h-11 w-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[#5b4a3a] outline-none"
        />
        <button
          type="button"
          onClick={toggleUnit}
          aria-label={`Switch unit, currently ${unit}`}
          className="min-h-11 min-w-[88px] shrink-0 border-l border-tertiary/50 bg-primary/25 px-3 text-sm font-bold capitalize text-secondary hover:bg-primary/40"
        >
          {unit}
        </button>
      </div>
    </div>
  )
}

export default CompositeTimeInput
