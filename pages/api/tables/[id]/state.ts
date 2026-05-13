import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../../lib/mongo'
import redis from '../../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (req.method !== 'POST') return res.status(405).end()
  const { status, participantNumber } = req.body
  if (!status) return res.status(400).json({ error: 'missing status' })

  const db = await getDb()
  const tableId = Number(id)
  await db.collection('tables').updateOne({ id: tableId }, { $set: { status, lastStatusChange: new Date() } }, { upsert: true })

  // if queued and participantNumber provided, push to redis
  if (status === 'queued' && participantNumber) {
    await redis.rpush('bathroom_queue', String(participantNumber))
    await db.collection('audit').insertOne({ type: 'join', participantNumber, tableId, ts: new Date() })
  }

  await db.collection('audit').insertOne({ type: 'state-change', tableId, status, participantNumber, ts: new Date() })

  res.json({ ok: true })
}
