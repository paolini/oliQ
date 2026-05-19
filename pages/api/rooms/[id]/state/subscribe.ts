import { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../../../lib/redis'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const roomId = Array.isArray(id) ? id[0] : id
  if (req.method !== 'GET') return res.status(405).end()

  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })
  res.write('\n')

  const channel = roomId ? `state:room:${roomId}` : 'state:all'
  const sub = redis.duplicate()

  // subscribe and forward messages
  await sub.subscribe(channel)

  const onMessage = (_chan: string, message: string) => {
    try {
      res.write(`data: ${message}\n\n`)
    } catch (e) {
      // ignore
    }
  }

  sub.on('message', onMessage)

  req.on('close', async () => {
    try {
      sub.off('message', onMessage)
      await sub.unsubscribe(channel)
      try { await sub.quit() } catch { sub.disconnect() }
    } catch (e) {
      // ignore
    }
  })
}
