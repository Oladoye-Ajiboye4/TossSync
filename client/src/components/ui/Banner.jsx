import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Icon } from '@iconify/react'

/**
 * Non-intrusive banner that smoothly slides down on mount (GSAP).
 * Used for the Solo Resident "Provider not connected" warning.
 */
const TONES = {
    warning: 'bg-tertiary/25 border-secondary/40 text-secondary',
    info: 'bg-primary/25 border-primary text-[#3a4636]',
    danger: 'bg-red-100 border-red-300 text-red-700'
}

const ICONS = {
    warning: 'mdi:alert-circle-outline',
    info: 'mdi:information-outline',
    danger: 'mdi:alert-octagon-outline'
}

const Banner = ({ tone = 'warning', title, children, icon }) => {
    const ref = useRef(null)

    useGSAP(() => {
        gsap.from(ref.current, {
            height: 0,
            y: -20,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power3.out',
            clearProps: 'height'
        })
    }, [])

    return (
        <div
            ref={ref}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 overflow-hidden ${TONES[tone]}`}
        >
            <Icon icon={icon || ICONS[tone]} width="24" height="24" className="shrink-0 mt-0.5" />
            <div className="flex-1">
                {title && <p className="font-bold">{title}</p>}
                {children && <div className="text-sm opacity-90">{children}</div>}
            </div>
        </div>
    )
}

export default Banner
