import React, { useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { QRCodeCanvas } from 'qrcode.react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const ShareTab = ({ organization, notify, errorNotify }) => {
  const [copied, setCopied] = useState(false)
  const toastRef = useRef(null)
  const qrWrapRef = useRef(null)

  const inviteUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/register?ref=${organization.business_id}`
  }, [organization.business_id])

  const { contextSafe } = useGSAP({ scope: toastRef })

  const showToast = contextSafe(() => {
    gsap.fromTo(
      toastRef.current,
      { autoAlpha: 0, y: 16, scale: 0.9 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' }
    )
    gsap.to(toastRef.current, { autoAlpha: 0, y: 16, duration: 0.3, delay: 1.8, ease: 'power2.in' })
  })

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      showToast()
      notify?.('Invite link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      errorNotify?.('Unable to copy the invite link')
    }
  }

  const handleDownloadPoster = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas')
    if (!canvas) {
      errorNotify?.('QR code is not ready yet')
      return
    }
    const link = document.createElement('a')
    link.download = `${organization.business_id}-invite-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="relative flex flex-col gap-6 lg:grid lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[#5b4a3a]">Share &amp; Onboard</h3>
          <p className="mt-1 text-sm text-secondary/70">Invite residents with your unique link.</p>
        </div>

        <div className="rounded-xl bg-primary/20 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary/60">Business ID</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-secondary">{organization.business_id}</p>
        </div>

        <div>
          <label htmlFor="invite-url" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">Invite Link</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="invite-url"
              type="text"
              readOnly
              value={inviteUrl}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-tertiary/50 bg-background/40 px-3 text-sm text-[#5b4a3a] outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-white hover:bg-secondary/90"
            >
              <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width="20" height="20" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#5b4a3a]">Neighborhood QR Poster</h3>
        <div ref={qrWrapRef} className="rounded-2xl border border-tertiary/30 bg-white p-4">
          <QRCodeCanvas
            value={inviteUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#5b4a3a"
            level="M"
            includeMargin
          />
        </div>
        <button
          type="button"
          onClick={handleDownloadPoster}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-secondary px-4 text-sm font-bold text-secondary hover:bg-secondary/10"
        >
          <Icon icon="mdi:download" width="20" height="20" aria-hidden="true" />
          Download Poster
        </button>
      </section>

      <div
        ref={toastRef}
        role="status"
        className="pointer-events-none invisible fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#5b4a3a] px-5 py-3 text-sm font-bold text-white shadow-lg"
      >
        <span className="flex items-center gap-2">
          <Icon icon="mdi:check-circle" width="18" height="18" aria-hidden="true" />
          Link copied to clipboard
        </span>
      </div>
    </div>
  )
}

export default ShareTab
