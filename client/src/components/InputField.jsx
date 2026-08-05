import React from 'react'

/**
 * Reusable Formik-integrated input, themed with TossSync colors.
 * Only uses Tailwind transitions on border color (safe — not GSAP-animated).
 */
const InputField = ({ type = 'text', name, placeholder, formik, label }) => {
  const hasError = formik.touched[name] && formik.errors[name]

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wide text-secondary/80">
          {label}
        </label>
      )}
      <input
        id={name}
        className={`p-3 rounded-xl border bg-white/80 outline-none transition-colors focus:border-primary ${
          hasError ? 'border-red-500' : 'border-tertiary/50'
        }`}
        type={type}
        placeholder={placeholder}
        name={name}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
      {hasError ? <small className="text-red-500">{formik.errors[name]}</small> : null}
    </div>
  )
}

export default InputField
