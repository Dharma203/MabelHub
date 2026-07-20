export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: Request) {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')
  
  const aggDocs = await col.aggregate([
    { $limit: 20 },
    {
      $project: {
        visit_date: 1,
        safeField: { $ifNull: ['$visit_date', ''] },
        low: { $toLower: { $ifNull: ['$visit_date', ''] } },
        is2DigitYear: { $regexMatch: { input: { $ifNull: ['$visit_date', ''] }, regex: /^\d{1,2}-[A-Za-z]+-\d{2}$/ } },
        parts: { $split: [{ $toLower: { $ifNull: ['$visit_date', ''] } }, '-'] }
      }
    },
    {
      $project: {
        visit_date: 1,
        safeField: 1,
        is2DigitYear: 1,
        parts: 1,
        concatStr: {
          $concat: [
            { $arrayElemAt: ['$parts', 0] },
            '-',
            { $arrayElemAt: ['$parts', 1] },
            '-20',
            { $arrayElemAt: ['$parts', 2] }
          ]
        }
      }
    }
  ]).toArray()
  
  return NextResponse.json({ rand: Math.random(), aggDocs })
}
