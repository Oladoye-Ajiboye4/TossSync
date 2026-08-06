import { useCallback, useMemo, useState } from 'react'


/**
 * useCrmResidents — the CRM data engine.
 *
 * Holds a LIVE local copy of the residents so edits, cycle assignments and status
 * changes reflect instantly (optimistic UI) without a hard reload. All sorting,
 * filtering and derivation is done with .map()/.filter()/.reduce()/.sort() — the
 * project's strict Zero-Loop Rule (no for/while/for..of anywhere).
 */

export const SORT_OPTIONS = [
  { value: 'az', label: 'Name A–Z', icon: 'mdi:sort-alphabetical-ascending' },
  { value: 'za', label: 'Name Z–A', icon: 'mdi:sort-alphabetical-descending' },
  { value: 'status', label: 'By Status', icon: 'mdi:sort-variant' },
  { value: 'area', label: 'By Area', icon: 'mdi:map-marker-outline' }
]

export const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' }
]

// Rank used by the "By Status" sort so the admin sees the most actionable first.
const STATUS_RANK = { missed: 0, pending: 1, completed: 2 }

const normalizeName = (r) => (r.username || '').toLowerCase()
const normalizeArea = (r) => (r.area || '').toLowerCase()

export const useCrmResidents = (sourceResidents) => {
  const [residents, setResidents] = useState(sourceResidents || [])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('az')
  const [areaFilter, setAreaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Re-sync whenever the server payload changes (e.g. after a refetch) using the
  // React-recommended "adjust state during render" pattern rather than an effect,
  // so optimistic local edits are preserved between renders of the same payload.
  const [prevSource, setPrevSource] = useState(sourceResidents)
  if (sourceResidents !== prevSource) {
    setPrevSource(sourceResidents)
    setResidents(sourceResidents || [])
  }


  /** Patch a single resident in place (optimistic, no reload). */
  const patchResident = useCallback((id, changes) => {
    setResidents((prev) =>
      prev.map((r) => (String(r._id) === String(id) ? { ...r, ...changes } : r))
    )
  }, [])

  /** Remove a resident locally (used after a successful disconnect). */
  const removeResident = useCallback((id) => {
    setResidents((prev) => prev.filter((r) => String(r._id) !== String(id)))
  }, [])

  // Distinct areas for the Area filter dropdown, derived with reduce (zero-loop).
  const areaOptions = useMemo(() => {
    const distinct = residents.reduce((acc, r) => {
      const area = (r.area || '').trim()
      if (area && !acc.includes(area)) acc.push(area)
      return acc
    }, [])
    const sorted = [...distinct].sort((a, b) => a.localeCompare(b))
    return [{ value: 'all', label: 'All Areas' }].concat(
      sorted.map((area) => ({ value: area, label: area }))
    )
  }, [residents])

  // The full pipeline: search -> area filter -> status filter -> sort.
  const visibleResidents = useMemo(() => {
    const query = search.trim().toLowerCase()

    const searched =
      query.length === 0
        ? residents
        : residents.filter((r) => {
            const haystack = `${r.username || ''} ${r.email || ''} ${r.area || ''} ${r.assigned_cycle || ''}`.toLowerCase()
            return haystack.includes(query)
          })

    const byArea =
      areaFilter === 'all'
        ? searched
        : searched.filter((r) => (r.area || '') === areaFilter)

    const byStatus =
      statusFilter === 'all'
        ? byArea
        : byArea.filter((r) => (r.weekly_status || 'pending') === statusFilter)

    // Sort on a shallow copy so we never mutate state in place.
    const sorters = {
      az: (a, b) => normalizeName(a).localeCompare(normalizeName(b)),
      za: (a, b) => normalizeName(b).localeCompare(normalizeName(a)),
      area: (a, b) =>
        normalizeArea(a).localeCompare(normalizeArea(b)) ||
        normalizeName(a).localeCompare(normalizeName(b)),
      status: (a, b) =>
        (STATUS_RANK[a.weekly_status] ?? 1) - (STATUS_RANK[b.weekly_status] ?? 1) ||
        normalizeName(a).localeCompare(normalizeName(b))
    }

    return [...byStatus].sort(sorters[sortBy] || sorters.az)
  }, [residents, search, areaFilter, statusFilter, sortBy])

  const activeFilterCount = useMemo(
    () =>
      [areaFilter !== 'all', statusFilter !== 'all', search.trim().length > 0].filter(Boolean)
        .length,
    [areaFilter, statusFilter, search]
  )

  const resetFilters = useCallback(() => {
    setSearch('')
    setAreaFilter('all')
    setStatusFilter('all')
    setSortBy('az')
  }, [])

  return {
    // data
    residents,
    visibleResidents,
    areaOptions,
    // controls
    search,
    setSearch,
    sortBy,
    setSortBy,
    areaFilter,
    setAreaFilter,
    statusFilter,
    setStatusFilter,
    activeFilterCount,
    resetFilters,
    // mutations (optimistic)
    patchResident,
    removeResident
  }
}

export default useCrmResidents
