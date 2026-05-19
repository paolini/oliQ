import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/mongo'
import { ObjectId } from 'mongodb'
import { withMorgan } from '../../../lib/morganWrapper'

type Data = { ok: boolean, room?: any, error?: string }

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  res.setHeader('Content-Type', 'application/json')
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ ok: false, error: 'missing id' })
  let db
  try { db = await getDb() } catch (err:any) { console.error(err); return res.status(500).json({ ok: false, error: 'db error' }) }
  const col = db.collection('rooms')
  try {
    if (req.method === 'GET') {
      const room = await col.findOne({ _id: new ObjectId(String(id)) })
      return res.status(200).json({ ok: true, room })
    }

    if (req.method === 'PUT') {
      const body = req.body
      const update: any = {}
      if (typeof body.title === 'string') update.title = body.title
      if (typeof body.width === 'number') update.width = body.width
      if (typeof body.height === 'number') update.height = body.height
      if (Object.keys(update).length === 0) return res.status(400).json({ ok: false, error: 'no update fields' })
      await col.updateOne({ _id: new ObjectId(String(id)) }, { $set: update })
      const updated = await col.findOne({ _id: new ObjectId(String(id)) })
      return res.status(200).json({ ok: true, room: updated })
    }

    if (req.method === 'DELETE') {
      await col.deleteOne({ _id: new ObjectId(String(id)) })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (err:any) { console.error('rooms/[id] error', err); return res.status(500).json({ ok: false, error: err.message || 'internal' }) }
}

export default withMorgan(handler)
