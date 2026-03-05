'use client'
import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getPusherClient } from '@/lib/pusher-client'
import { CHANNELS, EVENTS } from '@/lib/pusher'
import { fmt, fmtKg } from '@/lib/utils'
import styles from './pos.module.css'

const CYL_SIZES = [3, 5, 10, 12.5, 25, 50]
type Step = 'entry' | 'confirm' | 'success'
type PayMethod = 'CASH' | 'TRANSFER' | 'POS_TERMINAL'

export default function POSPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [pricePerKg, setPricePerKg] = useState(1150)
  const [naira, setNaira]           = useState('')
  const [cylSize, setCylSize]       = useState('12.5')
  const [payment, setPayment]       = useState<PayMethod>('CASH')
  const [custId, setCustId]         = useState('')
  const [custName, setCustName]     = useState('')
  const [custErr, setCustErr]       = useState('')
  const [lookingUp, setLookingUp]   = useState(false)
  const [step, setStep]             = useState<Step>('entry')
  const [lastTx, setLastTx]         = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr]   = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [todayRev, setTodayRev]     = useState(0)

  // Smoke balance state
  const [smokeBalance, setSmokeBalance] = useState(0)
  const [useSmoke, setUseSmoke]         = useState(false)

  const lookupTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/price').then(r => r.json()).then(d => setPricePerKg(d.pricePerKg))
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(CHANNELS.PUBLIC)
    ch.bind(EVENTS.PRICE_UPDATE, (d: { pricePerKg: number }) => setPricePerKg(d.pricePerKg))
    ch.bind(EVENTS.NEW_TRANSACTION, (tx: any) => {
      if (tx.outletId === user?.outletId) {
        setTodayCount(c => c + 1)
        setTodayRev(r => r + tx.naira)
      }
    })
    return () => { try { ch.unbind_all(); pusher.unsubscribe(CHANNELS.PUBLIC) } catch {} }
  }, [user?.outletId])

  const nairaNum   = parseFloat(naira) || 0
  const kg         = nairaNum > 0 ? nairaNum / pricePerKg : 0
  const kgDisplay  = kg.toFixed(2)

  // Smoke discount calculations
  const smokeDiscount  = useSmoke ? Math.min(smokeBalance, nairaNum) : 0
  const nairaAfterSmoke = Math.max(0, nairaNum - smokeDiscount)

  // Debounced cylinder lookup
  async function lookupCylinder(id: string) {
    setCustId(id)
    setCustName('')
    setCustErr('')
    setSmokeBalance(0)
    setUseSmoke(false)
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (!id || id.length < 4) return
    setLookingUp(true)
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cylinders/${id.toUpperCase()}`)
        if (res.ok) {
          const cyl = await res.json()
          setCustName(cyl.ownerName ?? 'Registered Customer')
          setSmokeBalance(cyl.smokeBalance ?? 0)
          setCustErr('')
        } else {
          setCustErr('Cylinder not found – sale will be walk-in')
          setSmokeBalance(0)
        }
      } catch {
        setCustErr('Lookup failed')
      } finally {
        setLookingUp(false)
      }
    }, 400)
  }

  async function handleSubmit() {
    setSubmitting(true); setSubmitErr('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naira: nairaNum,
          cylinderSize: parseFloat(cylSize),
          paymentMethod: payment,
          cylinderId: custId?.trim() || null,
          useSmoke,
        }),
      })
      if (res.ok) {
        const tx = await res.json()
        setLastTx(tx)
        setTodayCount(c => c + 1)
        setTodayRev(r => r + (tx.nairaCharged ?? nairaNum))
        setStep('success')
      } else {
        const d = await res.json()
        setSubmitErr(d.error ?? 'Transaction failed – please try again')
        setStep('entry')
      }
    } catch {
      setSubmitErr('Network error – check your connection')
      setStep('entry')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setNaira(''); setCylSize('12.5'); setPayment('CASH')
    setCustId(''); setCustName(''); setCustErr(''); setSubmitErr('')
    setSmokeBalance(0); setUseSmoke(false)
    setStep('entry'); setLastTx(null)
  }

  if (step === 'success') return (
    <div className={styles.successWrap}>
      <div className={`${styles.successCard} fade-up`}>
        <div className={styles.successRing}>
          <div className={styles.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </div>
        <h2 className={styles.successTitle}>Sale Recorded</h2>
        <p className={styles.successSub}>Transaction saved and synced</p>
        <div className={styles.receipt}>
          {([
            ['TX ID',          lastTx?.id?.slice(0,16).toUpperCase()],
            ['Total Bill',     fmt(lastTx?.totalNaira ?? lastTx?.naira)],
            ...(lastTx?.smokeUsed > 0 ? [
              ['🔥 Smoke Used',  `${lastTx.smokeUsed} Smoke (₦${lastTx.smokeUsed})`],
              ['Naira Charged', fmt(lastTx?.nairaCharged)],
            ] : []),
            ['Gas Dispensed',  fmtKg(lastTx?.kg)],
            ['Rate Used',      `${fmt(pricePerKg)}/kg`],
            ['Cylinder Size',  `${lastTx?.cylinderSize} kg`],
            ['Payment',        lastTx?.paymentMethod?.replace('_',' ')],
            ['Customer',       lastTx?.cylinder?.owner?.name ?? 'Walk-in'],
            ['Outlet',         lastTx?.outlet?.name],
          ] as [string,string][]).map(([l,v]) => (
            <div key={l} className={styles.receiptRow}>
              <span className={styles.receiptLabel}>{l}</span>
              <span className={styles.receiptVal}>{v}</span>
            </div>
          ))}
        </div>
        <div className={styles.successBtns}>
          <button className={styles.newBtn} onClick={reset}>New Transaction</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.title}>POS Terminal</h1>
          <div className={styles.sub}>
            Outlet {user?.outletId ?? '–'}
            <span className={styles.subDot}>·</span>
            <span className={styles.liveRate}>{fmt(pricePerKg)}/kg</span>
            <span className={styles.subDot}>·</span>
            <span className="pulse-dot" /> Live
          </div>
        </div>
        {(todayCount > 0 || todayRev > 0) && (
          <div className={styles.sessionStats}>
            <div className={styles.statItem}><span>{todayCount}</span> sales this session</div>
            <div className={styles.statItem}><span>{fmt(todayRev)}</span> revenue</div>
          </div>
        )}
      </div>

      {submitErr && (
        <div className={styles.errorBanner} role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {submitErr}
          <button onClick={() => setSubmitErr('')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:16,lineHeight:1}}>×</button>
        </div>
      )}

      <div className={styles.grid}>
        {/* Left: Form */}
        <div className={styles.formCard}>
          <div className={styles.formSection}>
            <div className={styles.sectionLabel}>Amount Paid</div>
            <div className={styles.amountWrap}>
              <span className={styles.nairaPrefix}>₦</span>
              <input
                className={styles.amountInp}
                type="number" min="0" step="100"
                placeholder="0"
                value={naira}
                onChange={e => setNaira(e.target.value)}
                autoFocus
              />
            </div>
            {nairaNum > 0 && (
              <div className={`${styles.kgPreview} fade-in`}>
                <div>
                  <div className={styles.kgPreviewLabel}>Gas to dispense</div>
                  <div className={styles.kgPreviewSub}>at {fmt(pricePerKg)}/kg</div>
                </div>
                <div className={styles.kgPreviewVal}>{kgDisplay} kg</div>
              </div>
            )}
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionLabel}>Cylinder Size</div>
            <div className={styles.cylGrid}>
              {CYL_SIZES.map(s => (
                <button key={s} onClick={() => setCylSize(String(s))}
                  className={`${styles.cylOpt} ${cylSize === String(s) ? styles.cylSelected : ''}`}>
                  {s} kg
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionLabel}>Payment Method</div>
            <div className={styles.payGrid}>
              {(['CASH','TRANSFER','POS_TERMINAL'] as PayMethod[]).map(p => (
                <button key={p} onClick={() => setPayment(p)}
                  className={`${styles.payOpt} ${payment === p ? styles.paySelected : ''}`}>
                  <PayIcon method={p} active={payment === p} />
                  <span>{p === 'POS_TERMINAL' ? 'POS Card' : p === 'TRANSFER' ? 'Transfer' : 'Cash'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionLabel}>
              Cylinder ID
              <span className={styles.optionalTag}>Optional</span>
            </div>
            <div className={styles.cylLookupWrap}>
              <input
                className={styles.cylInp}
                type="text"
                placeholder="e.g. GS00001"
                value={custId}
                onChange={e => lookupCylinder(e.target.value)}
                style={{ textTransform: 'uppercase' }}
              />
              {lookingUp && <div className={styles.lookupSpinner}><div className="spinner" style={{width:16,height:16,borderWidth:2}}/></div>}
            </div>
            {custName && !lookingUp && (
              <div className={`${styles.custFound} fade-in`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                {custName}
              </div>
            )}
            {custErr && !lookingUp && (
              <div className={styles.custWarn}>{custErr}</div>
            )}
          </div>

          {/* Smoke Balance Toggle — only shown if customer has smoke */}
          {custName && smokeBalance > 0 && nairaNum > 0 && (
            <div className={styles.formSection}>
              <div style={{
                background: useSmoke ? 'rgba(255,140,0,0.08)' : 'var(--bg2)',
                border: `1.5px solid ${useSmoke ? '#FF8C00' : 'var(--bdr)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useSmoke ? 10 : 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#FF8C00', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔥 Smoke Balance: {smokeBalance.toLocaleString()} Smoke
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--inks)', marginTop: 2 }}>
                      Worth ₦{smokeBalance.toLocaleString()} in discounts
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => setUseSmoke(v => !v)}
                    style={{
                      width: 44, height: 24,
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: useSmoke ? '#FF8C00' : 'var(--bdr)',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3, left: useSmoke ? 23 : 3,
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                {useSmoke && (
                  <div style={{ borderTop: '1px solid rgba(255,140,0,0.2)', paddingTop: 10 }} className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--inks)' }}>Total bill</span>
                      <span style={{ fontWeight: 600 }}>{fmt(nairaNum)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#FF8C00' }}>🔥 Smoke discount</span>
                      <span style={{ fontWeight: 700, color: '#FF8C00' }}>− {fmt(smokeDiscount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid rgba(255,140,0,0.2)', paddingTop: 6, marginTop: 4 }}>
                      <span style={{ fontWeight: 700 }}>Naira to collect</span>
                      <span style={{ fontWeight: 800, color: nairaAfterSmoke === 0 ? 'var(--g)' : 'var(--ink)', fontSize: 15 }}>
                        {nairaAfterSmoke === 0 ? '✓ FREE' : fmt(nairaAfterSmoke)}
                      </span>
                    </div>
                    {nairaAfterSmoke === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--g)', marginTop: 6, textAlign: 'center' }}>
                        Fully covered by Smoke balance!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            className={styles.reviewBtn}
            disabled={nairaNum < 100}
            onClick={() => setStep('confirm')}
          >
            Review & Confirm →
          </button>
        </div>

        {/* Right: Preview + Confirm */}
        <div className={styles.sidePanel}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>Transaction Preview</div>
            {nairaNum > 0 ? (
              <div className="fade-in">
                <div className={styles.previewAmt}>{fmt(nairaNum)}</div>
                <div className={styles.previewKg}>{kgDisplay} kg of gas</div>
                <div className={styles.previewDivider}/>
                {[
                  ['Cylinder', `${cylSize} kg`],
                  ['Payment',  payment === 'POS_TERMINAL' ? 'POS Card' : payment === 'TRANSFER' ? 'Bank Transfer' : 'Cash'],
                  ['Customer', custName || 'Walk-in'],
                  ...(useSmoke && smokeDiscount > 0 ? [
                    ['🔥 Smoke Off', `− ${fmt(smokeDiscount)}`],
                    ['Collect',     nairaAfterSmoke === 0 ? '₦0 (FREE)' : fmt(nairaAfterSmoke)],
                  ] : []),
                ].map(([l,v]) => (
                  <div key={l} className={styles.previewRow}>
                    <span className={styles.previewRowLabel}>{l}</span>
                    <span className={styles.previewRowVal}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.previewEmpty}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--bdrm)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-1.5-.5-3-1.5-4.5 0 0-1 2-2.5 2C11.5 7 12 2 12 2z"/></svg>
                Enter an amount to preview
              </div>
            )}
          </div>

          {step === 'confirm' && (
            <div className={`${styles.confirmCard} slide-down`}>
              <div className={styles.confirmHead}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                Confirm Sale
              </div>
              <p className={styles.confirmText}>
                Dispense <strong>{fmtKg(kg)}</strong> for <strong>{fmt(nairaNum)}</strong>
                {useSmoke && smokeDiscount > 0 && (
                  <> · <span style={{color:'#FF8C00'}}>🔥 {smokeDiscount} Smoke used</span> · Collect <strong>{nairaAfterSmoke === 0 ? '₦0' : fmt(nairaAfterSmoke)}</strong></>
                )}
                {custName && <> · Customer: <strong>{custName}</strong></>}
              </p>
              <div className={styles.confirmBtns}>
                <button className={styles.confirmBtn} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <><div className="spinner" style={{width:14,height:14,borderWidth:2}} /> Saving…</>
                  ) : '✓ Confirm'}
                </button>
                <button className={styles.editBtn} onClick={() => setStep('entry')}>Edit</button>
              </div>
            </div>
          )}

          <div className={styles.rateCard}>
            <div className={styles.rateCardLabel}>Current Gas Rate</div>
            <div className={styles.rateCardVal}>{fmt(pricePerKg)}<span>/kg</span></div>
            <div className={styles.rateCardSub}>Updates live across all terminals</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayIcon({ method, active }: { method: string; active: boolean }) {
  const col = active ? 'currentColor' : 'var(--inks)'
  const paths: Record<string,string> = {
    CASH:         'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    TRANSFER:     'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    POS_TERMINAL: 'M20 7H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM2 11h20',
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      <path d={paths[method] ?? ''} />
    </svg>
  )
}
