import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const tables = req.body?.tables
  if (!Array.isArray(tables)) return res.status(400).json({ error: 'tables array required' })
  const db = await getDb()
  const ops = tables.map((t: any) => ({ updateOne: { filter: { id: t.id }, update: { $set: t }, upsert: true } }))
  try {
    if (ops.length) await db.collection('tables').bulkWrite(ops)
    res.json({ ok: true, count: tables.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
