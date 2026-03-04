'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './register.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep]     = useState(1)
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [cylId, setCylId]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true); setError('')
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password, cylinderId: cylId || null }),
    })
    if (res.ok) {
      setStep(3)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.card} fade-up`}>
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-1.5-.5-3-1.5-4.5 0 0-1 2-2.5 2C11.5 7 12 2 12 2z"/></svg>
          </div>
          <span className={styles.brand}>GAS STATION</span>
        </div>

        {/* Progress */}
        <div className={styles.progress}>
          {[1,2,3].map(n => <div key={n} className={`${styles.progStep} ${n <= step ? styles.progActive : ''}`} />)}
        </div>

        {step === 1 && (
          <>
            <h2 className={styles.stepTitle}>Create Your Profile</h2>
            <p className={styles.stepSub}>Track your gas refills and spending for free.</p>
            {error && <div className={styles.err}>{error}</div>}
            <div className={styles.fields}>
              <div className={styles.field}><label>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Adaeze Okonkwo" /></div>
              <div className={styles.field}><label>Phone Number *</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08012345678" /></div>
              <div className={styles.field}><label>Email (Optional)</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
              <div className={styles.field}><label>Create Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" /></div>
              <button className={styles.nextBtn} disabled={!name || !phone || !password || password.length < 6} onClick={() => setStep(2)}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className={styles.stepTitle}>Link Your Cylinder</h2>
            <p className={styles.stepSub}>Enter the Cylinder ID from the sticker on your gas cylinder.</p>
            <div className={styles.stickerNote}>
              <strong>Where is the sticker?</strong> A waterproof label on the side of your cylinder. The ID looks like <strong className={styles.mono}>GS00000</strong>.
            </div>
            <div className={styles.fields}>
              <div className={styles.field}><label>Cylinder ID</label><input value={cylId} onChange={e => setCylId(e.target.value.toUpperCase())} placeholder="e.g. GS00001" style={{ textTransform: 'uppercase' }} /></div>
              <button className={styles.nextBtn} disabled={loading} onClick={handleSubmit}>{loading ? 'Creating account…' : 'Create Account →'}</button>
              <button className={styles.skipBtn} onClick={handleSubmit}>Skip for now (link later)</button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2 className={styles.stepTitle}>You're all set, {name.split(' ')[0]}!</h2>
            <p className={styles.stepSub}>Your profile is ready. Every time you refill at a Gas Station outlet, ask staff to enter your Cylinder ID and your history updates automatically.</p>
            <button className={styles.nextBtn} onClick={() => router.push('/login')}>Sign In to My Profile →</button>
          </div>
        )}

        <Link href="/login" className={styles.backLink}>← Back to Sign In</Link>
      </div>
    </div>
  )
}
