import { NextApiRequest, NextApiResponse } from 'next'
import { getMongoClient } from '../../../../lib/mongo'
import { ObjectId } from 'mongodb'
import redis from '../../../../lib/redis'
import { computeRoomState } from './state'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  let roomId: ObjectId | undefined 
  try {
    roomId = new ObjectId(String(id))
  } catch {
    return res.status(400).json({ error: 'invalid room id' })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const { type, participantNumber } = body
    if (!type) return res.status(400).json({ error: 'type required' })
    try {
      const client = await getMongoClient()
      const db = client.db()
      await db.collection('events').insertOne({
        ts: new Date(),
        event: type,
        participantNumber,
        roomId,
      })

      const state = await computeRoomState(roomId)
      
      try {
        await redis.publish(`state:invalidate:${roomId}`, JSON.stringify({ ts: new Date().toISOString(), roomId, state })) 
      } catch (e) { 
        console.error('Redis publish failed', e) 
      }
      
      return res.status(201).json({ ok: true, state })
    } catch (err:any) {
      console.error('POST /api/rooms/[id]/events error', err)
      return res.status(500).json({ error: String(err?.message || err) })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
