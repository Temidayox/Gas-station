'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

const DEMOS = [
  { label: 'Admin',      email: 'admin@gasstation.ng',   pw: 'Admin@2026',  col: '#0f5c2e' },
  { label: 'Outlet 1',   email: 'outlet1@gasstation.ng', pw: 'Outlet1@26',  col: '#1a7a3f' },
  { label: 'Outlet 2',   email: 'outlet2@gasstation.ng', pw: 'Outlet2@26',  col: '#1a7a3f' },
  { label: 'Customer A', email: 'demo.a@gasstation.ng',  pw: 'Demo@001',    col: '#c98700' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [picked, setPicked]     = useState('')

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Wrong email or password. Try a demo account below.')
      setLoading(false)
    }
  }

  function useDemo(d: typeof DEMOS[0]) {
    setPicked(d.label)
    setEmail(d.email)
    setPassword(d.pw)
    setError('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bg} aria-hidden>
        {[300,500,700,900,1100,1300].map(s => (
          <div key={s} className={styles.ring} style={{ width: s, height: s }} />
        ))}
        <div className={styles.glow} />
      </div>

      <div className={`${styles.left} fade-up`}>
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}><FlameIcon /></div>
          <div>
            <div className={styles.brand}>GAS STATION</div>
            <div className={styles.brandSub}>Nigeria</div>
          </div>
        </div>
        <h1 className={styles.headline}>LPG Retail<br/>Management<br/>Platform</h1>
        <p className={styles.desc}>Real-time POS, outlet dashboards, and customer cylinder tracking — built for Nigeria.</p>
        <div className={styles.stats}>
          {[['4','Outlets'],['₦/kg','Live Rates'],['360°','Tracking']].map(([v,l]) => (
            <div key={l}>
              <div className={styles.statVal}>{v}</div>
              <div className={styles.statLbl}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.right} fade-in`} style={{ animationDelay: '100ms' }}>
        <h2 className={styles.formTitle}>Sign In</h2>
        <p className={styles.formSub}>Access your dashboard or customer profile</p>

        {error && (
          <div className={styles.errBox} role="alert">
            <AlertIcon /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gasstation.ng" autoComplete="email" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div className={styles.divider}><hr/><span>or use a demo</span><hr/></div>

        <div className={styles.demoGrid}>
          {DEMOS.map(d => (
            <button key={d.label} onClick={() => useDemo(d)}
              className={`${styles.demoBtn} ${picked === d.label ? styles.demoPicked : ''}`}>
              <span className={styles.demoRole} style={{ color: d.col }}>{d.label}</span>
              <span className={styles.demoEmail}>{d.email}</span>
            </button>
          ))}
        </div>

        <p className={styles.registerLink}>
          New customer? <Link href="/register">Create a free profile →</Link>
        </p>
      </div>
    </div>
  )
}

function FlameIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d1f12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-1.5-.5-3-1.5-4.5 0 0-1 2-2.5 2C11.5 7 12 2 12 2z"/></svg>
}
function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
}
