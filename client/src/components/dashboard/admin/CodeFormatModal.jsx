import React, { useRef, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import InputField from '../../InputField'
import api from '../../../api/axios'

/**
 * CodeFormatModal — Admin configures registration code generation rules.
 * Displays a live preview of the format (e.g., RES-0042).
 */
const CodeFormatModal = ({ open, onClose, currentFormat, onSuccess, notify, errorNotify }) => {
  const [submitting, setSubmitting] = useState(false)
  const previewRef = useRef(null)

  const formik = useFormik({
    initialValues: {
      prefix: currentFormat?.prefix || 'RES',
      separator: currentFormat?.separator || '-',
      digits: currentFormat?.digits || 4
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      prefix: Yup.string().max(10, 'Prefix too long').required('Prefix is required'),
      separator: Yup.string().max(3, 'Separator too long').required('Separator is required'),
      digits: Yup.number().min(2, 'At least 2 digits').max(8, 'Max 8 digits').required('Digits count required')
    }),
    onSubmit: async (values) => {
      try {
        setSubmitting(true)
        const { data } = await api.put('/organization/code-format', {
          prefix: values.prefix.trim(),
          separator: values.separator,
          digits: Number(values.digits)
        })
        notify?.(data.message || 'Code format updated successfully!')
        onSuccess?.(data.code_format)
        onClose?.()
      } catch (error) {
        errorNotify?.(error?.response?.data?.message || 'Failed to update code format')
      } finally {
        setSubmitting(false)
      }
    }
  })

  // Generate live preview based on current form values
  const generatePreview = () => {
    const { prefix, separator, digits } = formik.values
    const sample = '42'
    const paddedSample = sample.padStart(Number(digits) || 4, '0')
    return `${prefix}${separator}${paddedSample}`
  }

  // Animate preview on value change
  useGSAP(() => {
    if (previewRef.current && open) {
      gsap.fromTo(
        previewRef.current,
        { scale: 1.1, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }
      )
    }
  }, [formik.values, open])

  return (
    <Modal open={open} onClose={onClose} title="Configure Registration Code Format" maxWidth="max-w-xl">
      <form onSubmit={formik.handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-primary/20 border border-primary/50 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary/70 mb-2">Live Preview</p>
          <div
            ref={previewRef}
            className="text-3xl font-extrabold text-secondary font-mono tracking-wider"
          >
            {generatePreview()}
          </div>
          <p className="text-xs text-[#5b4a3a]/70 mt-2">This is how new registration codes will look</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            type="text"
            name="prefix"
            label="Prefix"
            placeholder="e.g., RES, HSE"
            formik={formik}
          />
          <InputField
            type="text"
            name="separator"
            label="Separator"
            placeholder="e.g., -, _, ."
            formik={formik}
          />
        </div>

        <InputField
          type="number"
          name="digits"
          label="Number of Digits"
          placeholder="e.g., 4"
          formik={formik}
        />

        <div className="rounded-xl bg-tertiary/20 border border-tertiary/40 p-4">
          <div className="flex items-start gap-3">
            <Icon icon="mdi:information-outline" width="20" height="20" className="text-secondary shrink-0 mt-0.5" />
            <div className="text-sm text-[#5b4a3a]">
              <p className="font-semibold mb-1">How it works:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Prefix:</strong> A short label for your organization (max 10 chars)</li>
                <li>• <strong>Separator:</strong> Character(s) between prefix and digits (max 3 chars)</li>
                <li>• <strong>Digits:</strong> Number of digits in the code (2-8)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!formik.isValid || submitting} className="flex-1">
            <Icon icon="mdi:check-circle" width="20" height="20" />
            {submitting ? 'Saving...' : 'Save Format'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CodeFormatModal
