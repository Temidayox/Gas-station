'use client'
import { useEffect, useState, useCallback } from 'react'
import styles from './stickers.module.css'

export default function StickersPage() {
  const [cylinders, setCylinders] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'unlinked' | 'linked'>('all')
  const [search, setSearch]       = useState('')

  const [newCount, setNewCount]   = useState('1')
  const [creating, setCreating]   = useState(false)
  const [createOk, setCreateOk]   = useState('')
  const [createErr, setCreateErr] = useState('')

  const fetchStickers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stickers', { cache: 'no-store' })
      const d = await res.json()
      setCylinders(Array.isArray(d) ? d : [])
    } catch { setCylinders([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStickers() }, [fetchStickers])

  async function createStickers() {
    const qty = parseInt(newCount)
    if (!qty || qty < 1) { setCreateErr('Enter a valid quantity'); return }
    setCreating(true); setCreateErr(''); setCreateOk('')
    try {
      const res = await fetch('/api/admin/stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: qty }),
      })
      const d = await res.json()
      if (res.ok) {
        setCreateOk(`Created ${d.count} sticker${d.count > 1 ? 's' : ''}: ${d.created.map((c: any) => c.id).join(', ')}`)
        setNewCount('1')
        await fetchStickers()
      } else { setCreateErr(d.error ?? 'Failed') }
    } catch { setCreateErr('Network error') }
    finally { setCreating(false) }
  }

  const filtered = cylinders.filter(c => {
    if (filter === 'linked'   && !c.isLinked) return false
    if (filter === 'unlinked' &&  c.isLinked) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) &&
        !(c.owner?.name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const unlinkedCount = cylinders.filter(c => !c.isLinked).length
  const linkedCount   = cylinders.filter(c =>  c.isLinked).length

  if (loading) return <div className={styles.loading}><div className="spinner" /></div>

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cylinder Stickers</h1>
          <div className={styles.sub}>
            Each sticker is a unique ID printed on a waterproof label. Customers link their physical cylinder to a sticker ID — the sticker size is recorded on first fill.
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStickers}>↻ Refresh</button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryVal}>{cylinders.length}</div>
          <div className={styles.summaryLabel}>Total Stickers</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryGreen}`}>
          <div className={styles.summaryVal}>{linkedCount}</div>
          <div className={styles.summaryLabel}>Linked to Customers</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryAmber}`}>
          <div className={styles.summaryVal}>{unlinkedCount}</div>
          <div className={styles.summaryLabel}>Available to Hand Out</div>
        </div>
      </div>

      <div className={styles.createCard}>
        <div className={styles.createTitle}>+ Create New Stickers</div>
        <div className={styles.createNote}>
          Stickers are just unique IDs — no size assigned at creation. The customer's cylinder size is recorded when staff log the first sale.
        </div>
        <div className={styles.createFields}>
          <div className={styles.createField}>
            <label>How many stickers?</label>
            <input
              className={styles.createInp}
              type="number" min="1" max="50"
              placeholder="1–50"
              value={newCount}
              onChange={e => { setNewCount(e.target.value); setCreateErr(''); setCreateOk('') }}
            />
          </div>
          <button className={styles.createBtn} onClick={createStickers} disabled={creating}>
            {creating ? 'Creating…' : 'Generate Stickers'}
          </button>
        </div>
        {createErr && <div className={styles.createErr}>{createErr}</div>}
        {createOk  && <div className={styles.createOk}>{createOk}</div>}
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterTabs}>
          {(['all', 'unlinked', 'linked'] as const).map(f => (
            <button key={f} className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${cylinders.length})` : f === 'unlinked' ? `Available (${unlinkedCount})` : `Linked (${linkedCount})`}
            </button>
          ))}
        </div>
        <input className={styles.search} placeholder="Search by ID or customer name…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.tbl}>
          <thead>
            <tr><th>Sticker ID</th><th>Status</th><th>Customer</th><th>Phone / Email</th></tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className={i % 2 ? styles.alt : ''}>
                <td><span className={styles.cylId}>{c.id}</span></td>
                <td>
                  <span className={c.isLinked ? styles.badgeLinked : styles.badgeFree}>
                    {c.isLinked ? '● Linked' : '○ Available'}
                  </span>
                </td>
                <td className={styles.custName}>{c.owner?.name ?? <span className={styles.none}>Not linked</span>}</td>
                <td className={styles.custContact}>{c.owner?.phone ?? c.owner?.email ?? <span className={styles.none}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No stickers match your filter.</div>}
      </div>
    </div>
  )
}