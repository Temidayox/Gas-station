import PusherServer from 'pusher'

let pusherServerInstance: PusherServer | null = null

export function getPusherServer(): PusherServer | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return null // Pusher not configured — real-time disabled in local mode
  }
  if (!pusherServerInstance) {
    pusherServerInstance = new PusherServer({
      appId:   process.env.PUSHER_APP_ID,
      key:     process.env.PUSHER_KEY,
      secret:  process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER ?? 'mt1',
      useTLS:  true,
    })
  }
  return pusherServerInstance
}
