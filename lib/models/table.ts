import { ObjectId } from 'mongodb'

export type TableShape = 'square' | 'semicircle-left' | 'semicircle-right'
export type TableStatus = 'normal' | 'raised-hand' | 'queued' | 'in-bathroom'

export interface Table {
  _id?: ObjectId
  id: number
  x: number
  y: number
  shape: TableShape
  rotation?: number
  status: TableStatus
  lastStatusChange?: Date
}
