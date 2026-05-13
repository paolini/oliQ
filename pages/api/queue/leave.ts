import type { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../lib/redis'
import { getDb } from '../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { participantNumber } = req.body
  if (!participantNumber) return res.status(400).json({ error: 'missing participantNumber' })

  // remove all occurrences of participantNumber from the list
  await redis.lrem('bathroom_queue', 0, String(participantNumber))

  const db = await getDb()
  await db.collection('audit').insertOne({ type: 'leave', participantNumber, ts: new Date() })

  res.json({ ok: true })
}
