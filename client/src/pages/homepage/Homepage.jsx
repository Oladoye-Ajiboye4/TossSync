import React, { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
  const mobileMenuRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const heroWords = [
    { text: 'Waste', accent: false },
    { text: 'Pickup', accent: false },
    { text: 'Scheduling,', accent: false },
    { text: 'Perfectly', accent: true },
    { text: 'in', accent: true },
    { text: 'Sync', accent: true }
  ]

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.from('[data-nav-item]', {
      autoAlpha: 0,
      y: -12,
      duration: 0.4,
      stagger: 0.08
    })
      .from('[data-hero-badge]', {
        autoAlpha: 0,
        y: 20,
        duration: 0.5
      })
      .from('[data-hero-word]', {
        autoAlpha: 0,
        y: 28,
        duration: 0.5,
        stagger: 0.08
      })
      .from('[data-hero-copy]', {
        autoAlpha: 0,
        y: 24,
        duration: 0.5
      }, '-=0.15')
      .from('[data-hero-cta]', {
        autoAlpha: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.1
      }, '-=0.2')

    // Continuous float for the recycle badge
    gsap.to(badgeRef.current, {
      y: -12,
      duration: 2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })

    gsap.utils.toArray('[data-feature]').forEach((element) => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 36 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 82%'
          }
        }
      )
    })

    gsap.fromTo(
      '[data-cta-banner]',
      { autoAlpha: 0, y: 36 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-cta-banner]',
          start: 'top 84%'
        }
      }
    )
  }, { scope: rootRef })

  useGSAP(() => {
    if (!mobileMenuRef.current) return

    if (isMenuOpen) {
      gsap.fromTo(
        mobileMenuRef.current,
        { autoAlpha: 0, y: -8 },
        { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }
      )
    } else {
      gsap.to(mobileMenuRef.current, {
        autoAlpha: 0,
        y: -8,
        duration: 0.2,
        ease: 'power2.in'
      })
    }
  }, { dependencies: [isMenuOpen], scope: rootRef })

  return (
    <main
      ref={rootRef}
      className="min-h-screen w-full bg-background overflow-hidden"
    >
      {/* Nav */}
      <nav className="w-full max-w-6xl mx-auto px-4 py-4 sm:px-5 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" data-nav-item>
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Icon icon="mdi:recycle" width="24" height="24" className="text-white" />
            </div>
            <span className="text-lg md:text-xl font-extrabold text-secondary">TossSync</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-expanded={isMenuOpen}
            aria-controls="home-navigation"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-tertiary/50 bg-white/80 text-secondary shadow-sm transition-transform hover:scale-105 md:hidden"
          >
            <Icon icon={isMenuOpen ? 'mdi:close' : 'mdi:menu'} width="24" height="24" />
          </button>

          <div className="hidden items-center gap-3 md:flex" data-nav-item>
            <Link
              to="/signin"
              className="px-4 py-2 rounded-xl font-semibold text-secondary hover:bg-tertiary/20 transition-transform hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl font-semibold bg-secondary text-white hover:brightness-95 transition-transform hover:scale-105 shadow-lg shadow-black/5"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div
          id="home-navigation"
          ref={mobileMenuRef}
          className={`${isMenuOpen ? 'block' : 'hidden'} mt-4 rounded-2xl border border-tertiary/40 bg-white/95 p-4 shadow-lg md:hidden`}
        >
          <div className="flex flex-col gap-3">
            <Link
              to="/signin"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-tertiary/40 px-4 py-3 text-base font-semibold text-secondary transition-transform hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-3 text-base font-semibold text-white transition-transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-6xl mx-auto px-5 pt-10 pb-16 flex flex-col items-center text-center">
        <div
          ref={badgeRef}
          data-hero-badge
          className="inline-flex items-center gap-2 rounded-full bg-primary/30 border border-primary/50 px-5 py-2 mb-8"
        >
          <Icon icon="mdi:leaf" width="20" height="20" className="text-secondary" />
          <span className="text-sm md:text-base font-semibold text-secondary">Cleaner communities, effortlessly</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-secondary leading-tight max-w-4xl">
          <span className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {heroWords.map((word, index) => (
              <span
                key={`${word.text}-${index}`}
                data-hero-word
                className={word.accent ? 'text-[#7d9370]' : ''}
              >
                {word.text}
              </span>
            ))}
          </span>
        </h1>

        <p
          data-hero-copy
          className="text-base md:text-lg text-[#5b4a3a]/80 mt-6 max-w-2xl leading-relaxed"
        >
          TossSync connects residents with waste management providers — with live pickup
          countdowns, smart reminders, and a powerful dashboard for organizations.
        </p>

        <div data-hero-cta className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold bg-secondary text-white hover:brightness-95 hover:scale-105 transition-transform shadow-xl shadow-secondary/20"
          >
            <Icon icon="mdi:rocket-launch" width="22" height="22" />
            Get Started Free
          </Link>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold bg-white/80 text-secondary border-2 border-secondary hover:bg-secondary/10 hover:scale-105 transition-transform"
          >
            <Icon icon="mdi:login" width="22" height="22" />
            Sign In
          </Link>
        </div>

        <div data-hero-copy className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm md:text-base text-[#5b4a3a]/70">
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
              className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] p-7 will-change-transform"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/30 flex items-center justify-center mb-5">
                <Icon icon={f.icon} width="30" height="30" className="text-secondary" />
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-secondary mb-2">{f.title}</h3>
              <p className="text-[#5b4a3a]/80 text-sm md:text-base leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="w-full max-w-6xl mx-auto px-5 pb-20">
        <div data-cta-banner className="rounded-3xl bg-secondary p-10 sm:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to sync your waste pickups?
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto mb-8">
            Join TossSync today and keep your community cleaner with zero hassle.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold bg-white text-secondary hover:bg-background hover:scale-105 transition-transform shadow-xl"
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
