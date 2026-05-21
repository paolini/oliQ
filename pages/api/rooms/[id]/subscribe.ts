import { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../../lib/redis'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id !== 'string') return res.status(400).json({ error: 'invalid id' })
  const roomId = req.query.id as string
  if (req.method !== 'GET') return res.status(405).end()

  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })
  res.write('\n')

  const channel = `room:${roomId}`
  const sub = redis.duplicate()

  // subscribe and forward messages
  await sub.subscribe(channel)

  const onMessage = (_chan: string, message: string) => {
    console.log(`Publishing message to client for room ${roomId}:`, message)
    try {
      res.write(`data: ${message}\n\n`)
    } catch {
      // ignore
    }
  }

  sub.on('message', onMessage)

  req.on('close', async () => {
    try {
      sub.off('message', onMessage)
      await sub.unsubscribe(channel)
      try { await sub.quit() } catch { sub.disconnect() }
    } catch {
      // ignore
    }
  })
}
