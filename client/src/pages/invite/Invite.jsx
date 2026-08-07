import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ToastContainer, toast, Bounce } from 'react-toastify'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import api from '../../api/axios'
import { setSession } from '../../hooks/useAuth'

/**
 * Invite — dedicated self-service resident onboarding route (/invite?ref=BUSINESS_ID).
 *
 * Flow:
 *   1. Read ?ref=[BUSINESS_ID] from the URL on mount.
 *   2. Fetch the organization's public branding + custom registration schema.
 *   3. Render a hybrid form: hardcoded core fields (Username, Email, Password)
 *      followed by the org's dynamically-injected custom fields (.map()).
 *   4. Merge core + custom answers into a single payload and POST /organization/join.
 *
 * Constraints honored:
 *   - Tailwind v4 only, responsive typography (text-base md:text-lg …) — no shrinking text.
 *   - Zero for-loops: only .map() / .filter() / .reduce() are used.
 *   - The generic "Admin vs Resident" toggle is intentionally absent on this route.
 */

// Permanent, hardcoded core system requirements. Rendered above the dynamic fields.
const CORE_FIELDS = [
  {
    name: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'e.g., jane_doe',
    icon: 'mdi:account-outline',
    autoComplete: 'username'
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    icon: 'mdi:email-outline',
    autoComplete: 'email'
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'At least 6 characters',
    icon: 'mdi:lock-outline',
    autoComplete: 'new-password'
  }
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const toastOptions = {
  position: 'top-center',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  theme: 'light',
  transition: Bounce
}

const Invite = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Support both ?ref= (preferred) and ?business_id= for resilience.
  const businessId = (searchParams.get('ref') || searchParams.get('business_id') || '').trim()

  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Core system fields — permanent regardless of organization.
  const [core, setCore] = useState({ username: '', email: '', password: '' })
  // Dynamic custom answers, keyed by each field's stable id.
  const [customValues, setCustomValues] = useState({})
  const [errors, setErrors] = useState({})

  const cardRef = useRef(null)

  // ── 1 & 2. Extract ?ref= and fetch the org's public schema on mount ────────
  useEffect(() => {
    let cancelled = false

    const loadOrganization = async () => {
      if (!businessId) {
        setLoadError('This invite link is missing an organization reference (?ref=).')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data } = await api.get(`/organization/public/${encodeURIComponent(businessId)}`)
        if (cancelled) return

        const org = data.organization
        setOrganization(org)

        // Seed empty values for every custom field up front (zero-loop via reduce).
        const seeded = (org.resident_form_schema || []).reduce((acc, field) => {
          acc[field.id] = ''
          return acc
        }, {})
        setCustomValues(seeded)
        setLoadError('')
      } catch (error) {
        if (cancelled) return
        const status = error?.response?.status
        setLoadError(
          status === 404
            ? 'We could not find an organization for this invite link. Please double-check the link with your provider.'
            : error?.response?.data?.message || 'Something went wrong loading this invite.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOrganization()
    return () => {
      cancelled = true
    }
  }, [businessId])

  // Gentle staggered reveal once the form is ready.
  useGSAP(
    () => {
      if (loading || loadError) return
      gsap.from('[data-invite-reveal]', {
        autoAlpha: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out'
      })
    },
    { scope: cardRef, dependencies: [loading, loadError] }
  )

  const schema = useMemo(() => organization?.resident_form_schema || [], [organization])

  const handleCoreChange = (event) => {
    const { name, value } = event.target
    setCore((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleCustomChange = (fieldId, value) => {
    setCustomValues((current) => ({ ...current, [fieldId]: value }))
    setErrors((current) => ({ ...current, [fieldId]: undefined }))
  }

  // Build an errors map without loops — validate core + required custom fields.
  const validate = () => {
    const coreErrors = CORE_FIELDS.reduce((acc, field) => {
      const value = core[field.name].trim()
      if (!value) {
        acc[field.name] = `${field.label} is required`
      } else if (field.name === 'email' && !EMAIL_RE.test(value)) {
        acc[field.name] = 'Enter a valid email address'
      } else if (field.name === 'password' && value.length < 6) {
        acc[field.name] = 'Password must be at least 6 characters'
      }
      return acc
    }, {})

    const customErrors = schema
      .filter((field) => field.required)
      .filter((field) => !String(customValues[field.id] ?? '').trim())
      .reduce((acc, field) => {
        acc[field.id] = `${field.label} is required`
        return acc
      }, {})

    return { ...coreErrors, ...customErrors }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast.error('Please fix the highlighted fields.', toastOptions)
      return
    }

    // ── Merge core + custom answers into a single submission payload ─────────
    // Custom answers are re-keyed from stable ids to human-readable labels so the
    // provider sees exactly what they configured (e.g. { 'Gate Code': '4821' }).
    const custom_fields = schema.reduce((acc, field) => {
      const value = String(customValues[field.id] ?? '').trim()
      if (value) acc[field.label] = value
      return acc
    }, {})

    const payload = {
      ...core,
      business_id: businessId,
      custom_fields
    }

    try {
      setSubmitting(true)
      const { data } = await api.post('/organization/join', payload)
      setSession(data.user)
      toast.success(data.message || 'Welcome aboard!', toastOptions)
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed. Please try again.', toastOptions)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-secondary" />
          <p className="text-base font-semibold text-secondary md:text-lg">Loading your invite…</p>
        </div>
      </main>
    )
  }

  // ── Error state (missing/invalid ref) ───────────────────────────────────────
  if (loadError) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-3xl border border-tertiary/40 bg-white/90 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <Icon icon="mdi:link-variant-off" width="34" height="34" className="text-red-500" />
          </div>
          <h1 className="text-xl font-extrabold text-secondary md:text-2xl">Invalid Invite Link</h1>
          <p className="mt-3 text-sm text-[#5b4a3a]/80 md:text-base">{loadError}</p>
          <Link
            to="/signup"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-6 text-base font-bold text-white transition hover:scale-105 hover:brightness-95 md:text-lg"
          >
            <Icon icon="mdi:account-plus-outline" width="22" height="22" />
            Regular Sign Up
          </Link>
        </div>
      </main>
    )
  }

  // ── Hybrid onboarding form ──────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 py-10 sm:p-8">
      <div ref={cardRef} className="w-full max-w-lg">
        {/* Brand row */}
        <div data-invite-reveal className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Icon icon="mdi:recycle" width="24" height="24" className="text-white" />
          </div>
          <span className="text-lg font-extrabold text-secondary md:text-xl">TossSync</span>
        </div>

        <div className="rounded-3xl border border-tertiary/40 bg-white/90 p-6 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] sm:p-8">
          {/* Organization name headline */}
          <header data-invite-reveal className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary/60 md:text-sm">
              You&apos;ve been invited to join
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-secondary md:text-3xl">
              {organization?.name}
            </h1>
            <p className="mt-2 text-sm text-[#5b4a3a]/70 md:text-base">
              Create your resident account to start tracking pickups.
            </p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Core, permanently-hardcoded system fields */}
            {CORE_FIELDS.map((field) => {
              const isPassword = field.type === 'password'
              const inputType = isPassword ? (showPassword ? 'text' : 'password') : field.type
              const hasError = Boolean(errors[field.name])

              return (
                <div key={field.name} data-invite-reveal className="flex flex-col gap-1">
                  <label
                    htmlFor={field.name}
                    className="text-xs font-semibold uppercase tracking-wide text-secondary/80 md:text-sm"
                  >
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-secondary/50">
                      <Icon icon={field.icon} width="20" height="20" aria-hidden="true" />
                    </span>
                    <input
                      id={field.name}
                      name={field.name}
                      type={inputType}
                      value={core[field.name]}
                      onChange={handleCoreChange}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      className={`min-h-12 w-full rounded-xl border bg-white/80 pl-10 text-base text-[#5b4a3a] outline-none transition-colors focus:border-primary md:text-lg ${
                        isPassword ? 'pr-11' : 'pr-3'
                      } ${hasError ? 'border-red-500' : 'border-tertiary/50'}`}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-secondary/60 transition-colors hover:text-secondary"
                      >
                        <Icon
                          icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                          width="20"
                          height="20"
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                  {hasError && <small className="text-sm text-red-500">{errors[field.name]}</small>}
                </div>
              )
            })}

            {/* Divider only when the org actually defines custom fields */}
            {schema.length > 0 && (
              <div data-invite-reveal className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-tertiary/40" />
                <span className="text-xs font-semibold uppercase tracking-wide text-secondary/50 md:text-sm">
                  {organization?.name} details
                </span>
                <span className="h-px flex-1 bg-tertiary/40" />
              </div>
            )}

            {/* Dynamically-injected custom fields */}
            {schema.map((field) => {
              const hasError = Boolean(errors[field.id])
              const commonClasses = `w-full rounded-xl border bg-white/80 px-3 text-base text-[#5b4a3a] outline-none transition-colors focus:border-primary md:text-lg ${
                hasError ? 'border-red-500' : 'border-tertiary/50'
              }`

              return (
                <div key={field.id} data-invite-reveal className="flex flex-col gap-1">
                  <label
                    htmlFor={`custom-${field.id}`}
                    className="text-xs font-semibold uppercase tracking-wide text-secondary/80 md:text-sm"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`custom-${field.id}`}
                      rows={3}
                      value={customValues[field.id] ?? ''}
                      onChange={(event) => handleCustomChange(field.id, event.target.value)}
                      placeholder={field.placeholder}
                      className={`${commonClasses} min-h-24 py-2`}
                    />
                  ) : (
                    <input
                      id={`custom-${field.id}`}
                      type={field.type || 'text'}
                      value={customValues[field.id] ?? ''}
                      onChange={(event) => handleCustomChange(field.id, event.target.value)}
                      placeholder={field.placeholder}
                      className={`${commonClasses} min-h-12`}
                    />
                  )}
                  {hasError && <small className="text-sm text-red-500">{errors[field.id]}</small>}
                </div>
              )
            })}

            <button
              type="submit"
              disabled={submitting}
              data-invite-reveal
              className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-6 text-base font-bold text-white shadow-xl shadow-secondary/20 transition hover:scale-105 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg"
            >
              {submitting ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Creating account…
                </>
              ) : (
                <>
                  <Icon icon="mdi:rocket-launch-outline" width="22" height="22" />
                  Join {organization?.name}
                </>
              )}
            </button>

            <p data-invite-reveal className="text-center text-sm text-[#5b4a3a]/70 md:text-base">
              Already have an account?{' '}
              <Link to="/signin" className="font-bold text-secondary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      <ToastContainer position="top-center" theme="light" transition={Bounce} />
    </main>
  )
}

export default Invite
