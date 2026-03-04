export const fmt = (n: number | undefined | null) => {
  if (n === undefined || n === null || isNaN(n)) return '₦0'
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

export const fmtKg = (n: number | undefined | null) => {
  if (n === undefined || n === null || isNaN(Number(n))) return '0.0 kg'
  return `${parseFloat(String(n)).toFixed(2)} kg`
}

export const fmtD = (d: Date | string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const fmtT = (d: Date | string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

export const fmtDT = (d: Date | string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function isToday(d: Date | string) {
  return new Date(d).toDateString() === new Date().toDateString()
}

export function startOfDay(d: Date) {
  const s = new Date(d); s.setHours(0,0,0,0); return s
}

export function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

// Format large numbers as ₦120k, ₦1.2M etc
export function fmtCompact(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`
  return fmt(n)
}
