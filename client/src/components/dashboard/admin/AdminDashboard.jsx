import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useFormik } from 'formik'
import * as Yup from 'yup'

import ResidentsTable from './ResidentsTable'
import CodeFormatModal from './CodeFormatModal'
import BulkUploadModal from './BulkUploadModal'
import Button from '../../ui/Button'
import InputField from '../../InputField'
import Modal from '../../ui/Modal'
import api from '../../../api/axios'

/**
 * AdminDashboard — Full organization management view for admins.
 * Shows business_id, stats, residents table, code format config, bulk upload, and pickup cycles.
 */
const AdminDashboard = ({ user, notify, errorNotify }) => {
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [addResidentModalOpen, setAddResidentModalOpen] = useState(false)
  const [cycleModalOpen, setCycleModalOpen] = useState(false)
  const rootRef = useRef(null)

  // Fetch organization data
  const fetchOrganization = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/organization/me')
      setOrganization(data.organization)
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganization()
  }, [])

  // Stagger animation for cards
  useGSAP(() => {
    if (organization && rootRef.current) {
      gsap.from(rootRef.current.querySelectorAll('[data-animate]'), {
        autoAlpha: 0,
        y: 30,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.12
      })
    }
  }, [organization])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-secondary mx-auto" />
          <p className="text-secondary font-semibold">Loading your organization...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="rounded-3xl bg-white/90 border border-tertiary/40 p-10 text-center">
        <Icon icon="mdi:alert-circle-outline" width="48" height="48" className="text-secondary mx-auto mb-3" />
        <p className="font-bold text-secondary">Organization not found</p>
        <p className="text-sm text-[#5b4a3a]/70">Please contact support if this issue persists.</p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="space-y-6">
      {/* Header stats */}
      <div data-animate className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/90 border border-tertiary/40 shadow-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-secondary/20">
              <Icon icon="mdi:domain" width="24" height="24" className="text-secondary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5b4a3a]/70">Organization</p>
              <p className="text-xl font-extrabold text-secondary">{organization.name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 border border-tertiary/40 shadow-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/30">
              <Icon icon="mdi:identifier" width="24" height="24" className="text-secondary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5b4a3a]/70">Business ID</p>
              <p className="text-xl font-extrabold text-secondary font-mono">{organization.business_id}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 border border-tertiary/40 shadow-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-tertiary/30">
              <Icon icon="mdi:account-group" width="24" height="24" className="text-secondary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5b4a3a]/70">Connected Houses</p>
              <p className="text-xl font-extrabold text-secondary">{organization.connected_residents?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div data-animate className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => setAddResidentModalOpen(true)}>
          <Icon icon="mdi:account-plus" width="20" height="20" />
          Add Resident
        </Button>
        <Button variant="sage" onClick={() => setBulkModalOpen(true)}>
          <Icon icon="mdi:file-upload" width="20" height="20" />
          Bulk Upload
        </Button>
        <Button variant="outline" onClick={() => setCodeModalOpen(true)}>
          <Icon icon="mdi:cog" width="20" height="20" />
          Code Format
        </Button>
        <Button variant="ghost" onClick={() => setCycleModalOpen(true)}>
          <Icon icon="mdi:calendar-plus" width="20" height="20" />
          Create Cycle
        </Button>
      </div>

      {/* Residents table */}
      <div data-animate>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-secondary">Connected Residents</h3>
          <Button variant="ghost" onClick={fetchOrganization}>
            <Icon icon="mdi:refresh" width="18" height="18" />
            Refresh
          </Button>
        </div>
        <ResidentsTable residents={organization.connected_residents || []} />
      </div>

      {/* Pickup cycles */}
      <div data-animate className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary/30">
            <Icon icon="mdi:calendar-clock" width="24" height="24" className="text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-secondary">Pickup Cycles</h3>
            <p className="text-sm text-[#5b4a3a]/70">Manage your waste collection schedules</p>
          </div>
        </div>
        {organization.pickup_cycles?.length > 0 ? (
          <div className="space-y-3">
            {organization.pickup_cycles.map((cycle, idx) => (
              <div key={idx} className="rounded-xl bg-background/60 border border-tertiary/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-secondary">{cycle.name}</p>
                    <p className="text-sm text-[#5b4a3a]/80 capitalize">{cycle.frequency}</p>
                    {cycle.description && (
                      <p className="text-xs text-[#5b4a3a]/70 mt-1">{cycle.description}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/40 text-secondary">
                    <Icon icon="mdi:check-circle" width="14" height="14" />
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[#5b4a3a]/70 text-sm">
            No pickup cycles yet. Click "Create Cycle" to add one.
          </div>
        )}
      </div>

      {/* Modals */}
      <CodeFormatModal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        currentFormat={organization.code_format}
        onSuccess={fetchOrganization}
        notify={notify}
        errorNotify={errorNotify}
      />

      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={fetchOrganization}
        notify={notify}
        errorNotify={errorNotify}
      />

      <AddResidentModal
        open={addResidentModalOpen}
        onClose={() => setAddResidentModalOpen(false)}
        onSuccess={fetchOrganization}
        notify={notify}
        errorNotify={errorNotify}
      />

      <CreateCycleModal
        open={cycleModalOpen}
        onClose={() => setCycleModalOpen(false)}
        onSuccess={fetchOrganization}
        notify={notify}
        errorNotify={errorNotify}
      />
    </div>
  )
}

// Add Resident Modal
const AddResidentModal = ({ open, onClose, onSuccess, notify, errorNotify }) => {
  const formik = useFormik({
    initialValues: { username: '', email: '', password: '' },
    validationSchema: Yup.object({
      username: Yup.string().required('Username is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      password: Yup.string().min(8, 'At least 8 characters')
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const payload = { username: values.username.trim(), email: values.email.trim() }
        if (values.password.trim()) payload.password = values.password.trim()
        
        const { data } = await api.post('/organization/residents', payload)
        notify?.(data.message || 'Resident created and registration code emailed!')
        onSuccess?.()
        resetForm()
        onClose?.()
      } catch (error) {
        errorNotify?.(error?.response?.data?.message || 'Failed to create resident')
      } finally {
        setSubmitting(false)
      }
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Add New Resident">
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <InputField type="text" name="username" label="Username" placeholder="e.g., John Doe" formik={formik} />
        <InputField type="email" name="email" label="Email" placeholder="e.g., john@example.com" formik={formik} />
        <InputField
          type="password"
          name="password"
          label="Password (optional)"
          placeholder="Leave blank for auto-generated"
          formik={formik}
        />
        <div className="rounded-xl bg-primary/20 border border-primary/50 p-3 text-xs text-[#5b4a3a]">
          <Icon icon="mdi:information-outline" width="16" height="16" className="inline mr-2 text-secondary" />
          A unique registration code will be generated and emailed to the resident.
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!formik.isValid || formik.isSubmitting} className="flex-1">
            <Icon icon="mdi:account-plus" width="20" height="20" />
            {formik.isSubmitting ? 'Creating...' : 'Create Resident'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Create Cycle Modal
const CreateCycleModal = ({ open, onClose, onSuccess, notify, errorNotify }) => {
  const formik = useFormik({
    initialValues: { name: '', frequency: 'weekly', description: '' },
    validationSchema: Yup.object({
      name: Yup.string().required('Cycle name is required'),
      frequency: Yup.string().required('Frequency is required')
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { data } = await api.post('/organization/cycles', {
          name: values.name.trim(),
          frequency: values.frequency,
          description: values.description.trim()
        })
        notify?.(data.message || 'Pickup cycle created successfully!')
        onSuccess?.()
        resetForm()
        onClose?.()
      } catch (error) {
        errorNotify?.(error?.response?.data?.message || 'Failed to create cycle')
      } finally {
        setSubmitting(false)
      }
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Create Pickup Cycle">
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <InputField type="text" name="name" label="Cycle Name" placeholder="e.g., Weekly Residential" formik={formik} />
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-secondary/80 mb-2">
            Frequency
          </label>
          <select
            name="frequency"
            value={formik.values.frequency}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="w-full p-3 rounded-xl border border-tertiary/50 bg-white/80 outline-none transition-colors focus:border-primary"
          >
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <InputField
          type="text"
          name="description"
          label="Description (optional)"
          placeholder="e.g., Every Monday morning"
          formik={formik}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!formik.isValid || formik.isSubmitting} className="flex-1">
            <Icon icon="mdi:calendar-plus" width="20" height="20" />
            {formik.isSubmitting ? 'Creating...' : 'Create Cycle'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AdminDashboard
