import { NextApiRequest, NextApiResponse } from 'next'
import redis from '../../../../lib/redis'
import { ObjectId } from 'bson'
import { Db } from 'mongodb'
import { Event, EventWithId, updateState } from '../../../../lib/models/event'
import { getDb } from '../../../../lib/mongo'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  try {
    const roomId = new ObjectId(String(id))
    const db = await getDb()
    const state = await getState(db, roomId)

    console.log(`GET /api/rooms/${roomId.toHexString()}/state`, { state })

    return res.status(201).json({ ok: true, state })
  } catch (err:any) {
    console.error('GET /api/rooms/[id]/state error', err)
    return res.status(500).json({ ok: false, error: String(err?.message || err) })
  }
}

export async function getUpdatedState(db: Db, room_id: ObjectId, event?: EventWithId): Promise<Event[]> {
    async function computeRoomState() {
        const events = await db.collection<Event>('events').find({ room_id }).toArray()
        const state = events.reduce(updateState, []);
      console.log(`Recomputed state for room ${room_id.toHexString()} from ${events.length} events`);
        return state;
    }

    const roomKey = room_id.toHexString();
    const state_str = await redis.get(`state:room:${roomKey}`);
    
    // if state_str is null, it means the state is not cached, so we compute it from the db
    let state = state_str ? JSON.parse(state_str) : await computeRoomState();
    if (event) {
      // add event to state
      state = updateState(state, event);

      // update cache with new state
      await redis.set(`state:room:${roomKey}`, JSON.stringify(state));
    }
    return state;
}

export async function getState(db: Db, room_id: ObjectId): Promise<Event[]> {
   return await getUpdatedState(db, room_id);
}