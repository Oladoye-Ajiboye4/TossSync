import React, { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../../api/axios'
import DashboardDateContext from '../crm/DashboardDateContext'
import CrmToolbar from '../crm/CrmToolbar'
import CycleCombobox from '../crm/CycleCombobox'
import StatusBadge from '../crm/StatusBadge'
import ResidentDetailModal from '../crm/ResidentDetailModal'
import { useCrmResidents } from '../crm/useCrmResidents'

/**
 * ConnectedResidentsTab — the CRM Command Center.
 *
 * Orchestrates: the Mini-Calendar/Pickup-Week context band, the sort/filter toolbar,
 * a responsive data grid (semantic table on md+, tap-friendly cards on mobile), the
 * assisted-typing cycle combobox, live weekly-status badges, and the deep Resident
 * Detail Modal. State is held locally (useCrmResidents) for an instant "live data" feel;
 * every transform obeys the Zero-Loop Rule (.map/.filter/.reduce/.sort only).
 */
const ConnectedResidentsTab = ({ organization, onUpdate, onNavigate, notify, errorNotify }) => {
  const cycles = organization?.pickup_cycles || []
  const sourceResidents = organization?.connected_residents || []

  const {
    visibleResidents,
    residents,
    areaOptions,
    search,
    setSearch,
    sortBy,
    setSortBy,
    areaFilter,
    setAreaFilter,
    statusFilter,
    setStatusFilter,
    activeFilterCount,
    resetFilters,
    patchResident,
    removeResident
  } = useCrmResidents(sourceResidents)

  const [assigningId, setAssigningId] = useState(null)
  const [activeResidentId, setActiveResidentId] = useState(null)
  const gridRef = useRef(null)

  const activeResident =
    residents.find((r) => String(r._id) === String(activeResidentId)) || null

  // Re-run the staggered mount animation whenever the visible set changes
  // (mount, sort, filter, search) — this animates "sorting transitions" too.
  useGSAP(
    () => {
      gsap.from('[data-crm-row]', {
        autoAlpha: 0,
        y: 18,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.05
      })
    },
    { dependencies: [sortBy, areaFilter, statusFilter, search, visibleResidents.length], scope: gridRef }
  )

  const handleInlineAssign = async (residentId, cycleName) => {
    // Optimistic update first for the instant "live" feel, then persist.
    const previous = residents.find((r) => String(r._id) === String(residentId))?.assigned_cycle
    patchResident(residentId, { assigned_cycle: cycleName })
    try {
      setAssigningId(residentId)
      await api.post('/schedule/assign', {
        resident_id: residentId,
        cycle_name: cycleName,
        pickup_dates: []
      })
      notify?.(`Assigned "${cycleName}"`)
      onUpdate?.() // silent background refetch → fixes stale "0 residents assigned" count
    } catch (error) {
      patchResident(residentId, { assigned_cycle: previous || null }) // rollback
      errorNotify?.(error?.response?.data?.message || 'Failed to assign cycle')
    } finally {
      setAssigningId(null)
    }
  }

  const handleRemoved = (id) => {
    removeResident(id)
    onUpdate?.() // keep server-derived counts (Overview) in sync in the background
  }

  const totalCount = residents.length
  const hasResidents = totalCount > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Time context: mini-calendar + current date + pickup week */}
      <DashboardDateContext residents={residents} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#5b4a3a]">Connected Residents</h3>
          <p className="mt-1 text-sm text-secondary/70">
            {totalCount} {totalCount === 1 ? 'resident' : 'residents'} • tap a row to manage.
          </p>
        </div>
        {cycles.length === 0 && (
          <button
            type="button"
            onClick={() => onNavigate?.('cycles')}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200"
          >
            <Icon icon="mdi:information-outline" width="14" height="14" aria-hidden="true" />
            Create a pickup cycle to enable assignment
            <Icon icon="mdi:arrow-right" width="14" height="14" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sort / filter engine */}
      <CrmToolbar
        search={search}
        onSearch={setSearch}
        sortBy={sortBy}
        onSort={setSortBy}
        areaFilter={areaFilter}
        onAreaFilter={setAreaFilter}
        areaOptions={areaOptions}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={visibleResidents.length}
        totalCount={totalCount}
      />

      {!hasResidents ? (
        <EmptyState
          icon="mdi:account-group-outline"
          title="No residents connected yet"
          subtitle="Share your invite link or bulk-upload residents to populate your command center."
        />
      ) : visibleResidents.length === 0 ? (
        <EmptyState
          icon="mdi:filter-remove-outline"
          title="No matches"
          subtitle="No residents match the current filters. Try adjusting or clearing them."
        />
      ) : (
        <div ref={gridRef}>
          {/* Desktop / tablet: semantic table */}
          <div className="hidden overflow-hidden rounded-2xl border border-tertiary/40 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead className="border-b border-tertiary/30 bg-primary/10">
                <tr>
                  <Th>Name</Th>
                  <Th>Area</Th>
                  <Th>Assigned Cycle</Th>
                  <Th>Weekly Status</Th>
                  <Th className="text-right">Manage</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/20">
                {visibleResidents.map((resident) => (
                  <tr
                    key={resident._id}
                    data-crm-row
                    onClick={() => setActiveResidentId(resident._id)}
                    className="cursor-pointer transition-colors hover:bg-primary/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tertiary/30 text-secondary">
                          <Icon icon="mdi:home-account" width="18" height="18" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#5b4a3a]">{resident.username}</p>
                          <p className="truncate text-xs text-secondary/60">{resident.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {resident.area ? (
                        <span className="inline-flex items-center gap-1 text-sm text-secondary/80">
                          <Icon icon="mdi:map-marker-outline" width="15" height="15" aria-hidden="true" />
                          {resident.area}
                        </span>
                      ) : (
                        <span className="text-sm italic text-secondary/40">Unassigned</span>
                      )}
                    </td>
                    {/* Stop propagation so interacting with the combobox doesn't open the modal */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="max-w-52">
                        <CycleCombobox
                          cycles={cycles}
                          value={resident.assigned_cycle || ''}
                          onSelect={(name) => handleInlineAssign(resident._id, name)}
                          loading={assigningId === resident._id}
                          disabled={cycles.length === 0}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={resident.weekly_status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-secondary">
                        Manage
                        <Icon icon="mdi:chevron-right" width="18" height="18" aria-hidden="true" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: tap-friendly cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visibleResidents.map((resident) => (
              <li
                key={resident._id}
                data-crm-row
                className="rounded-2xl border border-tertiary/40 bg-white p-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveResidentId(resident._id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tertiary/30 text-secondary">
                    <Icon icon="mdi:home-account" width="22" height="22" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#5b4a3a]">{resident.username}</p>
                    <p className="truncate text-xs text-secondary/60">
                      {resident.area || 'No area'} • {resident.email}
                    </p>
                  </div>
                  <StatusBadge status={resident.weekly_status} size="sm" />
                </button>

                <div className="mt-3 border-t border-tertiary/20 pt-3" onClick={(e) => e.stopPropagation()}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary/60">
                    Assigned Cycle
                  </p>
                  <CycleCombobox
                    cycles={cycles}
                    value={resident.assigned_cycle || ''}
                    onSelect={(name) => handleInlineAssign(resident._id, name)}
                    loading={assigningId === resident._id}
                    disabled={cycles.length === 0}
                    size="sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deep management modal */}
      {activeResident && (
        <ResidentDetailModal
          resident={activeResident}
          cycles={cycles}
          onClose={() => setActiveResidentId(null)}
          onPatch={patchResident}
          onRemove={handleRemoved}
          notify={notify}
          errorNotify={errorNotify}
        />
      )}
    </div>
  )
}

/* --- presentational helpers --- */

const Th = ({ children, className = '' }) => (
  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70 ${className}`}>
    {children}
  </th>
)

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="rounded-2xl border border-dashed border-tertiary/50 bg-white p-10 text-center">
    <Icon icon={icon} width="42" height="42" className="mx-auto mb-3 text-tertiary" aria-hidden="true" />
    <p className="font-bold text-[#5b4a3a]">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-secondary/70">{subtitle}</p>
  </div>
)

export default ConnectedResidentsTab
