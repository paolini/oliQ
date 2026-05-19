import { NextApiRequest, NextApiResponse } from 'next'
import { getMongoClient } from '../../../../lib/mongo'
import { ObjectId } from 'mongodb'
import redis from '../../../../lib/redis'
import { Event, updateState } from '../../../../lib/models/event'

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
    if (typeof body.participant !== 'string') return res.status(400).json({ error: 'participant_id is required' });    
    const participant = body.participant_id as string
     
    const client = await getMongoClient()
    const db = client.db()
    await db.collection<Event>('events').insertOne({
        room_id,
        timestamp: new Date(),
        state,
        participant,
    })

    try {
        const state_str = await redis.get(`state:room:${room_id}`);

        async function computeRoomState() {
            const events = await db.collection<Event>('events').find({ room_id }).toArray()
            const state = events.reduce(updateState, []);
            return state;
        }

        // if state_str is null, it means the state is not cached, so we compute it from the db
        const state = state_str ? JSON.parse(state_str) : await computeRoomState();

        await redis.publish(`state:room:${room_id}`, JSON.stringify(JSON.stringify(state))) 
    } catch (e) { 
        console.error('Redis failed', e) 
    }
    
    return res.status(201).json({ ok: true, state })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
