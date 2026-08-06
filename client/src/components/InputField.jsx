import React, { useState } from 'react'
import { Icon } from '@iconify/react'

/**
 * Reusable Formik-integrated input, themed with TossSync colors.
 * Only uses Tailwind transitions on border color (safe — not GSAP-animated).
 *
 * Password fields automatically render an eye toggle to show/hide the value.
 */
const InputField = ({ type = 'text', name, placeholder, formik, label }) => {
  const hasError = formik.touched[name] && formik.errors[name]

  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-secondary/80">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={name}
          className={`w-full rounded-xl border bg-white/80 p-3 outline-none transition-colors focus:border-primary ${
            isPassword ? 'pr-11' : ''
          } ${hasError ? 'border-red-500' : 'border-tertiary/50'}`}
          type={inputType}
          placeholder={placeholder}
          name={name}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-secondary/60 transition-colors hover:text-secondary focus:text-secondary focus:outline-none"
            tabIndex={-1}
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
      {hasError ? <small className="text-red-500">{formik.errors[name]}</small> : null}
    </div>
  )
}

export default InputField
