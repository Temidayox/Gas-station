'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'
import styles from './Sidebar.module.css'

type NavItem = { href: string; icon: string; label: string }

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard',    icon: 'grid',  label: 'Dashboard' },
  { href: '/outlets',      icon: 'map',   label: 'Outlets' },
  { href: '/transactions', icon: 'list',  label: 'Transactions' },
  { href: '/customers',    icon: 'users', label: 'Customers' },
  { href: '/stickers',     icon: 'tag',   label: 'Stickers' },
  { href: '/settings',     icon: 'cog',   label: 'Settings' },
]
const OUTLET_NAV: NavItem[] = [
  { href: '/pos',          icon: 'pos',   label: 'POS Terminal' },
  { href: '/outlet-dash',  icon: 'grid',  label: 'My Dashboard' },
  { href: '/transactions', icon: 'list',  label: 'Transactions' },
]
const CUSTOMER_NAV: NavItem[] = [
  { href: '/profile',      icon: 'user',  label: 'My Profile' },
]

const PATHS: Record<string, string> = {
  grid:  'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  map:   'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a1 1 0 110-2 1 1 0 010 2z',
  list:  'M9 18h12M9 12h12M9 6h12M4 18h.01M4 12h.01M4 6h.01',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  tag:   'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  cog:   'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  pos:   'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 2H8L6 7h12l-2-5zM12 12v4M10 14h4',
  user:  'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
}

function Ic({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  const links = user?.role === 'ADMIN' ? ADMIN_NAV : user?.role === 'OUTLET_STAFF' ? OUTLET_NAV : CUSTOMER_NAV
  const initials = (user?.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'OUTLET_STAFF' ? `Outlet ${user?.outletId ?? ''} Staff` : 'Customer'

  return (
    <>
      {/* Hamburger — mobile only */}
      <button className={styles.hamburger} onClick={() => setOpen(o => !o)} aria-label="Menu">
        <span style={{ transform: open ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
        <span style={{ opacity: open ? 0 : 1 }} />
        <span style={{ transform: open ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
      </button>

      {/* Overlay — mobile only */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${styles.sb} ${open ? styles.sbOpen : ''}`}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-1.5-.5-3-1.5-4.5 0 0-1 2-2.5 2C11.5 7 12 2 12 2z"/>
            </svg>
          </div>
          <div>
            <div className={styles.brand}>GAS STATION</div>
            <div className={styles.brandSub}>Nigeria LPG</div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className={styles.themeSection}>
          <ThemeToggle />
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'OUTLET_STAFF') && (
          <div className={styles.liveBadge}>
            <span className="pulse-dot" />
            Live Platform
          </div>
        )}

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {links.map(l => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
              return (
                <Link key={l.href} href={l.href} className={`${styles.navLink} ${active ? styles.active : ''}`}>
                  <span className={styles.navIcon}><Ic d={PATHS[l.icon] ?? ''} /></span>
                  {l.label}
                  {active && <span className={styles.activePip} />}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className={styles.bottom}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name ?? 'User'}</div>
              <div className={styles.userRole}>{roleLabel}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/login' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
