import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URI || ''
if (!uri) {
  console.warn('MONGO_URI not set')
}

let client: MongoClient | null = null

export async function getMongoClient() {
  if (client) return client
  client = new MongoClient(uri)
  await client.connect()
  return client
}

export async function getDb() {
  const c = await getMongoClient()
  return c.db()
}
