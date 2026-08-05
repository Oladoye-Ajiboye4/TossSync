import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Icon } from '@iconify/react'

/**
 * Reusable modal with a GSAP scale-in animation.
 * The overlay fades in; the panel springs from scale 0.9 -> 1.
 */
const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    const overlayRef = useRef(null)
    const panelRef = useRef(null)

    useGSAP(() => {
        if (open) {
            gsap.set(overlayRef.current, { autoAlpha: 0 })
            gsap.set(panelRef.current, { autoAlpha: 0, scale: 0.9, y: 20 })
            gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
            gsap.to(panelRef.current, {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                duration: 0.45,
                ease: 'back.out(1.6)',
                delay: 0.05
            })
        }
    }, [open])

    if (!open) return null

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                className={`w-full ${maxWidth} rounded-3xl bg-background border border-tertiary/40 shadow-2xl p-6 sm:p-8`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-extrabold text-secondary">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-tertiary/20 text-secondary"
                        aria-label="Close"
                    >
                        <Icon icon="mdi:close" width="22" height="22" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

export default Modal
