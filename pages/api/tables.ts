import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../lib/mongo'
import { Table } from '../../lib/models/table'
import { withMorgan } from '../../lib/morganWrapper'

type Data = { ok: boolean; tables?: Table[]; error?: string }

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  res.setHeader('Content-Type', 'application/json')

  let db
  try {
    db = await getDb()
  } catch (err: any) {
    console.error('failed to connect to mongo in /api/tables', err)
    return res.status(500).json({ ok: false, error: 'failed to connect to database' })
  }

  const col = db.collection('tables')

  try {
    if (req.method === 'GET') {
      const docs = await col.find().toArray()
      return res.status(200).json({ ok: true, tables: docs })
    }

    if (req.method === 'POST') {
      // Tooling endpoint: replace all tables with provided list
      const payload = req.body
      if (!Array.isArray(payload)) {
        return res.status(400).json({ ok: false, error: 'expected an array of tables' })
      }

      // Validate payload first
      if (payload.length > 0) {
        const valid = payload.every((t) => typeof t.x === 'number' && typeof t.y === 'number' && (t.shape === 'square' || t.shape === 'circle') && Array.isArray(t.participant_ids))
        if (!valid) return res.status(400).json({ ok: false, error: 'invalid table format' })
      }

      // Now replace collection: delete all then optionally insert new
      await col.deleteMany({})
      if (payload.length === 0) {
        return res.status(201).json({ ok: true, tables: [] })
      }

      await col.insertMany(payload)
      const docs = await col.find().toArray()
      return res.status(201).json({ ok: true, tables: docs })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (err: any) {
    console.error('tables api error', err)
    return res.status(500).json({ ok: false, error: err.message || 'internal error' })
  }
}

export default withMorgan(handler)
