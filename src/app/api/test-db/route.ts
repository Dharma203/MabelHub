import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: Request) {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')
  
  const docs = await col.find({}).limit(20).toArray()
  return NextResponse.json({ docs })
}
