import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getVisitAuthMatch } from '@/lib/visit-auth'

function flexParseDateExpr(field: string) {
  const safeField = { $ifNull: [field, ''] };
  const normalizedField = {
    $let: {
      vars: { low: { $toLower: safeField } },
      in: {
        $reduce: {
          input: [
            ['des', 'dec'], ['okt', 'oct'], ['agu', 'aug'],
            ['mei', 'may'], ['nop', 'nov'], ['peb', 'feb'],
          ],
          initialValue: '$$low',
          in: {
            $replaceAll: {
              input: '$$value',
              find: { $arrayElemAt: ['$$this', 0] },
              replacement: { $arrayElemAt: ['$$this', 1] },
            },
          },
        },
      },
    },
  };
  return {
    $switch: {
      branches: [
        { case: { $eq: [{ $type: field }, 'date'] }, then: field },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{4}-\d{2}-\d{2}/ } },
          then: {
            $dateFromString: {
              dateString: { $substrCP: [field, 0, 10] },
              format: '%Y-%m-%d',
              onError: null,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: normalizedField,
              format: '%d-%b-%Y',
              onError: null,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{2}$/ } },
          then: {
            $dateFromString: {
              dateString: {
                $let: {
                  vars: { parts: { $split: [normalizedField, '-'] } },
                  in: {
                    $concat: [
                      { $arrayElemAt: ['$$parts', 0] },
                      '-',
                      { $arrayElemAt: ['$$parts', 1] },
                      '-20',
                      { $arrayElemAt: ['$$parts', 2] }
                    ]
                  }
                }
              },
              format: '%d-%b-%Y',
              onError: null,
            },
          },
        },
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: field,
              format: '%d/%m/%Y',
              onError: null,
            },
          },
        },
      ],
      default: null,
    },
  };
}

/**
 * GET /api/visits/by-satker?satker=...
 * Returns all individual visit documents for a given satuan_kerja,
 * filtered by the logged-in user's role, sorted by visit_date descending.
 */
export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const { searchParams } = new URL(req.url)
  const satker = searchParams.get('satker')

  if (!satker) {
    return NextResponse.json(
      { error: 'Parameter satker wajib diisi' },
      { status: 400 },
    )
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }

  // Combine auth filter with satker filter
  const matchFilter = {
    satuan_kerja: satker,
    ...authMatch,
  }

  const docs = await col
    .aggregate([
      { $match: matchFilter },
      {
        $addFields: {
          __visitDate: flexParseDateExpr('$visit_date'),
        },
      },
      { $sort: { __visitDate: -1, _id: -1 } },
      { $project: { __visitDate: 0 } },
    ])
    .toArray()

  const items = docs.map((d: any) => ({
    _id: String(d._id),
    visit_date: d.visit_date || '-',
    status_visit: d.status_visit || '-',
    nama_sales: d.nama_sales || '-',
    city: d.city || '-',
    status_ring: d.status_ring || '-',
    satuan_kerja: d.satuan_kerja || '-',
    pic_name: d.pic_name || '-',
    pic_phone: d.pic_phone || '-',
    pic_position: d.pic_position || '-',
    pic_role: d.pic_role || '-',
    created_at: d.created_at || '-',
    status_market: d.status_market || '-',
    klpd: d.klpd || '-',
    institusi_kerja: d.institusi_kerja || '-',
    tindak_lanjut: d.tindak_lanjut || '-',
    kegiatan_status: d.kegiatan_status || '-',
    descriptions: d.descriptions || '-',
    visit_image: d.visit_image || null,
    reschedule: d.reschedule || d.reschedule_date || '-',
  }))

  return NextResponse.json({ items })
}
