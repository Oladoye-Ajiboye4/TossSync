import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

/**
 * Themed button with GSAP spring/scale click feedback.
 * NOTE: we deliberately do NOT put Tailwind `transition-transform` here —
 * GSAP owns the transform animation to avoid stutter/conflicts.
 */
const VARIANTS = {
    primary: 'bg-secondary text-white hover:brightness-95',
    sage: 'bg-primary text-[#2f3a2b] hover:brightness-95',
    outline: 'bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10',
    ghost: 'bg-white/70 text-secondary hover:bg-white',
    danger: 'bg-red-500 text-white hover:bg-red-600'
}

const Button = ({
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    onClick,
    className = '',
    ...rest
}) => {
    const btnRef = useRef(null)

    const handleDown = () => {
        if (disabled) return
        gsap.to(btnRef.current, { scale: 0.94, duration: 0.12, ease: 'power2.out' })
    }
    const handleUp = () => {
        if (disabled) return
        gsap.to(btnRef.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
    }

    return (
        <button
            ref={btnRef}
            type={type}
            disabled={disabled}
            onClick={onClick}
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchStart={handleDown}
            onTouchEnd={handleUp}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold shadow-lg shadow-black/5 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
            {...rest}
        >
            {children}
        </button>
    )
}

export default Button
