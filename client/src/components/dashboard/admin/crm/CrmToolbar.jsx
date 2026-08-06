import React from 'react'
import { Icon } from '@iconify/react'

import { SORT_OPTIONS, STATUS_FILTERS } from './useCrmResidents'

/**
 * CrmToolbar — the filter/sort control bar that sits above the table.
 * Mobile-first: a search field on top, then wrapped segmented controls.
 * All option lists are rendered with .map() (zero-loop).
 */

const SegmentedControl = ({ label, icon, options, value, onChange }) => (
  <div className="flex items-center gap-1 rounded-xl border border-tertiary/40 bg-white p-1">
    <span className="flex items-center gap-1 pl-2 pr-1 text-secondary/60" title={label}>
      <Icon icon={icon} width="16" height="16" aria-hidden="true" />
    </span>
    {options.map((opt) => {
      const isActive = value === opt.value
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-bold transition-colors ${
            isActive ? 'bg-secondary text-white shadow-sm' : 'text-secondary/70 hover:bg-primary/15'
          }`}
        >
          {opt.icon && <Icon icon={opt.icon} width="14" height="14" aria-hidden="true" />}
          {opt.label}
        </button>
      )
    })}
  </div>
)

const Dropdown = ({ label, icon, options, value, onChange }) => (
  <label className="inline-flex items-center gap-2 rounded-xl border border-tertiary/40 bg-white py-1 pl-2 pr-1">
    <Icon icon={icon} width="16" height="16" className="text-secondary/60" aria-hidden="true" />
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-8 cursor-pointer rounded-lg bg-transparent pr-6 text-xs font-bold text-secondary/80 outline-none focus:text-secondary"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </label>
)

const CrmToolbar = ({
  search,
  onSearch,
  sortBy,
  onSort,
  areaFilter,
  onAreaFilter,
  areaOptions,
  statusFilter,
  onStatusFilter,
  activeFilterCount,
  onReset,
  resultCount,
  totalCount
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-tertiary/40 bg-background/60 p-3 sm:p-4">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            icon="mdi:magnify"
            width="18"
            height="18"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search residents by name, email, area or cycle…"
            className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-white pl-10 pr-10 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary"
            >
              <Icon icon="mdi:close-circle" width="18" height="18" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="shrink-0 text-xs font-semibold text-secondary/60 sm:text-right">
          Showing <span className="font-black text-secondary">{resultCount}</span> of {totalCount}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SegmentedControl
          label="Sort residents"
          icon="mdi:sort"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={onSort}
        />

        <Dropdown
          label="Filter by area"
          icon="mdi:map-marker-outline"
          options={areaOptions}
          value={areaFilter}
          onChange={onAreaFilter}
        />

        <Dropdown
          label="Filter by status"
          icon="mdi:list-status"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={onStatusFilter}
        />

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 hover:bg-red-100"
          >
            <Icon icon="mdi:filter-remove-outline" width="15" height="15" aria-hidden="true" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  )
}

export default CrmToolbar
