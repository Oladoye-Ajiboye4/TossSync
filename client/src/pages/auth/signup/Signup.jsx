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

const Signup = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState('resident') // resident | admin
  const formRef = useRef(null)

  const notify = (msg) => toast.success(msg, { position: 'top-center', autoClose: 4000, theme: 'light', transition: Bounce })
  const errorNotify = (msg) => toast.error(msg, { position: 'top-center', autoClose: 4000, theme: 'light', transition: Bounce })

  useGSAP(() => {
    gsap.fromTo(formRef.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }, [role])

  const isAdmin = role === 'admin'

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { username: '', email: '', password: '', confirmPassword: '', organizationName: '' },
    validationSchema: Yup.object().shape({
      username: Yup.string().matches(/^[a-zA-Z_][a-zA-Z0-9_ ]{2,29}$/, 'Invalid name').required('Required'),
      email: Yup.string().matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address').required('Required'),
      password: Yup.string().min(6, 'At least 6 characters').required('Required'),
      confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match').required('Required'),
      organizationName: Yup.string().when([], {
        is: () => isAdmin,
        then: (s) => s.required('Organization name is required'),
        otherwise: (s) => s.notRequired()
      })
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload = {
          username: values.username,
          email: values.email,
          password: values.password,
          role
        }
        if (isAdmin) payload.organizationName = values.organizationName

        const { data } = await api.post('/auth/signup', payload)
        // Auto-login after signup (token is returned)
        setSession(data.user)
        notify(isAdmin ? 'Organization registered!' : 'Account created!')
        setTimeout(() => navigate('/dashboard'), 900)
      } catch (error) {
        errorNotify(error?.response?.data?.message || 'Server error. Try again later')
      } finally {
        setSubmitting(false)
      }
    }
  })

  const handleSocial = async (providerName) => {
    try {
      const user = await socialLogin(providerName, role)
      setSession(user)
      notify('Account created!')
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (error) {
      errorNotify(firebaseErrorMessage(error?.code))
    }
  }

  return (
    <main className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left brand panel */}
        <section className="hidden md:flex flex-col gap-5 p-8 rounded-3xl bg-primary/30 backdrop-blur border border-primary/40">
          <span className="text-sm font-semibold tracking-widest text-secondary uppercase">Get Started</span>
          <h1 className="text-4xl font-extrabold text-secondary leading-tight">
            {isAdmin ? 'Run your waste operation like a pro.' : 'Never miss a pickup again.'}
          </h1>
          <p className="text-[#5b4a3a] text-base leading-relaxed">
            {isAdmin
              ? 'Register your organization to manage connected houses, custom cycles, and bulk resident onboarding.'
              : 'Join TossSync to track your pickup cycle and get timely reminders.'}
          </p>
        </section>

        {/* Right form card */}
        <div className="w-full rounded-3xl bg-white/90 backdrop-blur border border-tertiary/40 shadow-[0_24px_70px_-35px_rgba(120,53,15,0.6)] p-6 sm:p-8">

          {/* Role switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-background mb-6">
            {[{ k: 'resident', l: 'Resident', i: 'mdi:home-account' }, { k: 'admin', l: 'Admin', i: 'mdi:shield-account' }].map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setRole(r.k)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                  role === r.k ? 'bg-secondary text-white' : 'text-secondary hover:bg-tertiary/20'
                }`}
              >
                <Icon icon={r.i} width="18" height="18" />
                {r.l}
              </button>
            ))}
          </div>

          <div ref={formRef}>
            <div className="text-center space-y-1 mb-5">
              <h2 className="text-3xl font-extrabold text-secondary">{isAdmin ? 'Register Organization' : 'Create Account'}</h2>
              <p className="text-sm text-[#5b4a3a]/80">{isAdmin ? 'Set up your admin workspace.' : 'Start your TossSync journey.'}</p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={formik.handleSubmit}>
              <InputField type="text" name="username" placeholder={isAdmin ? 'Admin Name' : 'Username'} formik={formik} />
              {isAdmin && (
                <InputField type="text" name="organizationName" placeholder="Organization Name" formik={formik} />
              )}
              <InputField type="text" name="email" placeholder="Email" formik={formik} />
              <InputField type="password" name="password" placeholder="Password" formik={formik} />
              <InputField type="password" name="confirmPassword" placeholder="Confirm Password" formik={formik} />

              <Button type="submit" variant="primary" disabled={formik.isSubmitting} className="w-full">
                {formik.isSubmitting ? 'Creating...' : isAdmin ? 'Register Organization' : 'Sign Up'}
              </Button>
            </form>

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
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 text-sm font-semibold">
              <Link className="flex-1 text-center bg-primary/40 text-secondary py-3 rounded-xl hover:bg-primary/60 transition-colors" to="/signin">Sign In</Link>
              <Link className="flex-1 text-center bg-background text-secondary py-3 rounded-xl hover:bg-tertiary/20 transition-colors" to="/">Go Home</Link>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-center" theme="light" transition={Bounce} />
    </main>
  )
}

export default Signup
