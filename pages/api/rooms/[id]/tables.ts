import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../../lib/mongo'
import { ObjectId } from 'mongodb'
import { withMorgan } from '../../../../lib/morganWrapper'
import redis from '../../../../lib/redis'

type Data = { ok: boolean; tables?: any[]; error?: string }

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  res.setHeader('Content-Type', 'application/json')
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ ok: false, error: 'missing room id' })

  let db
  try { db = await getDb() } catch (err:any) { console.error('mongo connect', err); return res.status(500).json({ ok: false, error: 'failed to connect to database' }) }
  const col = db.collection('tables')

  try {
    if (req.method === 'GET') {
      const q: any = {}
      try { q.roomId = { $eq: new ObjectId(id) } } catch { q.roomId = id }
      console.log('GET /api/rooms/[id]/tables - query:', JSON.stringify(q))
      const docs = await col.find(q).toArray()
      console.log('GET /api/rooms/[id]/tables - found', docs.length, 'tables')
      return res.status(200).json({ ok: true, tables: docs })
    }

    if (req.method === 'POST') {
      const payload = req.body
      if (!Array.isArray(payload)) return res.status(400).json({ ok: false, error: 'expected an array of tables' })
      if (payload.length > 0) {
        const valid = payload.every((t:any) => typeof t.x === 'number' 
          && typeof t.y === 'number' 
          && (t.shape === 'square' || t.shape === 'circle') 
          && Array.isArray(t.participant_ids)
          && t.participant_ids.every((pid:any) => typeof pid === 'string')
        )
        if (!valid) return res.status(400).json({ ok: false, error: 'invalid table format' })
      }

      // delete only tables for this room
      try { await col.deleteMany({ roomId: new ObjectId(id) }) } catch { await col.deleteMany({ roomId: id }) }

      if (payload.length === 0) return res.status(201).json({ ok: true, tables: [] })

      // ensure each inserted doc has roomId set as ObjectId when possible
      const docsToInsert = payload.map((t:any) => ({ ...t, roomId: (() => { try { return new ObjectId(id) } catch { return id } })() }))
      await col.insertMany(docsToInsert)
      // publish update for this room so clients can reload
      try {
        const payload = JSON.stringify({ type: 'tables:replace', roomId: id, count: docsToInsert.length })
        await redis.publish(`room:${id}`, payload)
      } catch (e) { console.error('redis publish room tables failed', e) }
      const docs = await col.find({ roomId: docsToInsert[0].roomId }).toArray()
      return res.status(201).json({ ok: true, tables: docs })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (err:any) {
    console.error('rooms/[id]/tables api error', err)
    return res.status(500).json({ ok: false, error: err.message || 'internal error' })
  }
}

export default withMorgan(handler)
