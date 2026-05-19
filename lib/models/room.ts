import { ObjectId } from 'mongodb'

export interface Room {
  _id?: ObjectId
  title: string
  width: number
  height: number
}

export default Room
