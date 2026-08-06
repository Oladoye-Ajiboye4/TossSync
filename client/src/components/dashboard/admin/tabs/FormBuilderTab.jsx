import React, { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../../../api/axios'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long Text' }
]

const createId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `field-${Date.now()}`
)

const FormBuilderTab = ({ organization, onRefresh, notify, errorNotify }) => {
  const [fields, setFields] = useState(() => organization.resident_form_schema || [])
  const [draft, setDraft] = useState({ label: '', type: 'text', required: false })
  const [saving, setSaving] = useState(false)
  const previewRef = useRef(null)

  useGSAP(() => {
    gsap.from('[data-preview-field]:last-child', {
      opacity: 0,
      scale: 0.9,
      y: 12,
      duration: 0.4,
      ease: 'back.out(1.7)'
    })
  }, { scope: previewRef, dependencies: [fields.length] })

  const handleAddField = (event) => {
    event.preventDefault()
    const label = draft.label.trim()
    if (!label) return

    const newField = {
      id: createId(),
      label,
      type: draft.type,
      required: draft.required,
      placeholder: `Enter ${label.toLowerCase()}`
    }
    setFields((current) => [...current, newField])
    setDraft({ label: '', type: 'text', required: false })
  }

  const handleRemoveField = (fieldId) => {
    setFields((current) => current.filter((field) => field.id !== fieldId))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data } = await api.put('/organization/form-schema', { resident_form_schema: fields })
      notify?.(data.message || 'Registration form saved')
      onRefresh?.()
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to save registration form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-[#5b4a3a]">Custom Registration Fields</h3>
          <p className="mt-1 text-sm text-secondary/70">Define the data residents provide when signing up.</p>
        </div>

        <form onSubmit={handleAddField} className="flex flex-col gap-3 rounded-2xl border border-tertiary/40 bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="field-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">Field Label</label>
            <input
              id="field-label"
              type="text"
              value={draft.label}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="e.g., Gate Code"
              className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="field-type" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">Type</label>
              <select
                id="field-type"
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              >
                {FIELD_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm font-medium text-[#5b4a3a]">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))}
                className="size-4 accent-secondary"
              />
              Required
            </label>
          </div>

          <button
            type="submit"
            disabled={!draft.label.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-tertiary/60"
          >
            <Icon icon="mdi:plus-circle-outline" width="20" height="20" aria-hidden="true" />
            Add Field
          </button>
        </form>

        {fields.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {fields.map((field) => (
              <li key={field.id} className="flex items-center justify-between gap-3 rounded-xl border border-tertiary/30 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#5b4a3a]">{field.label}</p>
                  <p className="text-xs text-secondary/70">{field.type}{field.required ? ' • Required' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.id)}
                  aria-label={`Remove ${field.label}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                >
                  <Icon icon="mdi:trash-can-outline" width="20" height="20" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-tertiary/50 p-6 text-center text-sm text-secondary/70">
            No custom fields yet. Residents will only see the default fields.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-secondary px-4 text-sm font-bold text-secondary hover:bg-secondary/10 disabled:opacity-60"
        >
          <Icon icon="mdi:content-save-outline" width="20" height="20" aria-hidden="true" />
          {saving ? 'Saving...' : 'Save Registration Form'}
        </button>
      </section>

      <section>
        <div className="sticky top-24 mx-auto max-w-xs rounded-[2rem] border-8 border-[#5b4a3a] bg-background p-4 shadow-xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-secondary/60">Live Resident Preview</p>
          <div ref={previewRef} className="flex flex-col gap-3">
            <div data-preview-field>
              <label className="mb-1 block text-xs font-semibold text-[#5b4a3a]">Full Name <span className="text-red-500">*</span></label>
              <div className="min-h-11 rounded-lg border border-tertiary/50 bg-white px-3 py-2 text-sm text-tertiary">Jane Resident</div>
            </div>
            {fields.map((field) => (
              <div key={field.id} data-preview-field>
                <label className="mb-1 block text-xs font-semibold text-[#5b4a3a]">
                  {field.label}{field.required ? <span className="text-red-500"> *</span> : null}
                </label>
                {field.type === 'textarea' ? (
                  <div className="min-h-16 rounded-lg border border-tertiary/50 bg-white px-3 py-2 text-sm text-tertiary">{field.placeholder}</div>
                ) : (
                  <div className="min-h-11 rounded-lg border border-tertiary/50 bg-white px-3 py-2 text-sm text-tertiary">{field.placeholder}</div>
                )}
              </div>
            ))}
            <div className="mt-1 min-h-11 rounded-lg bg-secondary px-3 py-2 text-center text-sm font-bold text-white">Sign Up</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FormBuilderTab
