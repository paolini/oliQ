import { NextApiRequest, NextApiResponse } from 'next'
import { getMongoClient } from '../../../../lib/mongo'
import { ObjectId } from 'mongodb'
import redis from '../../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const roomId = Array.isArray(id) ? id[0] : id

  if (req.method === 'POST') {
    const body = req.body || {}
    const { type, participantNumber, details } = body
    if (!type) return res.status(400).json({ error: 'type required' })
    try {
      const client = await getMongoClient()
      const db = client.db()
        const doc: any = { ts: new Date(), event: type, participantNumber: typeof participantNumber === 'number' ? participantNumber : undefined, details: details || null }
        if (roomId) {
          try { doc.roomId = new ObjectId(roomId) } catch { doc.roomId = roomId }
        }
      await db.collection('events').insertOne(doc)
      try {
        await redis.publish('events:all', JSON.stringify({ type: 'events:append', event: { ts: doc.ts, event: doc.event, participantNumber: doc.participantNumber, roomId } }))
      } catch (e) { console.error('Redis publish failed', e) }
      try { await redis.publish('state:invalidate', JSON.stringify({ ts: new Date().toISOString(), roomId })) } catch (e) {}
      return res.status(201).json({ ok: true, event: doc })
    } catch (err:any) {
      console.error('POST /api/rooms/[id]/events error', err)
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  if (req.method === 'GET') {
    try {
      const client = await getMongoClient()
      const db = client.db()
      const q: any = {}
      const { participantNumber, type, since, until } = req.query
      if (participantNumber) q.participantNumber = Number(participantNumber)
      if (type) q.event = String(type)
      if (since || until) q.ts = {}
      if (since) q.ts.$gte = new Date(String(since))
      if (until) q.ts.$lte = new Date(String(until))
      if (roomId) {
        try { q.roomId = { $eq: new ObjectId(String(roomId)) } } catch { q.roomId = String(roomId) }
      }
      const docs = await db.collection('events').find(q).sort({ ts: -1 }).limit(100).toArray()
      return res.status(200).json({ events: docs })
    } catch (err:any) {
      console.error('GET /api/rooms/[id]/events error', err)
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  res.status(405).end('Method not allowed')
}
