import type { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../lib/redis'
import { getDb } from '../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { participantNumber, tableId } = req.body
  if (!participantNumber || !tableId) return res.status(400).json({ error: 'missing fields' })

  // push to Redis queue (right side = tail)
  await redis.rpush('bathroom_queue', String(participantNumber))

  // persist audit
  const db = await getDb()
  await db.collection('audit').insertOne({ type: 'join', participantNumber, tableId, ts: new Date() })

  res.json({ ok: true })
}
