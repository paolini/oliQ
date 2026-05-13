import type { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../lib/redis'
import { getDb } from '../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const list = await redis.lrange('bathroom_queue', 0, -1)
  const db = await getDb()
  const tables = await db.collection('tables').find().toArray()
  res.json({ queue: list, tables })
}
