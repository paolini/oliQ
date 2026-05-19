import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongo'
import { ObjectId } from 'mongodb'
import { withMorgan } from '../../lib/morganWrapper'

type RoomDoc = { _id?: any, title: string, width: number, height: number }
type Data = { ok: boolean, rooms?: RoomDoc[] | RoomDoc, error?: string }

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  res.setHeader('Content-Type', 'application/json')
  let db
  try { db = await getDb() } catch (err: any) { console.error(err); return res.status(500).json({ ok: false, error: 'db error' }) }
  const col = db.collection('rooms')
  try {
    if (req.method === 'GET') {
      const docs = await col.find().toArray() as RoomDoc[]
      return res.status(200).json({ ok: true, rooms: docs })
    }

    if (req.method === 'POST') {
      const body = req.body
      if (!body || typeof body.title !== 'string' || typeof body.width !== 'number' || typeof body.height !== 'number') {
        return res.status(400).json({ ok: false, error: 'invalid room body' })
      }
      const doc = { title: body.title, width: body.width, height: body.height }
      const r = await col.insertOne(doc)
      const created = await col.findOne({ _id: r.insertedId }) as RoomDoc
      return res.status(201).json({ ok: true, rooms: created })
    }

    // /api/rooms?id=...
    if (req.method === 'PUT') {
      const id = req.query.id as string
      if (!id) return res.status(400).json({ ok: false, error: 'missing id' })
      const body = req.body
      const update: any = {}
      if (typeof body.title === 'string') update.title = body.title
      if (typeof body.width === 'number') update.width = body.width
      if (typeof body.height === 'number') update.height = body.height
      if (Object.keys(update).length === 0) return res.status(400).json({ ok: false, error: 'no update fields' })
      await col.updateOne({ _id: new ObjectId(id) }, { $set: update })
      const updated = await col.findOne({ _id: new ObjectId(id) }) as RoomDoc
      return res.status(200).json({ ok: true, rooms: updated })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string
      if (!id) return res.status(400).json({ ok: false, error: 'missing id' })
      await col.deleteOne({ _id: new ObjectId(id) })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  } catch (err: any) {
    console.error('rooms api error', err)
    return res.status(500).json({ ok: false, error: err.message || 'internal' })
  }
}

export default withMorgan(handler)
