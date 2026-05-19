import type { NextApiRequest, NextApiResponse } from 'next'
import Redis from 'ioredis'

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).end('missing room id')
  const roomId = id as string

  // set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')

  const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  const channel = `tables:room:${roomId}`

  const onMessage = (channelReceived: string, message: string) => {
    try {
      res.write(`data: ${message}\n\n`)
    } catch (e) {
      // ignore
    }
  }

  sub.subscribe(channel, (err) => {
    if (err) {
      console.error('failed to subscribe to', channel, err)
      res.write(`data: ${JSON.stringify({ error: 'subscribe_failed' })}\n\n`)
    }
  })

  sub.on('message', onMessage)

  // keep the connection alive
  const keepAlive = setInterval(() => res.write(':\n\n'), 20000)

  req.on('close', () => {
    clearInterval(keepAlive)
    try { sub.removeListener('message', onMessage) } catch (e) {}
    try { sub.quit() } catch (e) {}
  })
}
