import type { Metadata } from 'next'
import { Syne, DM_Sans, Figtree, Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const syne = Syne({ subsets: ['latin'], weight: ['400','600','700','800'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600'], variable: '--font-body' })
const figtree = Figtree({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-label' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-num' })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Gas Station — Nigeria LPG Platform',
  description: 'Real-time LPG retail management, POS, and customer cylinder tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} ${figtree.variable} ${jakarta.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
