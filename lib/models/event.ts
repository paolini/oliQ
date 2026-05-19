import { WithId } from 'mongodb'

export type Event = {
    timestamp: Date,
    participantNumber: number,
    state: string,
}

export type EventWithId = WithId<Event>


