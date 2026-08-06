import React, { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

/**
 * Web Push Notifications toggle.
 * Requests browser permission and animates the button state transition.
 */
const PushNotificationToggle = ({ notify, errorNotify, compact = false }) => {

  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [requesting, setRequesting] = useState(false)
  const btnRef = useRef(null)
  const { contextSafe } = useGSAP({ scope: btnRef })

  const animateSuccess = contextSafe(() => {
    if (!btnRef.current) return
    gsap.to(btnRef.current, {
      scale: 1.05,
      backgroundColor: '#A8BBA3',
      duration: 0.3,
      ease: 'back.out(1.7)',
      onComplete: () => {
        gsap.to(btnRef.current, { scale: 1, duration: 0.2 })
      }
    })
  })

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      errorNotify?.('Push notifications are not supported in this browser')
      return
    }
    if (permission === 'granted') {
      notify?.('Push notifications are already enabled')
      return
    }
    try {
      setRequesting(true)
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        notify?.('Push notifications enabled')
        animateSuccess()
      } else {
        errorNotify?.('Push notification permission denied')
      }
    } catch {
      errorNotify?.('Failed to request push notification permission')
    } finally {

      setRequesting(false)
    }
  }

  const isEnabled = permission === 'granted'

  // Compact pill for the top header/action bar.
  if (compact) {
    return (
      <button
        ref={btnRef}
        type="button"
        onClick={requestPermission}
        disabled={requesting || isEnabled}
        aria-label={isEnabled ? 'Push notifications enabled' : 'Enable push notifications'}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold ${
          isEnabled
            ? 'bg-primary text-white'
            : 'border-2 border-secondary text-secondary hover:bg-secondary/10'
        } disabled:opacity-60`}
      >
        <Icon
          icon={isEnabled ? 'mdi:bell-check' : 'mdi:bell-outline'}
          width="20"
          height="20"
          aria-hidden="true"
        />
        <span className="whitespace-nowrap">
          {requesting ? 'Requesting...' : isEnabled ? 'Push Enabled' : 'Enable Push Alerts'}
        </span>
      </button>
    )
  }

  return (
    <div>

      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary/60">
        Browser Push Notifications
      </span>
      <button
        ref={btnRef}
        type="button"
        onClick={requestPermission}
        disabled={requesting || isEnabled}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-opacity ${
          isEnabled
            ? 'bg-primary text-white'
            : 'border-2 border-secondary text-secondary hover:bg-secondary/10'
        } disabled:opacity-60`}
      >
        <Icon
          icon={isEnabled ? 'mdi:check-circle' : 'mdi:bell-outline'}
          width="20"
          height="20"
          aria-hidden="true"
        />
        {requesting ? 'Requesting...' : isEnabled ? 'Enabled' : 'Enable Push Notifications'}
      </button>
    </div>
  )
}

export default PushNotificationToggle
