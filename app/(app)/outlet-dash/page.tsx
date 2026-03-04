'use client'
import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { CHANNELS, EVENTS } from '@/lib/pusher'
import { fmt, fmtKg, fmtT, fmtD } from '@/lib/utils'
import styles from './outlet-dash.module.css'

export default function OutletDashPage() {
  const [dash, setDash]         = useState<any>(null)
  const [txs,  setTxs]          = useState<any[]>([])
  const [error, setError]       = useState('')
  const [tankCurrentKg, setTankCurrentKg] = useState(0)
  const [tankCapacityKg, setTankCapacityKg] = useState(1)

  const [showRefill, setShowRefill]   = useState(false)
  const [refillKg, setRefillKg]       = useState('')
  const [refillNote, setRefillNote]   = useState('')
  const [refillLoading, setRefillLoading] = useState(false)
  const [refillErr, setRefillErr]     = useState('')
  const [refillOk, setRefillOk]       = useState('')

  const fetchDash = useCallback(async () => {
    try {
      const [dashRes, tankRes] = await Promise.all([
        fetch('/api/outlet-dash', { cache: 'no-store' }),
        fetch('/api/tank-refill', { cache: 'no-store' }),
      ])
      if (!dashRes.ok) { setError('Failed to load dashboard'); return }
      const d = await dashRes.json()
      const tank = tankRes.ok ? await tankRes.json() : null
      setDash(d)
      setTxs(Array.isArray(d.transactions) ? d.transactions : [])
      if (tank) { setTankCurrentKg(tank.tankCurrentKg); setTankCapacityKg(tank.tankCapacityKg) }
    } catch { setError('Network error') }
  }, [])

  useEffect(() => {
    fetchDash()
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(CHANNELS.PUBLIC)
    ch.bind(EVENTS.NEW_TRANSACTION, (tx: any) => {
      setTxs(prev => [tx, ...prev.slice(0, 49)])
      setDash((prev: any) => {
        if (!prev) return prev
        const newRev = prev.rev + tx.naira
        return { ...prev, rev: newRev, kg: prev.kg + tx.kg, count: prev.count + 1, linked: tx.cylinderId ? prev.linked + 1 : prev.linked, pct: Math.min(100, Math.round((newRev / prev.dailyTarget) * 100)) }
      })
      setTankCurrentKg(prev => Math.max(0, parseFloat((prev - tx.kg).toFixed(2))))
    })
    return () => { try { ch.unbind_all(); pusher.unsubscribe(CHANNELS.PUBLIC) } catch {} }
  }, [fetchDash])

  async function submitRefill() {
    const kg = parseFloat(refillKg)
    if (!kg || kg <= 0) { setRefillErr('Enter a valid amount'); return }
    setRefillLoading(true); setRefillErr('')
    try {
      const res = await fetch('/api/tank-refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addedKg: kg, note: refillNote }),
      })
      const d = await res.json()
      if (res.ok) {
        setTankCurrentKg(d.afterKg)
        setTankCapacityKg(d.capacityKg)
        setRefillOk(`Tank updated: ${d.beforeKg.toFixed(0)}kg → ${d.afterKg.toFixed(0)}kg`)
        setRefillKg(''); setRefillNote('')
        setTimeout(() => { setShowRefill(false); setRefillOk('') }, 2200)
      } else { setRefillErr(d.error ?? 'Failed') }
    } catch { setRefillErr('Network error') }
    finally { setRefillLoading(false) }
  }

  if (error) return (
    <div className={styles.loadingWrap}>
      <div className={styles.errorMsg}>{error}</div>
      <button className={styles.retryBtn} onClick={fetchDash}>Retry</button>
    </div>
  )
  if (!dash) return <div className={styles.loadingWrap}><div className="spinner" /><span>Loading…</span></div>

  const tankPct  = Math.min(100, Math.round((tankCurrentKg / tankCapacityKg) * 100))
  const tankLow  = tankPct < 20
  const tankWarn = tankPct < 40

  const hours = Array.from({ length: 14 }, (_, i) => {
    const h = i + 6
    return txs.filter((t: any) => new Date(t.createdAt).getHours() === h).reduce((s: number, t: any) => s + t.naira, 0)
  })
  const maxH = Math.max(...hours, 1)

  const payTotals = { CASH: 0, TRANSFER: 0, POS_TERMINAL: 0 }
  txs.forEach((t: any) => { const k = t.paymentMethod as keyof typeof payTotals; if (k in payTotals) payTotals[k] += t.naira })
  const payTotal = Math.max(Object.values(payTotals).reduce((s, v) => s + v, 0), 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{dash.outletName}</h1>
            <span className={styles.liveBadge}><span className="pulse-dot" /> Live</span>
          </div>
          <div className={styles.sub}>{fmtD(new Date())} · Rate: <strong>{fmt(dash.pricePerKg)}/kg</strong></div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className={styles.refreshBtn} onClick={fetchDash}>↻</button>
          <button className={`${styles.refillBtn} ${tankLow ? styles.refillBtnUrgent : ''}`} onClick={() => { setShowRefill(true); setRefillErr(''); setRefillOk('') }}>
            ⛽ Tank Refill
          </button>
        </div>
      </div>

      <div className={`${styles.tankCard} ${tankLow ? styles.tankLow : tankWarn ? styles.tankWarn : ''}`}>
        <div className={styles.tankLeft}>
          <div className={styles.tankLabel}>
            {tankLow ? '⚠ TANK CRITICALLY LOW' : tankWarn ? '⚠ Tank Level Low' : '⛽ Tank Level'}
          </div>
          <div className={styles.tankStats}>
            <span className={styles.tankCurrent}>{tankCurrentKg.toFixed(0)} kg</span>
            <span className={styles.tankOf}>of {tankCapacityKg.toFixed(0)} kg capacity</span>
          </div>
        </div>
        <div className={styles.tankBarWrap}>
          <div className={styles.tankBarTrack}>
            <div className={styles.tankBarFill} style={{
              width: `${tankPct}%`,
              background: tankLow ? 'var(--rd)' : tankWarn ? 'var(--am)' : 'var(--gl)',
            }} />
            {[25, 50, 75].map(m => (
              <div key={m} className={styles.tankMark} style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className={styles.tankPct}>{tankPct}%</div>
        </div>
      </div>

      {showRefill && (
        <div className={styles.refillModal}>
          <div className={styles.refillModalHead}>
            <span>⛽ Log Tank Refill</span>
            <button className={styles.refillClose} onClick={() => setShowRefill(false)}>×</button>
          </div>
          <div className={styles.refillCurrent}>
            Current: <strong>{tankCurrentKg.toFixed(0)} kg</strong> / {tankCapacityKg.toFixed(0)} kg
          </div>
          <div className={styles.refillFields}>
            <div className={styles.refillField}>
              <label>Gas Added (kg)</label>
              <input className={styles.refillInp} type="number" min="1" max={tankCapacityKg - tankCurrentKg} placeholder={`Max ${(tankCapacityKg - tankCurrentKg).toFixed(0)} kg`} value={refillKg} onChange={e => { setRefillKg(e.target.value); setRefillErr('') }} autoFocus />
            </div>
            <div className={styles.refillField}>
              <label>Note (optional)</label>
              <input className={styles.refillInp} type="text" placeholder="e.g. NNPC delivery" value={refillNote} onChange={e => setRefillNote(e.target.value)} />
            </div>
          </div>
          {refillKg && !isNaN(parseFloat(refillKg)) && (
            <div className={styles.refillPreview}>
              After refill: <strong>{Math.min(tankCurrentKg + parseFloat(refillKg), tankCapacityKg).toFixed(0)} kg</strong>
              {' '}({Math.min(100, Math.round(((tankCurrentKg + parseFloat(refillKg)) / tankCapacityKg) * 100))}%)
            </div>
          )}
          {refillErr && <div className={styles.refillErr}>{refillErr}</div>}
          {refillOk  && <div className={styles.refillOk}>{refillOk}</div>}
          <div className={styles.refillBtns}>
            <button className={styles.refillSubmit} onClick={submitRefill} disabled={refillLoading}>
              {refillLoading ? 'Saving…' : 'Confirm Refill'}
            </button>
            <button className={styles.refillCancel} onClick={() => setShowRefill(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Revenue Today</div>
          <div className={styles.kpiVal}>{fmt(dash.rev)}</div>
          <div className={styles.kpiSub}>Target: {fmt(dash.dailyTarget)}</div>
          <div className={styles.kpiProg}><div style={{ width: `${dash.pct}%`, background: dash.pct >= 80 ? 'var(--gl)' : dash.pct >= 40 ? 'var(--am)' : 'var(--rd)', height: '100%', borderRadius: 3 }} /></div>
          <div className={styles.kpiPct}>{dash.pct}% of target</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>KG Dispensed</div>
          <div className={styles.kpiVal}>{dash.kg.toFixed(1)} kg</div>
          <div className={styles.kpiSub}>Today</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Transactions</div>
          <div className={styles.kpiVal}>{dash.count}</div>
          <div className={styles.kpiSub}>{dash.linked} linked · {dash.count - dash.linked} walk-in</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Hourly Revenue</div>
          <div className={styles.hourlyWrap}>
            {hours.map((v, i) => (
              <div key={i} className={styles.hourlyCol}>
                <div className={styles.hourlyBar} style={{ height: v > 0 ? `${Math.max((v / maxH) * 80, 0)}px` : '0px', background: v === Math.max(...hours) ? 'var(--g)' : 'var(--gp)', borderTop: v > 0 ? '2px solid var(--gm)' : 'none' }} />
                <span className={styles.hourlyLbl}>{6 + i}h</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Payment Mix</div>
          {([['Cash','CASH','var(--g)'],['Transfer','TRANSFER','var(--am)'],['POS Card','POS_TERMINAL','#1a73e8']] as const).map(([lbl, key, col]) => (
            <div key={key} className={styles.payRow}>
              <div className={styles.payTop}><span>{lbl}</span><span style={{ color: col, fontFamily: 'var(--fn),sans-serif', fontWeight: 700 }}>{Math.round((payTotals[key] / payTotal) * 100)}%</span></div>
              <div className={styles.payBar}><div style={{ width: `${(payTotals[key] / payTotal) * 100}%`, background: col, height: '100%', borderRadius: 3, transition: 'width .5s ease' }} /></div>
            </div>
          ))}
          <div className={styles.targetRow}>
            <div className={styles.payTop}><span>Daily Target</span><span style={{ fontWeight: 700 }}>{dash.pct}%</span></div>
            <div className={styles.payBar}><div style={{ width: `${dash.pct}%`, background: dash.pct >= 80 ? 'var(--gl)' : dash.pct >= 40 ? 'var(--am)' : 'var(--rd)', height: '100%', borderRadius: 3, transition: 'width .5s ease' }} /></div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Today's Transactions <span className={styles.txCount}>{txs.length}</span></div>
        {txs.length === 0 ? <div className={styles.emptyState}>No transactions yet today</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.tbl}>
              <thead><tr><th>Time</th><th>Amount (₦)</th><th>KG</th><th>Cyl. Size</th><th>Payment</th><th>Customer</th></tr></thead>
              <tbody>
                {txs.slice(0, 30).map((t: any, i: number) => (
                  <tr key={t.id} className={i % 2 ? styles.alt : ''}>
                    <td className={styles.mono}>{fmtT(t.createdAt)}</td>
                    <td className={styles.money}>{fmt(t.naira)}</td>
                    <td className={styles.mono}>{fmtKg(t.kg)}</td>
                    <td><span className={styles.badge}>{t.cylinderSize}kg</span></td>
                    <td>{t.paymentMethod?.replace('_', ' ')}</td>
                    <td>{t.cylinderId ? <span className={styles.cylId}>{t.cylinderId}</span> : <span className={styles.anon}>Walk-in</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}