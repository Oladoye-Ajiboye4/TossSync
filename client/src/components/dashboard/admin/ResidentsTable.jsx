import React, { useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

/**
 * CRM data table of connected houses/residents with a GSAP staggered fade-in.
 */
const ResidentsTable = ({ residents = [] }) => {
  const tbodyRef = useRef(null)

  useGSAP(() => {
    if (tbodyRef.current) {
      gsap.from(tbodyRef.current.querySelectorAll('tr'), {
        autoAlpha: 0,
        y: 16,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.06
      })
    }
  }, [residents.length])

  if (!residents.length) {
    return (
      <div className="rounded-3xl bg-white/90 border border-tertiary/40 p-10 text-center">
        <Icon icon="mdi:home-group" width="48" height="48" className="text-tertiary mx-auto mb-3" />
        <p className="font-bold text-secondary">No connected houses yet</p>
        <p className="text-sm text-[#5b4a3a]/70">Add residents manually or bulk-upload a CSV/Excel file to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white/90 border border-tertiary/40 shadow-[0_24px_70px_-40px_rgba(120,53,15,0.6)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-primary/20 text-secondary text-sm uppercase tracking-wide">
              <th className="px-5 py-4 font-bold">House / Resident</th>
              <th className="px-5 py-4 font-bold">Email</th>
              <th className="px-5 py-4 font-bold">Reg. Code</th>
              <th className="px-5 py-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef} className="divide-y divide-tertiary/20">
            {residents.map((r) => (
              <tr key={r._id || r.email} className="hover:bg-background/60 transition-colors">
                <td className="px-5 py-4 font-semibold text-[#3a2f26] flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-tertiary/40 flex items-center justify-center text-secondary">
                    <Icon icon="mdi:home" width="18" height="18" />
                  </span>
                  {r.username}
                </td>
                <td className="px-5 py-4 text-[#5b4a3a]">{r.email}</td>
                <td className="px-5 py-4">
                  <code className="text-xs bg-background px-2 py-1 rounded-md text-secondary font-mono">{r.registration_code || '—'}</code>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    r.provider_status === 'linked' ? 'bg-primary/40 text-secondary' : 'bg-tertiary/30 text-[#5b4a3a]'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {r.provider_status === 'linked' ? 'Linked' : 'Solo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ResidentsTable
