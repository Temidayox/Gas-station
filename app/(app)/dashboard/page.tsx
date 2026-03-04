'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { CHANNELS, EVENTS } from '@/lib/pusher'
import { fmt, fmtKg, fmtT, fmtD } from '@/lib/utils'
import styles from './dashboard.module.css'

type OutletStat = {
  id: number; name: string; location: string; dailyTarget: number;
  rev: number; kg: number; count: number; pct: number; tankPct: number; weekData: number[]; linked: number;
}
type DashData = {
  totalRev: number; totalKg: number; totalCount: number; anonPct: number;
  outlets: OutletStat[]; pricePerKg: number;
}
type Tx = {
  id: string; naira: number; kg: number; paymentMethod: string; cylinderId: string | null;
  isAnonymous: boolean; createdAt: string; outletId: number;
  outlet: { name: string }; cylinder?: { owner?: { name: string } | null } | null;
}

export default function DashboardPage() {
  const [data, setData]   = useState<DashData | null>(null)
  const [txs, setTxs]     = useState<Tx[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const tickerRef = useRef<HTMLDivElement>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, txRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/transactions?days=1&limit=40', { cache: 'no-store' }),
      ])
      if (!dashRes.ok || !txRes.ok) throw new Error('Fetch failed')
      const [dash, transactions] = await Promise.all([dashRes.json(), txRes.json()])
      setData(dash)
      setTxs(Array.isArray(transactions) ? transactions : [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(CHANNELS.PUBLIC)
    ch.bind(EVENTS.NEW_TRANSACTION, (tx: Tx) => {
      setTxs(prev => [tx, ...prev.slice(0, 39)])
      setNewIds(prev => new Set([...prev, tx.id]))
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(tx.id); return s }), 2000)
      setData(prev => {
        if (!prev) return prev
        const outlets = prev.outlets.map(o =>
          o.id === tx.outletId
            ? { ...o, rev: o.rev + tx.naira, kg: o.kg + tx.kg, count: o.count + 1,
                pct: Math.min(100, Math.round(((o.rev + tx.naira) / o.dailyTarget) * 100)) }
            : o
        )
        return { ...prev, totalRev: prev.totalRev + tx.naira, totalKg: prev.totalKg + tx.kg, totalCount: prev.totalCount + 1, outlets }
      })
      setLastUpdated(new Date())
    })
    ch.bind(EVENTS.PRICE_UPDATE, (d: { pricePerKg: number }) => {
      setData(prev => prev ? { ...prev, pricePerKg: d.pricePerKg } : prev)
    })
    return () => { try { ch.unbind_all(); pusher.unsubscribe(CHANNELS.PUBLIC) } catch {} }
  }, [fetchAll])

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingCard}>
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    </div>
  )
  if (!data) return null

  const tickerItems = txs.slice(0, 16)
  const doubled = [...tickerItems, ...tickerItems]
  const totalLinked = data.outlets.reduce((s, o) => s + o.linked, 0)

  return (
    <div>
      {/* Ticker */}
      {tickerItems.length > 0 && (
        <div className={styles.ticker}>
          <div className={styles.tickerBadge}>LIVE</div>
          <div className={styles.tickerTrack}>
            <div className={styles.tickerInner} ref={tickerRef}>
              {doubled.map((t, i) => (
                <span key={i} className={styles.tickItem}>
                  <span className={styles.tickOutlet}>{t.outlet?.name ?? '—'}</span>
                  <span className={styles.tickSep}>·</span>
                  <span className={styles.tickAmt}>{fmt(t.naira)}</span>
                  <span className={styles.tickSep}>·</span>
                  {fmtKg(t.kg)}
                  <span className={styles.tickSep}>·</span>
                  {t.paymentMethod?.replace('_',' ')}
                  <span className={styles.tickSep}>·</span>
                  {fmtT(t.createdAt)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.wrap}>
        {/* Page header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Operations Dashboard</h1>
            <div className={styles.headerMeta}>
              <span className={styles.liveChip}><span className="pulse-dot" /> Live</span>
              <span className={styles.metaDot}>·</span>
              {fmtD(new Date())}
              <span className={styles.metaDot}>·</span>
              Updated {fmtT(lastUpdated)}
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.ratePill}>
              <span className={styles.rateLabel}>Rate</span>
              <span className={styles.rateVal}>{fmt(data.pricePerKg)}<span className={styles.rateUnit}>/kg</span></span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className={`${styles.kpiGrid} stagger`}>
          <KpiCard label="Revenue Today" value={fmt(data.totalRev)} sub="All 4 outlets" trend={+8} color="green" icon="naira" />
          <KpiCard label="KG Dispensed" value={`${data.totalKg.toFixed(0)} kg`} sub={`${data.totalCount} transactions`} color="green" icon="cylinder" />
          <KpiCard label="Linked Sales" value={`${totalLinked}`} sub={`${data.totalCount - totalLinked} walk-ins`} color="blue" icon="user" />
          <KpiCard label="Anonymous" value={`${data.anonPct}%`} sub="Untracked customers" color="amber" icon="alert" />
        </div>

        {/* Outlet grid */}
        <div className={styles.sectionTitle}>Outlet Performance</div>
        <div className={`${styles.outletGrid} stagger`}>
          {data.outlets.map(o => (
            <div key={o.id} className={`${styles.outletCard} fade-up`}>
              <div className={styles.outletHeader}>
                <div>
                  <div className={styles.outletName}>{o.name}</div>
                  <div className={styles.outletLoc}>{o.location}</div>
                </div>
                <span className={`${styles.pctBadge} ${o.pct >= 80 ? styles.pctGreen : o.pct >= 40 ? styles.pctAmber : styles.pctRed}`}>
                  {o.pct}%
                </span>
              </div>
              <div className={styles.outletRev}>{fmt(o.rev)}</div>
              <div className={styles.outletMeta}>{fmtKg(o.kg)} · {o.count} sales · {o.linked} linked</div>
              <div className={styles.prog}>
                <div className={styles.progFill} style={{
                  width: `${o.pct}%`,
                  background: o.pct >= 80 ? 'var(--gl)' : o.pct >= 40 ? 'var(--am)' : 'var(--rd)'
                }}/>
              </div>
              <div className={styles.outletTarget}>Target: {fmt(o.dailyTarget)}</div>
              <div className={styles.tankRow}>
                <span className={styles.tankRowLabel}>⛽ Tank</span>
                <div className={styles.tankRowBar}>
                  <div style={{ width: `${o.tankPct}%`, height: '100%', borderRadius: 3,
                    background: o.tankPct < 20 ? 'var(--rd)' : o.tankPct < 40 ? 'var(--am)' : 'var(--gl)',
                    transition: 'width .6s ease' }} />
                </div>
                <span className={`${styles.tankRowPct} ${o.tankPct < 20 ? styles.tankRowRed : o.tankPct < 40 ? styles.tankRowAmber : ''}`}>{o.tankPct}%</span>
              </div>
              <MiniChart data={o.weekData} />
            </div>
          ))}
        </div>

        {/* Live feed */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Live Transaction Feed</span>
            <div className={styles.cardMeta}>
              <span className={styles.liveChip}><span className="pulse-dot" /> Real-time</span>
              <span className={styles.countChip}>{txs.length} today</span>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Time</th><th>Outlet</th><th>Amount (₦)</th>
                  <th>KG</th><th>Payment</th><th>Customer</th><th>TX ID</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 && (
                  <tr><td colSpan={7} className={styles.emptyCell}>No transactions today yet</td></tr>
                )}
                {txs.map((t, i) => (
                  <tr key={t.id} className={`${i % 2 ? styles.alt : ''} ${newIds.has(t.id) ? styles.flashRow : ''}`}>
                    <td className={styles.mono}>{fmtT(t.createdAt)}</td>
                    <td className={styles.bold}>{t.outlet?.name ?? '—'}</td>
                    <td className={styles.money}>{fmt(t.naira)}</td>
                    <td className={styles.mono}>{fmtKg(t.kg)}</td>
                    <td><PayBadge method={t.paymentMethod} /></td>
                    <td>
                      {t.cylinderId
                        ? <span className={styles.cylId}>{t.cylinderId}</span>
                        : <span className={styles.anon}>Walk-in</span>}
                    </td>
                    <td className={`${styles.mono} ${styles.dim}`}>{t.id.slice(0, 10).toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, trend, color, icon }: {
  label: string; value: any; sub: string; trend?: number; color: 'green'|'amber'|'blue'; icon: string
}) {
  const colorMap = { green: 'var(--g)', amber: 'var(--am)', blue: '#1a73e8' }
  const bgMap    = { green: 'var(--gp)', amber: 'var(--al)', blue: '#e8f0fe' }
  const ICONS: Record<string,string> = {
    naira:    'M6 4h12M6 10h12M8 4v16M16 4v16',
    cylinder: 'M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z',
    user:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    alert:    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  }
  return (
    <div className={`${styles.kpiCard} fade-up`}>
      <div className={styles.kpiBar} style={{ background: colorMap[color] }} />
      <div className={styles.kpiContent}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>{label}</span>
          <div className={styles.kpiIcon} style={{ background: bgMap[color] }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={colorMap[color]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[icon] ?? ''} />
            </svg>
          </div>
        </div>
        <div className={`${styles.kpiVal} count-in`}>{value}</div>
        <div className={styles.kpiFooter}>
          <span className={styles.kpiSub}>{sub}</span>
          {trend !== undefined && (
            <span className={`${styles.kpiTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const days = ['M','T','W','T','F','S','S']
  return (
    <div className={styles.miniChart}>
      {data.map((v, i) => (
        <div key={i} className={styles.miniChartCol}>
          <div className={styles.miniBar}
            style={{ height: v > 0 ? `${Math.max((v/max)*100, 8)}%` : '4%',
              background: i === data.length-1 ? 'var(--g)' : 'var(--gl)',
              opacity: i === data.length-1 ? 1 : 0.4 + (i / data.length) * 0.55 }}
          />
          <span className={styles.miniDay}>{days[i]}</span>
        </div>
      ))}
    </div>
  )
}

function PayBadge({ method }: { method: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    CASH:         { bg: 'var(--gp)',  color: 'var(--g)',   label: 'Cash' },
    TRANSFER:     { bg: 'var(--blp)', color: 'var(--bl)',  label: 'Transfer' },
    POS_TERMINAL: { bg: 'var(--al)',  color: 'var(--amd)', label: 'POS' },
  }
  const m = map[method] ?? { bg: '#f0f0f0', color: '#666', label: method }
  return (
    <span style={{ background: m.bg, color: m.color, padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--fl),sans-serif', display: 'inline-block' }}>
      {m.label}
    </span>
  )
}