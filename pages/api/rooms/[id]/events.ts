import { NextApiRequest, NextApiResponse } from 'next'
import { getMongoClient } from '../../../../lib/mongo'
import { ObjectId } from 'mongodb'
import redis from '../../../../lib/redis'
import { Event, updateState } from '../../../../lib/models/event'
import { getState, getUpdatedState } from './state'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  let room_id: ObjectId | undefined 
  try {
    room_id = new ObjectId(String(id))
  } catch {
    return res.status(400).json({ error: 'invalid room id' })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    if (typeof body.state !== 'string') return res.status(400).json({ error: 'state is required' });
    const state = body.state as string;
    if (typeof body.participant !== 'string') return res.status(400).json({ error: 'participant is required' });    
    const participant = body.participant as string
     
    const client = await getMongoClient()
    const db = client.db()
    const event = { room_id, timestamp: new Date(), state, participant }
    const result = await db.collection<Event>('events').insertOne(event)
    const eventWithId = { ...event, _id: result.insertedId }

    const room_state = await getUpdatedState(db, room_id, eventWithId);
    await redis.publish(`room:${room_id}`, JSON.stringify({type: "state:change", room_state})) 
    return res.status(201).json({ ok: true, state: room_state })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
