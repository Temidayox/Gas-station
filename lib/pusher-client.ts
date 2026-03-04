'use client'
import PusherClient from 'pusher-js'

let pusherClientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  if (!key) return null // Pusher not configured
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1',
    })
  }
  return pusherClientInstance
}
