import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Icon } from '@iconify/react'

import Banner from '../ui/Banner'
import Button from '../ui/Button'
import InputField from '../InputField'
import api from '../../api/axios'
import ResidentTabShell from './resident/ResidentTabShell'
import CountdownHero from './resident/CountdownHero'
import ProviderStatusCard from './resident/ProviderStatusCard'
import PersonalScheduleCard from './resident/PersonalScheduleCard'
import HowItWorks from './resident/HowItWorks'

/**
 * Solo Resident View — user is not linked to a provider.
 * Tabbed layout: Overview (connect + countdown + solo status), Personal Schedule,
 * and How It Works. Header quick-actions (push + guide) live in the tab shell.
 */
const SoloResidentView = ({ user, onConnected, onRefresh, notify, errorNotify }) => {
  const personalDates = user?.personal_schedule?.pickup_dates || []

  const formik = useFormik({
    initialValues: { business_id: '' },
    validationSchema: Yup.object({
      business_id: Yup.string().required('Business ID is required')
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const { data } = await api.post('/organization/connect', { business_id: values.business_id.trim() })
        notify?.(data.message || 'Connected successfully!')
        onConnected?.()
      } catch (error) {
        errorNotify?.(error?.response?.data?.message || 'Could not connect. Check the Business ID.')
      } finally {
        setSubmitting(false)
      }
    }
  })

  const connectCard = (
    <div className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-primary/30 p-3">
          <Icon icon="mdi:link-variant" width="26" height="26" className="text-secondary" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-secondary">Connect to a Provider</h3>
          <p className="text-sm text-[#5b4a3a]/70">Ask your provider for their TossSync Business ID (e.g. TS-9K3ABC).</p>
        </div>
      </div>

      <form onSubmit={formik.handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <InputField type="text" name="business_id" placeholder="Enter Business ID" formik={formik} />
        </div>
        <Button type="submit" variant="primary" disabled={formik.isSubmitting} className="sm:w-auto">
          <Icon icon="mdi:link-plus" width="20" height="20" />
          {formik.isSubmitting ? 'Connecting...' : 'Connect'}
        </Button>
      </form>
    </div>
  )

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'mdi:view-dashboard-outline',
      content: (
        <div className="flex flex-col gap-6">
          <Banner tone="warning" title="Your provider is not connected">
            Link your account to a waste management provider using their unique Business ID to start receiving pickup schedules and reminders.
          </Banner>
          {connectCard}
          <CountdownHero providerNext={null} personalDates={personalDates} />
          <ProviderStatusCard connected={false} />
        </div>
      )
    },
    {
      id: 'personal',
      label: 'Personal Schedule',
      icon: 'mdi:calendar-account-outline',
      content: (
        <PersonalScheduleCard
          user={user}
          onUpdate={onRefresh}
          notify={notify}
          errorNotify={errorNotify}
        />
      )
    },
    {
      id: 'guide',
      label: 'How It Works',
      icon: 'mdi:book-open-variant',
      content: <HowItWorks />
    }
  ]

  return (
    <ResidentTabShell tabs={tabs} notify={notify} errorNotify={errorNotify} />
  )
}

export default SoloResidentView
