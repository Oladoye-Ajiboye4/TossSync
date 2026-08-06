import React, { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../../api/axios'

/**
 * ConnectedResidentsTab — Advanced CRM table with cycle assignment and area grouping.
 * Uses .reduce() for zero-loop area grouping. GSAP animates table mount and toggle transitions.
 */
const ConnectedResidentsTab = ({ organization, onUpdate, notify, errorNotify }) => {
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grouped'
  const [assigning, setAssigning] = useState(null)
  const rootRef = useRef(null)

  const residents = organization?.connected_residents || []
  const cycles = organization?.pickup_cycles || []

  useGSAP(() => {
    gsap.from('[data-row]', {
      autoAlpha: 0,
      y: 20,
      duration: 0.4,
      ease: 'power3.out',
      stagger: 0.06
    })
  }, { dependencies: [viewMode], scope: rootRef })

  const handleAssignCycle = async (residentId, cycleName) => {
    try {
      setAssigning(residentId)
      const { data } = await api.put('/schedule/assign', {
        resident_id: residentId,
        cycle_name: cycleName,
        pickup_dates: []
      })
      notify?.(data.message || 'Cycle assigned successfully')
      onUpdate?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to assign cycle')
    } finally {
      setAssigning(null)
    }
  }

  // Zero-loop area grouping using .reduce()
  const groupedByArea = residents.reduce((acc, resident) => {
    const areaKey = resident.area || 'Unknown Area'
    if (!acc[areaKey]) {
      acc[areaKey] = []
    }
    acc[areaKey].push(resident)
    return acc
  }, {})

  const areaGroups = Object.entries(groupedByArea).map(([area, members]) => ({
    area,
    members
  }))

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-tertiary/40 bg-white p-5">
        <div>
          <h3 className="text-base font-bold text-[#5b4a3a]">Connected Residents</h3>
          <p className="mt-1 text-sm text-secondary/70">
            {residents.length} {residents.length === 1 ? 'resident' : 'residents'} linked to your organization.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${
              viewMode === 'table'
                ? 'bg-secondary text-white'
                : 'border-2 border-tertiary text-secondary hover:bg-tertiary/10'
            }`}
          >
            <Icon icon="mdi:table" width="20" height="20" aria-hidden="true" />
            Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${
              viewMode === 'grouped'
                ? 'bg-secondary text-white'
                : 'border-2 border-tertiary text-secondary hover:bg-tertiary/10'
            }`}
          >
            <Icon icon="mdi:map-marker-multiple" width="20" height="20" aria-hidden="true" />
            Grouped by Area
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-2xl border border-tertiary/40 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-tertiary/30 bg-primary/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70">Area</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70">Assigned Cycle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/20">
              {residents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-secondary/60">
                    No residents connected yet. Share your invite link to onboard residents.
                  </td>
                </tr>
              ) : (
                residents.map((resident) => (
                  <tr key={resident._id} data-row className="hover:bg-primary/5">
                    <td className="px-4 py-3 text-sm font-medium text-[#5b4a3a]">{resident.username}</td>
                    <td className="px-4 py-3 text-sm text-secondary/70">{resident.area || '—'}</td>
                    <td className="px-4 py-3 text-sm text-secondary/70">{resident.email}</td>
                    <td className="px-4 py-3 text-sm text-secondary/70">
                      {resident.assigned_cycle || <span className="italic text-secondary/50">Not assigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={resident.assigned_cycle || ''}
                        onChange={(e) => handleAssignCycle(resident._id, e.target.value)}
                        disabled={assigning === resident._id || cycles.length === 0}
                        className="min-h-9 rounded-lg border border-tertiary/50 bg-background/40 px-2 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:opacity-50"
                      >
                        <option value="">Assign Cycle...</option>
                        {cycles.map((cycle) => (
                          <option key={cycle._id} value={cycle.name}>{cycle.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {areaGroups.length === 0 ? (
            <div className="rounded-2xl border border-tertiary/40 bg-white p-8 text-center text-sm text-secondary/60">
              No residents to group yet.
            </div>
          ) : (
            areaGroups.map((group) => (
              <div
                key={group.area}
                data-row
                className="rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/30">
                    <Icon icon="mdi:map-marker" width="22" height="22" className="text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-bold text-secondary">{group.area}</h4>
                    <p className="text-sm text-secondary/70">
                      {group.members.length} {group.members.length === 1 ? 'resident' : 'residents'}
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-2">
                  {group.members.map((resident) => (
                    <li
                      key={resident._id}
                      className="flex flex-col gap-2 rounded-xl border border-tertiary/30 bg-background/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#5b4a3a]">{resident.username}</p>
                        <p className="truncate text-sm text-secondary/70">{resident.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap text-sm text-secondary/70">
                          {resident.assigned_cycle || <span className="italic">Not assigned</span>}
                        </span>
                        <select
                          value={resident.assigned_cycle || ''}
                          onChange={(e) => handleAssignCycle(resident._id, e.target.value)}
                          disabled={assigning === resident._id || cycles.length === 0}
                          className="min-h-9 rounded-lg border border-tertiary/50 bg-white px-2 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:opacity-50"
                        >
                          <option value="">Assign...</option>
                          {cycles.map((cycle) => (
                            <option key={cycle._id} value={cycle.name}>{cycle.name}</option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ConnectedResidentsTab
