import { ObjectId } from 'mongodb'

export type TableShape = 'square' | 'circle'

export interface Table {
  _id?: ObjectId
  participant_ids: string[]
  x: number
  y: number
  shape: TableShape
  rotation?: number
  roomId?: ObjectId
}
