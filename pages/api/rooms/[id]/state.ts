import { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '../../../../lib/mongo'
import redis from '../../../../lib/redis'

type ComputeOpts = {
  roomId?: string
  maxEvents?: number
}

async function computeRoomState(opts: ComputeOpts = {}) {
  const { roomId, maxEvents = 2000 } = opts
  const db = await getDb()

  const q: any = {}
  if (roomId) q.roomId = String(roomId)

  const events = await db.collection('events').find(q).sort({ ts: -1 }).limit(maxEvents).toArray()

  // reduce per participant: lastEvent, status, lastSeen
  const participants: Record<number, any> = {}
  for (const ev of events) {
    const pn = typeof ev.participantNumber === 'number' ? ev.participantNumber : undefined
    if (pn == null) continue
    if (!participants[pn]) {
      participants[pn] = { lastEvent: ev.event, lastSeen: ev.ts, details: ev.details || null }
    }
  }

  // load queue from redis: prefer room-scoped
  const queueKey = roomId ? `queue:room:${roomId}` : 'queue'
  let queue: number[] = []
  try {
    const items = await redis.lrange(queueKey, 0, -1)
    queue = items.map((s: string) => Number(s)).filter(n => !Number.isNaN(n))
  } catch (e) {
    console.error('redis lrange failed', e)
  }

  return { participants, queue }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const roomId = Array.isArray(id) ? id[0] : id
  try {
    const state = await computeRoomState({ roomId })
    return res.status(200).json({ ok: true, state })
  } catch (err:any) {
    console.error('GET /api/rooms/[id]/state error', err)
    return res.status(500).json({ ok: false, error: String(err?.message || err) })
  }
}
