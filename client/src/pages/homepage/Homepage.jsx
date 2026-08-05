import React, { useRef } from 'react'
import { Link } from 'react-router'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

/**
 * Homepage — TossSync landing page.
 * Styled with Tailwind v4 theme colors and a subtle GSAP hero timeline:
 *   - staggered fade-up of eyebrow, headline, subtext & CTAs
 *   - floating recycle badge
 *   - gentle rise of the feature cards
 */
const FEATURES = [
  {
    icon: 'mdi:calendar-check',
    title: 'Smart Scheduling',
    text: 'Never miss a pickup. Get your official collection cycle and a live countdown.'
  },
  {
    icon: 'mdi:bell-ring',
    title: 'Timely Reminders',
    text: 'Push notifications and reminders keep your household on track effortlessly.'
  },
  {
    icon: 'mdi:account-group',
    title: 'For Providers',
    text: 'Manage residents, generate registration codes, and assign pickup cycles with ease.'
  }
]

const Homepage = () => {
  const rootRef = useRef(null)
  const badgeRef = useRef(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.from('[data-hero]', {
      autoAlpha: 0,
      y: 30,
      duration: 0.7,
      stagger: 0.14
    })
      .from(
        '[data-feature]',
        {
          autoAlpha: 0,
          y: 40,
          duration: 0.6,
          stagger: 0.12
        },
        '-=0.2'
      )

    // Continuous float for the recycle badge
    gsap.to(badgeRef.current, {
      y: -12,
      duration: 2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
  }, [])

  return (
    <main
      ref={rootRef}
      className="min-h-screen w-full bg-background overflow-hidden"
    >
      {/* Nav */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Icon icon="mdi:recycle" width="24" height="24" className="text-white" />
          </div>
          <span className="text-xl font-extrabold text-secondary">TossSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/signin"
            className="px-4 py-2 rounded-xl font-semibold text-secondary hover:bg-tertiary/20 transition"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-xl font-semibold bg-secondary text-white hover:brightness-95 transition shadow-lg shadow-black/5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-6xl mx-auto px-5 pt-10 pb-16 flex flex-col items-center text-center">
        <div
          ref={badgeRef}
          data-hero
          className="inline-flex items-center gap-2 rounded-full bg-primary/30 border border-primary/50 px-5 py-2 mb-8"
        >
          <Icon icon="mdi:leaf" width="20" height="20" className="text-secondary" />
          <span className="text-sm font-semibold text-secondary">Cleaner communities, effortlessly</span>
        </div>

        <h1
          data-hero
          className="text-4xl sm:text-6xl font-extrabold text-secondary leading-tight max-w-4xl"
        >
          Waste Pickup Scheduling,{' '}
          <span className="text-[#7d9370]">Perfectly in Sync</span>
        </h1>

        <p
          data-hero
          className="text-base sm:text-xl text-[#5b4a3a]/80 mt-6 max-w-2xl leading-relaxed"
        >
          TossSync connects residents with waste management providers — with live pickup
          countdowns, smart reminders, and a powerful dashboard for organizations.
        </p>

        <div data-hero className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold bg-secondary text-white hover:brightness-95 transition shadow-xl shadow-secondary/20"
          >
            <Icon icon="mdi:rocket-launch" width="22" height="22" />
            Get Started Free
          </Link>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold bg-white/80 text-secondary border-2 border-secondary hover:bg-secondary/10 transition"
          >
            <Icon icon="mdi:login" width="22" height="22" />
            Sign In
          </Link>
        </div>

        <div data-hero className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-[#5b4a3a]/70">
          <span className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" width="18" height="18" className="text-[#7d9370]" />
            Free for residents
          </span>
          <span className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" width="18" height="18" className="text-[#7d9370]" />
            No credit card required
          </span>
          <span className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" width="18" height="18" className="text-[#7d9370]" />
            Setup in minutes
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-6xl mx-auto px-5 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              data-feature
              className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] p-7"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/30 flex items-center justify-center mb-5">
                <Icon icon={f.icon} width="30" height="30" className="text-secondary" />
              </div>
              <h3 className="text-xl font-extrabold text-secondary mb-2">{f.title}</h3>
              <p className="text-[#5b4a3a]/80 text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="w-full max-w-6xl mx-auto px-5 pb-20">
        <div className="rounded-3xl bg-secondary p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to sync your waste pickups?
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Join TossSync today and keep your community cleaner with zero hassle.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold bg-white text-secondary hover:bg-background transition shadow-xl"
          >
            <Icon icon="mdi:arrow-right-circle" width="22" height="22" />
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-5 py-8 border-t border-tertiary/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:recycle" width="20" height="20" className="text-secondary" />
          <span className="font-bold text-secondary">TossSync</span>
        </div>
        <p className="text-[#5b4a3a]/60 text-sm">© 2026 TossSync. Keeping communities clean ♻️</p>
      </footer>
    </main>
  )
}

export default Homepage
