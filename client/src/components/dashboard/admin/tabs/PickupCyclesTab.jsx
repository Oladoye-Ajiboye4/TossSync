import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../../api/axios'
import CycleForm from '../cycles/CycleForm'
import CycleCard from '../cycles/CycleCard'
import CycleEditDrawer from '../cycles/CycleEditDrawer'

/**
 * PickupCyclesTab — the official schedule builder.
 *
 * (A) Creation form card: name + interactive Mon–Sun pills + frequency + time.
 * (B) Active cycles grid: each card shows the schedule and a LIVE "assigned
 *     residents" count derived with .filter() over the connected residents,
 *     plus Edit (slide-out drawer) and Delete (confirm dialog) actions.
 *
 * A local mirror of pickup_cycles powers instant optimistic updates; the server
 * response (full array) is the source of truth after each mutation, and onRefresh
 * keeps the rest of the dashboard (combobox, overview) in sync. Zero-Loop Rule
 * throughout: counts, syncs and renders use .filter()/.map() only.
 */
const PickupCyclesTab = ({ organization, onRefresh, notify, errorNotify }) => {
  const source = organization?.pickup_cycles || []
  const residents = organization?.connected_residents || []

  // Render-time sync (React-recommended) so a server refetch reseeds local state
  // without an effect, while optimistic edits survive between identical payloads.
  const [cycles, setCycles] = useState(source)
  const [prevSource, setPrevSource] = useState(source)
  if (source !== prevSource) {
    setPrevSource(source)
    setCycles(source)
  }

  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const gridRef = useRef(null)

  // Live assigned-resident count for a given cycle (zero-loop .filter()).
  const countFor = (cycleName) =>
    residents.filter((r) => (r.assigned_cycle || '') === cycleName).length

  useGSAP(
    () => {
      gsap.from('[data-cycle-card]', {
        autoAlpha: 0,
        y: 20,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.06
      })
    },
    { dependencies: [cycles.length], scope: gridRef }
  )

  const handleCreate = async (payload) => {
    try {
      setCreating(true)
      const { data } = await api.post('/organization/cycles', payload)
      setCycles(data.pickup_cycles || [])
      setFormKey((k) => k + 1) // remount the form to reset it
      notify?.(`Cycle "${payload.name}" created`)
      onRefresh?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to create cycle')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (cycleId, payload) => {
    try {
      setSaving(true)
      const { data } = await api.patch(`/organization/cycles/${cycleId}`, payload)
      setCycles(data.pickup_cycles || [])
      notify?.('Cycle updated')
      setEditing(null)
      onRefresh?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to update cycle')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cycle) => {
    try {
      setDeletingId(cycle._id)
      const { data } = await api.delete(`/organization/cycles/${cycle._id}`)
      setCycles(data.pickup_cycles || [])
      notify?.(`Cycle "${cycle.name}" deleted`)
      setConfirmDelete(null)
      onRefresh?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to delete cycle')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#5b4a3a]">Pickup Cycles</h3>
        <p className="mt-1 text-sm text-secondary/70">
          Create the official schedules you assign to residents. Days &amp; times defined here power
          the assignment dropdown and every resident countdown.
        </p>
      </div>

      {/* (A) Creation form */}
      <section className="rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <Icon icon="mdi:calendar-plus" width="20" height="20" aria-hidden="true" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-[#5b4a3a]">New Official Cycle</h4>
            <p className="text-xs text-secondary/60">Pick the days and time this route runs.</p>
          </div>
        </div>
        <CycleForm key={formKey} submitting={creating} onSubmit={handleCreate} />
      </section>

      {/* (B) Active cycles */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="inline-flex items-center gap-2 text-sm font-bold text-[#5b4a3a]">
            <Icon icon="mdi:calendar-multiple" width="18" height="18" className="text-secondary" aria-hidden="true" />
            Active Cycles
          </h4>
          <span className="rounded-full bg-tertiary/25 px-2.5 py-0.5 text-xs font-bold text-secondary">
            {cycles.length} {cycles.length === 1 ? 'cycle' : 'cycles'}
          </span>
        </div>

        {cycles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-tertiary/50 bg-white p-10 text-center">
            <Icon icon="mdi:calendar-blank-outline" width="42" height="42" className="mx-auto mb-3 text-tertiary" aria-hidden="true" />
            <p className="font-bold text-[#5b4a3a]">No cycles yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-secondary/70">
              Create your first official pickup cycle above — it will instantly appear here and in the
              resident assignment dropdown.
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cycles.map((cycle) => (
              <CycleCard
                key={cycle._id || cycle.name}
                cycle={cycle}
                assignedCount={countFor(cycle.name)}
                onEdit={setEditing}
                onDelete={setConfirmDelete}
                deleting={deletingId === cycle._id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Edit drawer */}
      {editing && (
        <CycleEditDrawer
          cycle={editing}
          saving={saving}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          cycle={confirmDelete}
          deleting={deletingId === confirmDelete._id}
          assignedCount={countFor(confirmDelete.name)}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

/* --- delete confirmation dialog (portal + GSAP pop) --- */

const ConfirmDeleteDialog = ({ cycle, deleting, assignedCount, onCancel, onConfirm }) => {
  const overlayRef = useRef(null)
  const cardRef = useRef(null)

  useGSAP(
    () => {
      gsap.set(overlayRef.current, { autoAlpha: 0 })
      gsap.set(cardRef.current, { autoAlpha: 0, y: 24, scale: 0.96 })
      gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' })
      gsap.to(cardRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' })
    },
    { scope: overlayRef }
  )

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && !deleting && onCancel?.()}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Delete ${cycle.name}`}
    >
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-3xl border border-tertiary/40 bg-background p-6 shadow-2xl"
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <Icon icon="mdi:trash-can-outline" width="26" height="26" aria-hidden="true" />
        </div>
        <h3 className="text-center text-lg font-extrabold text-[#5b4a3a]">Delete “{cycle.name}”?</h3>
        <p className="mt-1 text-center text-sm text-secondary/70">
          {assignedCount > 0 ? (
            <>
              <span className="font-bold text-red-600">{assignedCount}</span>{' '}
              {assignedCount === 1 ? 'resident is' : 'residents are'} currently assigned. Their existing
              schedule stays intact, but this cycle will no longer be selectable.
            </>
          ) : (
            'This cycle will be permanently removed from your organization.'
          )}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-tertiary bg-white px-4 text-sm font-bold text-secondary hover:bg-tertiary/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Icon icon={deleting ? 'mdi:loading' : 'mdi:trash-can'} width="18" height="18" className={deleting ? 'animate-spin' : ''} aria-hidden="true" />
            {deleting ? 'Deleting…' : 'Delete cycle'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default PickupCyclesTab
