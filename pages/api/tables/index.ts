import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb()
  const tables = await db.collection('tables').find().toArray()
  res.json({ tables })
}
