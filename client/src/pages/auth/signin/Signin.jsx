import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { ToastContainer, toast, Bounce } from 'react-toastify'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import InputField from '../../../components/InputField'
import Button from '../../../components/ui/Button'
import api from '../../../api/axios'
import { setSession } from '../../../hooks/useAuth'
import { socialLogin, firebaseErrorMessage } from '../../../lib/socialAuth'

const MODES = [
  { key: 'solo', label: 'Solo', icon: 'mdi:account' },
  { key: 'managed', label: 'Managed', icon: 'mdi:key-variant' },
  { key: 'admin', label: 'Admin', icon: 'mdi:shield-account' }
]

const Signin = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState('solo') // solo | managed | admin
  const formRef = useRef(null)

  const notify = (msg) => toast.success(msg, { position: 'top-center', autoClose: 4000, theme: 'light', transition: Bounce })
  const errorNotify = (msg) => toast.error(msg, { position: 'top-center', autoClose: 4000, theme: 'light', transition: Bounce })

  // Animate the form panel whenever the mode changes
  useGSAP(() => {
    gsap.fromTo(
      formRef.current,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    )
  }, [mode])

  const handleAuthSuccess = (user) => {
    setSession(user)
    notify('Sign in successful!')
    setTimeout(() => navigate('/dashboard'), 900)
  }

  // --- Formik: fields depend on the active mode ---
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { email: '', password: '', registration_code: '' },
    validationSchema: Yup.object().shape({
      email: Yup.string().when([], {
        is: () => mode !== 'managed',
        then: (s) => s.matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address').required('Required'),
        otherwise: (s) => s.notRequired()
      }),
      password: Yup.string().when([], {
        is: () => mode !== 'managed',
        then: (s) => s.required('Required'),
        otherwise: (s) => s.notRequired()
      }),
      registration_code: Yup.string().when([], {
        is: () => mode === 'managed',
        then: (s) => s.required('Registration code is required'),
        otherwise: (s) => s.notRequired()
      })
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        let payload
        if (mode === 'managed') {
          payload = { registration_code: values.registration_code.trim() }
        } else {
          payload = { email: values.email, password: values.password }
        }
        const { data } = await api.post('/auth/signin', payload)
        handleAuthSuccess(data.user)
      } catch (error) {
        errorNotify(error?.response?.data?.message || 'Invalid credentials')
      } finally {
        setSubmitting(false)
      }
    }
  })

  const handleSocial = async (providerName) => {
    try {
      const user = await socialLogin(providerName, mode === 'admin' ? 'admin' : 'resident')
      handleAuthSuccess(user)
    } catch (error) {
      errorNotify(firebaseErrorMessage(error?.code))
    }
  }

  const isManaged = mode === 'managed'

  return (
    <main className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left brand panel */}
        <section className="hidden md:flex flex-col gap-5 p-8 rounded-3xl bg-primary/30 backdrop-blur border border-primary/40">
          <span className="text-sm font-semibold tracking-widest text-secondary uppercase">Welcome Back</span>
          <h1 className="text-4xl font-extrabold text-secondary leading-tight">TossSync keeps your pickups on schedule.</h1>
          <p className="text-[#5b4a3a] text-base leading-relaxed">Sign in as a solo resident, use your provider registration code, or manage your organization as an admin.</p>
          <ul className="flex flex-col gap-3 mt-2">
            <li className="flex items-center gap-3 text-[#3a4636]"><span className="h-2 w-2 rounded-full bg-secondary" /> Two flexible login modes</li>
            <li className="flex items-center gap-3 text-[#3a4636]"><span className="h-2 w-2 rounded-full bg-secondary" /> Smart pickup reminders</li>
            <li className="flex items-center gap-3 text-[#3a4636]"><span className="h-2 w-2 rounded-full bg-secondary" /> Admin CRM for houses & cycles</li>
          </ul>
        </section>

        {/* Right form card */}
        <div className="w-full rounded-3xl bg-white/90 backdrop-blur border border-tertiary/40 shadow-[0_24px_70px_-35px_rgba(120,53,15,0.6)] p-6 sm:p-8">

          {/* Mode switcher */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-background mb-6">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold ${
                  mode === m.key ? 'bg-secondary text-white' : 'text-secondary hover:bg-tertiary/20'
                }`}
              >
                <Icon icon={m.icon} width="18" height="18" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>

          <div ref={formRef}>
            <div className="text-center space-y-1 mb-5">
              <h2 className="text-3xl font-extrabold text-secondary">
                {isManaged ? 'Managed Login' : mode === 'admin' ? 'Admin Login' : 'Solo Login'}
              </h2>
              <p className="text-sm text-[#5b4a3a]/80">
                {isManaged
                  ? 'Enter the registration code from your provider.'
                  : 'Use your email & password or continue with Google.'}
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={formik.handleSubmit}>
              {isManaged ? (
                <InputField type="text" name="registration_code" placeholder="e.g. RES-0042" formik={formik} label="Registration Code" />
              ) : (
                <>
                  <InputField type="text" name="email" placeholder="Email" formik={formik} />
                  <InputField type="password" name="password" placeholder="Password" formik={formik} />
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-secondary hover:underline font-medium">Forgot Password?</Link>
                  </div>
                </>
              )}

              <Button type="submit" variant="primary" disabled={formik.isSubmitting} className="w-full">
                {formik.isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Social login replaces email/password (not shown in managed mode) */}
            {!isManaged && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <span className="h-px flex-1 bg-tertiary/40" />
                  <span className="text-xs text-[#5b4a3a]/60 uppercase tracking-wide">or</span>
                  <span className="h-px flex-1 bg-tertiary/40" />
                </div>
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => handleSocial('google')} className="flex gap-3 justify-center items-center font-semibold bg-white border border-tertiary/50 py-3 rounded-xl hover:bg-background transition-colors text-secondary">
                    <Icon icon="flat-color-icons:google" width="22" height="22" />
                    <span>Continue with Google</span>
                  </button>
                  <button type="button" onClick={() => handleSocial('github')} className="flex gap-3 justify-center items-center font-semibold bg-[#2f3a2b] py-3 rounded-xl hover:brightness-110 transition text-white">
                    <Icon icon="mdi:github" width="22" height="22" />
                    <span>Continue with GitHub</span>
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 text-sm font-semibold">
              <Link className="flex-1 text-center bg-primary/40 text-secondary py-3 rounded-xl hover:bg-primary/60 transition-colors" to="/signup">
                {mode === 'admin' ? 'Register Organization' : 'Create Account'}
              </Link>
              <Link className="flex-1 text-center bg-background text-secondary py-3 rounded-xl hover:bg-tertiary/20 transition-colors" to="/">Go Home</Link>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-center" theme="light" transition={Bounce} />
    </main>
  )
}

export default Signin
