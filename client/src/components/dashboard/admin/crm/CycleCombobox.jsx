import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { formatSchedule } from '../../../../lib/cycleTime'

const FREQUENCY_LABEL = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-Weekly',
  monthly: 'Monthly',
  custom: 'Custom'
}

/**
 * Flatten a raw pickup_cycle into a searchable option. Now surfaces the new
 * multi-day + time schedule via formatSchedule(), with backward compatibility
 * for legacy single-day cycles. The `haystack` concatenates every token
 * (name, schedule, frequency, description) so typing "mon", "7am", or "weekly" matches.
 */
const toOption = (cycle) => {
  const schedule = formatSchedule(cycle)
  const frequency = FREQUENCY_LABEL[cycle.frequency] || 'Custom'
  const tz = cycle.timezone || ''
  return {
    id: cycle._id || cycle.name,
    value: cycle.name,
    schedule,
    frequency,
    timezone: tz,
    description: cycle.description || '',
    haystack: `${cycle.name} ${schedule} ${frequency} ${tz} ${cycle.description || ''}`.toLowerCase()
  }
}

/**
 * CycleCombobox — assisted-typing, searchable cycle selector.
 * Replaces the plain <select>. The admin types a day/time/keyword to instantly filter
 * cycles. Filtering is pure .filter()/.map() (zero-loop). The dropdown is portaled and
 * positioned to the trigger so it works inside scrollable/overflow-hidden table cells.
 */
const CycleCombobox = ({
  cycles = [],
  value = '',
  onSelect,
  disabled = false,
  loading = false,
  placeholder = 'Search cycles…',
  size = 'md'
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const listId = useId()

  const options = useMemo(() => cycles.map(toOption), [cycles])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    // Split query into tokens; every token must appear somewhere in the haystack.
    const tokens = q.split(/\s+/).filter(Boolean)
    return options.filter((opt) => tokens.every((token) => opt.haystack.includes(token)))
  }, [options, query])

  const positionPanel = () => {

    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 240)
    // Flip left if the panel would overflow the right viewport edge.
    const left = Math.min(rect.left, window.innerWidth - width - 12)
    setCoords({ top: rect.bottom + 6, left: Math.max(12, left), width })
  }

  const openPanel = () => {
    if (disabled) return
    positionPanel()
    setOpen(true)
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const closePanel = () => {
    setOpen(false)
    setQuery('')
  }

  useGSAP(
    () => {
      if (open && panelRef.current) {
        gsap.fromTo(
          panelRef.current,
          { autoAlpha: 0, y: -8, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' }
        )
      }
    },
    { dependencies: [open] }
  )

  // Reposition on scroll/resize while open, and close on outside interaction.
  useEffect(() => {
    if (!open) return undefined
    const onReflow = () => positionPanel()
    const onDown = (e) => {
      if (
        !panelRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        closePanel()
      }
    }
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const commit = (option) => {
    if (!option) return
    onSelect?.(option.value)
    closePanel()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closePanel()
    }
  }

  const sizing = size === 'sm' ? 'min-h-9 text-xs px-2.5' : 'min-h-10 text-sm px-3'
  const hasValue = Boolean(value)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border bg-white font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${hasValue
            ? 'border-secondary/40 text-[#5b4a3a]'
            : 'border-tertiary/50 text-secondary/50'
          } hover:border-secondary focus:border-secondary focus:ring-2 focus:ring-secondary/20`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {loading ? (
            <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-tertiary/40 border-t-secondary" />
          ) : (
            <Icon
              icon={hasValue ? 'mdi:calendar-check' : 'mdi:calendar-search'}
              width="16"
              height="16"
              className="shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="truncate">{hasValue ? value : 'Assign cycle…'}</span>
        </span>
        <Icon icon="mdi:chevron-down" width="16" height="16" className="shrink-0 opacity-60" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            id={listId}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-[60] overflow-hidden rounded-xl border border-tertiary/40 bg-white shadow-2xl shadow-black/10"
          >
            <div className="flex items-center gap-2 border-b border-tertiary/20 px-3 py-2">
              <Icon icon="mdi:magnify" width="18" height="18" className="text-secondary/60" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm text-[#5b4a3a] outline-none placeholder:text-secondary/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="text-secondary/50 hover:text-secondary"
                >
                  <Icon icon="mdi:close-circle" width="16" height="16" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-secondary/60">
                  <Icon icon="mdi:calendar-remove-outline" width="26" height="26" className="mx-auto mb-1 text-tertiary" aria-hidden="true" />
                  {cycles.length === 0 ? 'No cycles created yet.' : 'No cycles match your search.'}
                </div>
              ) : (
                filtered.map((opt, index) => {
                  const isActive = index === activeIndex
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(opt)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${isActive ? 'bg-primary/15' : 'bg-transparent'
                        }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-secondary text-white' : 'bg-primary/20 text-secondary'
                            }`}
                        >
                          <Icon icon="mdi:calendar-clock" width="16" height="16" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#5b4a3a]">{opt.value}</span>
                          <span className="block truncate text-xs text-secondary/60">
                            {opt.schedule}{opt.timezone ? ` • ${opt.timezone}` : ''} • {opt.frequency}
                            {opt.description ? ` • ${opt.description}` : ''}
                          </span>
                        </span>
                      </span>
                      {isSelected && (
                        <Icon icon="mdi:check" width="18" height="18" className="shrink-0 text-secondary" aria-hidden="true" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default CycleCombobox
