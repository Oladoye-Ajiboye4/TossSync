import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'

import CodeFormatModal from './CodeFormatModal'
import BulkUploadModal from './BulkUploadModal'
import api from '../../../api/axios'

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard-outline' },
  { id: 'form-settings', label: 'Form Settings', icon: 'mdi:form-textbox' },
  { id: 'profile-share', label: 'Profile Share', icon: 'mdi:share-variant-outline' },
  { id: 'data-tools', label: 'Data Tools', icon: 'mdi:database-cog-outline' }
]

const Overview = ({ organization }) => {
  const cards = [
    {
      label: 'Organization',
      value: organization.name,
      icon: 'mdi:domain',
      iconClassName: 'bg-emerald-100 text-emerald-700'
    },
    {
      label: 'Business ID',
      value: organization.business_id,
      icon: 'mdi:identifier',
      iconClassName: 'bg-sky-100 text-sky-700'
    },
    {
      label: 'Connected Houses',
      value: organization.connected_residents?.length || 0,
      icon: 'mdi:account-group-outline',
      iconClassName: 'bg-amber-100 text-amber-700'
    }
  ]

  return (
    <section className="space-y-6" aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="sr-only">
        Organization overview
      </h2>

      <div className="flex flex-col gap-4 md:flex-row">
        {cards.map((card) => (
          <article key={card.label} className="flex min-w-0 flex-1 items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${card.iconClassName}`}>
              <Icon icon={card.icon} width="22" height="22" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-slate-900">{card.value}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="min-h-56 rounded-lg border border-dashed border-slate-300 bg-slate-50" aria-hidden="true" />
    </section>
  )
}

const FormSettings = () => {
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')

  const handleAddItem = (event) => {
    event.preventDefault()

    const value = newItem.trim()
    if (!value) return

    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${value}`

    setItems((currentItems) => [...currentItems, { id, value }])
    setNewItem('')
  }

  const handleRemoveItem = (itemId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
  }

  return (
    <section className="space-y-5" aria-labelledby="form-settings-heading">
      <div>
        <h2 id="form-settings-heading" className="text-lg font-bold text-slate-900">
          Form Settings
        </h2>
        <p className="mt-1 text-sm text-slate-600">Manage the values available in your form.</p>
      </div>

      <form onSubmit={handleAddItem} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="form-setting" className="sr-only">
          New form setting
        </label>
        <input
          id="form-setting"
          type="text"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Enter a form setting"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="submit"
          disabled={!newItem.trim()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Icon icon="mdi:plus" width="18" height="18" aria-hidden="true" />
          Add
        </button>
      </form>

      {items.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0 break-words text-sm font-medium text-slate-800">{item.value}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                aria-label={`Remove ${item.value}`}
              >
                <Icon icon="mdi:trash-can-outline" width="17" height="17" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No form settings added.
        </div>
      )}
    </section>
  )
}

const ProfileShare = ({ notify, errorNotify }) => {
  const shareUrl = 'https://example.com/profile/your-organization'
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined

    const timeoutId = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable')
      }

      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      notify?.('Profile URL copied to clipboard')
    } catch {
      errorNotify?.('Unable to copy the profile URL')
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="profile-share-heading">
      <div>
        <h2 id="profile-share-heading" className="text-lg font-bold text-slate-900">
          Profile Share
        </h2>
        <p className="mt-1 text-sm text-slate-600">Share your organization profile with this URL.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="profile-share-url" className="sr-only">
          Profile share URL
        </label>
        <input
          id="profile-share-url"
          type="text"
          readOnly
          value={shareUrl}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
        >
          <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width="18" height="18" aria-hidden="true" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </section>
  )
}

const DataTools = ({ organization, onRefresh, notify, errorNotify }) => {
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  return (
    <section className="space-y-5" aria-labelledby="data-tools-heading">
      <div>
        <h2 id="data-tools-heading" className="text-lg font-bold text-slate-900">
          Data Tools
        </h2>
        <p className="mt-1 text-sm text-slate-600">Configure resident codes or upload resident data in bulk.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setCodeModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          <Icon icon="mdi:cog-outline" width="19" height="19" aria-hidden="true" />
          Code Format
        </button>
        <button
          type="button"
          onClick={() => setBulkModalOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          <Icon icon="mdi:file-upload-outline" width="19" height="19" aria-hidden="true" />
          Bulk Upload
        </button>
      </div>

      <CodeFormatModal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        currentFormat={organization.code_format}
        onSuccess={onRefresh}
        notify={notify}
        errorNotify={errorNotify}
      />

      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={onRefresh}
        notify={notify}
        errorNotify={errorNotify}
      />
    </section>
  )
}

const AdminDashboard = ({ user, notify, errorNotify }) => {
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const tabRefs = useRef([])

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/organization/me')
      setOrganization(data.organization)
    } catch (error) {
      errorNotify?.(error?.response?.data?.message || 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }, [errorNotify])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const handleTabKeyDown = (event, currentIndex) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    let nextIndex = currentIndex

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (direction) nextIndex = (currentIndex + direction + TABS.length) % TABS.length
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return

    event.preventDefault()
    setActiveTab(TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />
          <p className="text-sm font-medium text-slate-600">Loading your organization...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <Icon icon="mdi:alert-circle-outline" width="40" height="40" className="mx-auto mb-3 text-red-700" aria-hidden="true" />
        <p className="font-bold text-slate-900">Organization not found</p>
        <p className="mt-1 text-sm text-slate-600">Please contact support if this issue persists.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">{user?.username || organization.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Admin Dashboard</h1>
      </div>

      <div className="border-b border-slate-200">
        <div role="tablist" aria-label="Admin dashboard sections" className="flex overflow-x-auto">
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                ref={(element) => { tabRefs.current[index] = element }}
                id={`${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600 ${
                  isActive
                    ? 'border-emerald-700 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <Icon icon={tab.icon} width="18" height="18" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex="0"
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        {activeTab === 'overview' && <Overview organization={organization} />}
        {activeTab === 'form-settings' && <FormSettings />}
        {activeTab === 'profile-share' && <ProfileShare notify={notify} errorNotify={errorNotify} />}
        {activeTab === 'data-tools' && (
          <DataTools
            organization={organization}
            onRefresh={fetchOrganization}
            notify={notify}
            errorNotify={errorNotify}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
