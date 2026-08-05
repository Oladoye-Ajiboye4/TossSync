import React, { useRef } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import Banner from '../ui/Banner'
import Button from '../ui/Button'
import InputField from '../InputField'
import api from '../../api/axios'

/**
 * Solo Resident View — user is not linked to a provider.
 * Shows a slide-down warning banner + a Connect (Business ID) form.
 */
const SoloResidentView = ({ user, onConnected, notify, errorNotify }) => {
  const cardRef = useRef(null)

  useGSAP(() => {
    gsap.from(cardRef.current, { autoAlpha: 0, y: 30, duration: 0.6, ease: 'power3.out', delay: 0.15 })
  }, [])

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

  return (
    <div className="space-y-6">
      <Banner tone="warning" title="Your provider is not connected">
        Link your account to a waste management provider using their unique Business ID to start receiving pickup schedules and reminders.
      </Banner>

      <div ref={cardRef} className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-primary/30">
            <Icon icon="mdi:link-variant" width="26" height="26" className="text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-secondary">Connect to a Provider</h3>
            <p className="text-sm text-[#5b4a3a]/70">Ask your provider for their TossSync Business ID (e.g. TS-9K3ABC).</p>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex-1">
            <InputField type="text" name="business_id" placeholder="Enter Business ID" formik={formik} />
          </div>
          <Button type="submit" variant="primary" disabled={formik.isSubmitting} className="sm:w-auto">
            <Icon icon="mdi:link-plus" width="20" height="20" />
            {formik.isSubmitting ? 'Connecting...' : 'Connect'}
          </Button>
        </form>
      </div>

      <div className="rounded-3xl bg-primary/20 border border-primary/40 p-6 sm:p-8">
        <h4 className="font-bold text-secondary mb-2">Meanwhile, you're in Solo Mode</h4>
        <p className="text-sm text-[#5b4a3a]/80">You can still use TossSync independently. Once connected, your provider's official pickup cycle will appear here automatically.</p>
      </div>
    </div>
  )
}

export default SoloResidentView
