import { ObjectId } from 'mongodb'

export type TableShape = 'square' | 'circle'
export type ParticipantStatus = 'idle' | 'hand' | 'waiting' | 'toilet1' | 'toilet2'

export interface Table {
  _id?: ObjectId
  participant_ids: number[]
  x: number
  y: number
  shape: TableShape
  rotation?: number
  roomId?: ObjectId
}

export interface Participant {
  _id?: ObjectId
  name: string
  color: string
}
