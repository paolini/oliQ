import { ObjectId, WithId } from 'mongodb'

export type Event = {
    room_id: ObjectId,
    timestamp: Date,
    participant: string,
    state: string,
}

export type EventWithId = WithId<Event>

export type State = {
        participant: string,
        state: string,
    }[]

export function updateState(state: State, event: EventWithId): State {
    const new_state = [];
    for (const s of state) {
        if (s.participant === event.participant) {
            if (s.state === event.state) {
                return state; // no change
            }
        } else {
            new_state.push(s);
        }
    }
    if (event.state) {
        new_state.push({ 
            participant: event.participant, 
            state: event.state 
        });
    }
    return new_state;
}