import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Normaliza status_wa: konversi en-dash (–) / em-dash (—) → hyphen (-),
 * trim spasi berlebih, dan mapping alias ke nilai canonical.
 */
function normalizeStatusWa(val: string | null | undefined): string {
  if (!val) return ''
  let s = val
    .replace(/[\u2013\u2014]/g, '-')   // en-dash & em-dash → hyphen
    .replace(/\s+/g, ' ')              // collapse multi-spaces
    .trim()
  // Hapus value yang hanya berisi dash
  if (s === '-') return ''
  // Alias mapping ke canonical values
  const aliases: Record<string, string> = {
    'Aktif Broadcast': 'Aktif Progres',
  }
  return aliases[s] ?? s
}

type KontakTrackingItem = {
  id: string
  nama_perusahaan: string
  produk_relevan: string
  alamat: string
  nama: string
  no_telp: string
}

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('input_database')

    const { searchParams } = req.nextUrl

    const filter: Record<string, any> = {}

    const createdAt = searchParams.get('createdAt')
    if (createdAt) {
      // Filter berdasarkan rentang tanggal createdAt
      const createdAtDate = new Date(createdAt)
      filter['created_at'] = {
        $gte: createdAtDate.toDateString(),
      }
    }
    const requestor = searchParams.get('requestor')
    if (requestor) {
      filter['penginput'] = requestor
    }
    const sumberData = searchParams.get('sumber_data')
    if (sumberData) filter['sumber_data'] = sumberData

    const salesInternal = searchParams.get('sales_internal')
    if (salesInternal) filter['sales_internal'] = salesInternal
    const bulanArr = searchParams.getAll('bulan')
    const produkArr = searchParams.getAll('produk')
    const perusahaanArr = searchParams.getAll('perusahaan')
    const provinsiArr = searchParams.getAll('provinsi')
    const kotaArr = searchParams.getAll('kota')
    const picArr = searchParams.getAll('pic')
    const statusWaArr = searchParams.getAll('status_wa')
    const keSalesArr = searchParams.getAll('ke_sales')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const showOnlyWithStatus = searchParams.get('has_status') === 'true'

    const isExport = searchParams.get('export') === 'true'
    const maxLimit = isExport ? 50000 : 500
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(
      maxLimit,
      Math.max(1, Number(searchParams.get('limit') ?? 10)),
    )
    const skip = (page - 1) * limit

    const midExpr = { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] }
    const dateStrExpr = {
      $concat: [
        '20',
        { $substr: [midExpr, 4, 2] },
        { $substr: [midExpr, 2, 2] },
        { $substr: [midExpr, 0, 2] },
      ],
    }

    const matchStage: Record<string, any> = {
      tipe_kontak: 'WhatsApp',
      no_telp: { $nin: ['', null] }
    }
    if (produkArr.length > 0) matchStage['produk_relevan'] = { $in: produkArr }
    if (perusahaanArr.length > 0)
      matchStage['nama_perusahaan'] = { $in: perusahaanArr }
    if (provinsiArr.length > 0) matchStage['provinsi'] = { $in: provinsiArr }
    if (kotaArr.length > 0) matchStage['kota'] = { $in: kotaArr }
    if (picArr.length > 0) matchStage['nama'] = { $in: picArr }

    if (bulanArr.length > 0) {
      const monthConditions = bulanArr
        .map((m) => {
          const [yyyy, mm] = m.split('-')
          if (!yyyy || !mm) return null
          const yy = yyyy.slice(2)
          return {
            $and: [
              { $eq: [{ $substr: [midExpr, 2, 2] }, mm] },
              { $eq: [{ $substr: [midExpr, 4, 2] }, yy] },
            ],
          }
        })
        .filter(Boolean)

      if (monthConditions.length === 1) matchStage['$expr'] = monthConditions[0]
      else if (monthConditions.length > 1)
        matchStage['$expr'] = { $or: monthConditions }
    } else if (startDate || endDate) {
      const conditions: any[] = []
      if (startDate)
        conditions.push({ $gte: [dateStrExpr, startDate.replace(/-/g, '')] })
      if (endDate)
        conditions.push({ $lte: [dateStrExpr, endDate.replace(/-/g, '')] })
      matchStage['$expr'] =
        conditions.length === 1 ? conditions[0] : { $and: conditions }
    }

    const matchAfterLookup: Record<string, any> = {}
    if (statusWaArr.length > 0) {
      const hasKosong = statusWaArr.includes('')
      const nonKosong = statusWaArr.filter((s) => s !== '')

      // Expand ke semua variant dash (hyphen & en-dash) agar cocok di DB
      const expandDashVariants = (vals: string[]): string[] => {
        const expanded = new Set<string>()
        for (const v of vals) {
          expanded.add(v)                                   // original (hyphen)
          expanded.add(v.replace(/-/g, '\u2013'))           // en-dash variant
          expanded.add(v.replace(/\u2013/g, '-'))           // hyphen variant
          // Also handle alias: Aktif Progres <-> Aktif Broadcast
          if (v === 'Aktif Progres') expanded.add('Aktif Broadcast')
          if (v === 'Aktif Broadcast') expanded.add('Aktif Progres')
        }
        return [...expanded]
      }

      const expandedNonKosong = expandDashVariants(nonKosong)

      if (hasKosong && nonKosong.length > 0) {
        // Filter kosong + status lain sekaligus
        matchAfterLookup['$or'] = [
          { 'broadcast.status_wa': { $in: expandedNonKosong } },
          { 'broadcast.status_wa': { $in: ['', null] } },
          { broadcast: null },
        ]
      } else if (hasKosong) {
        // Filter kosong saja
        matchAfterLookup['$or'] = [
          { 'broadcast.status_wa': { $in: ['', null] } },
          { broadcast: null },
        ]
      } else {
        // Filter status biasa (tanpa kosong)
        matchAfterLookup['broadcast.status_wa'] = { $in: expandedNonKosong }
      }
      if (showOnlyWithStatus) {
        matchAfterLookup['broadcast'] = { $ne: null }
        matchAfterLookup['broadcast.status_wa'] = { $nin: ['', null] }
      }
    }
    if (keSalesArr.length > 0) {
      const hasKosong = keSalesArr.includes('')
      const nonKosong = keSalesArr.filter((s) => s !== '')

      if (hasKosong && nonKosong.length > 0) {
        // Filter kosong + sales lain sekaligus
        matchAfterLookup['$or'] = [
          { 'broadcast.ke_sales': { $in: nonKosong } },
          { 'broadcast.ke_sales': { $in: ['', null] } },
          { broadcast: null },
        ]
      } else if (hasKosong) {
        // Filter kosong saja
        matchAfterLookup['$or'] = [
          { 'broadcast.ke_sales': { $in: ['', null] } },
          { broadcast: null },
        ]
      } else {
        // Filter sales biasa
        matchAfterLookup['broadcast.ke_sales'] = { $in: nonKosong }
      }
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'tracking_broadcast',
          let: { codeInput: '$code_input', docId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$kode', '$$codeInput'] },
                    { $eq: ['$source_id', '$$docId'] },
                  ],
                },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 1 }
          ],
          as: 'broadcast',
        },
      },
      {
        $addFields: {
          broadcast: { $arrayElemAt: ['$broadcast', 0] },
        },
      },
      ...(Object.keys(matchAfterLookup).length > 0
        ? [{ $match: matchAfterLookup }]
        : []),
    ]

    const [
      countResult,
      pageRows,
      statusWaCounts,
      keSalesProvinsi,
      keSalesPerSales,
    ] = await Promise.all([
      // Hitung total
      col.aggregate([...pipeline, { $count: 'total' }]).toArray() as Promise<
        any[]
      >,

      // Ambil data dengan pagination
      col
        .aggregate([
          ...pipeline,
          {
            $addFields: {
              _sortDate: {
                $concat: [
                  '20',
                  {
                    $substr: [
                      { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] },
                      4,
                      2,
                    ],
                  },
                  {
                    $substr: [
                      { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] },
                      2,
                      2,
                    ],
                  },
                  {
                    $substr: [
                      { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] },
                      0,
                      2,
                    ],
                  },
                ],
              },
              _sortCounter: {
                $arrayElemAt: [{ $split: ['$code_input', '-'] }, 2],
              },
            },
          },
          { $sort: { _sortDate: -1, _sortCounter: -1 } },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray() as Promise<any[]>,

      // Hitung per status_wa (selalu dari semua data, tanpa filter)
      col
        .aggregate([
          {
            $match: {
              tipe_kontak: 'WhatsApp',
              no_telp: { $nin: ['', null] },
            },
          },
          {
            $lookup: {
              from: 'tracking_broadcast',
              let: { codeInput: '$code_input', docId: { $toString: '$_id' } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ['$kode', '$$codeInput'] },
                        { $eq: ['$source_id', '$$docId'] },
                      ],
                    },
                  },
                },
                { $sort: { _id: -1 } },
                { $limit: 1 }
              ],
              as: 'broadcast',
            },
          },
          {
            $addFields: {
              broadcast: { $arrayElemAt: ['$broadcast', 0] },
            },
          },
          {
            $group: {
              _id: { $ifNull: ['$broadcast.status_wa', ''] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray() as Promise<any[]>,

      col
        .aggregate([
          {
            $match: {
              tipe_kontak: 'WhatsApp',
              no_telp: { $nin: ['', null] },
            },
          },
          {
            $lookup: {
              from: 'tracking_broadcast',
              let: { codeInput: '$code_input', docId: { $toString: '$_id' } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ['$kode', '$$codeInput'] },
                        { $eq: ['$source_id', '$$docId'] },
                      ],
                    },
                  },
                },
                { $sort: { _id: -1 } },
                { $limit: 1 }
              ],
              as: 'broadcast',
            },
          },
          {
            $addFields: {
              broadcast: {
                $cond: {
                  if: { $isArray: '$broadcast' },
                  then: { $arrayElemAt: ['$broadcast', 0] },
                  else: null,
                },
              },
            },
          },
          {
            $match: {
              'broadcast.ke_sales': { $nin: ['', null] },
              provinsi: { $ne: '' },
              kota: { $ne: '' },
            },
          },
          {
            $group: {
              _id: {
                ke_sales: '$broadcast.ke_sales',
                provinsi: '$provinsi',
                kota: '$kota',
              },
              unik: { $sum: 1 },
            },
          },
          { $sort: { '_id.ke_sales': 1, '_id.provinsi': 1, '_id.kota': 1 } },
        ])
        .toArray() as Promise<any[]>,

      // Agregasi per ke_sales saja (untuk tabel "Unik No HP per Ke Sales")
      col
        .aggregate([
          {
            $match: {
              tipe_kontak: 'WhatsApp',
              no_telp: { $nin: ['', null] },
            },
          },
          {
            $lookup: {
              from: 'tracking_broadcast',
              let: { codeInput: '$code_input', docId: { $toString: '$_id' } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ['$kode', '$$codeInput'] },
                        { $eq: ['$source_id', '$$docId'] },
                      ],
                    },
                  },
                },
                { $sort: { _id: -1 } },
                { $limit: 1 }
              ],
              as: 'broadcast',
            },
          },
          {
            $addFields: {
              broadcast: {
                $cond: {
                  if: { $isArray: '$broadcast' },
                  then: { $arrayElemAt: ['$broadcast', 0] },
                  else: null,
                },
              },
            },
          },
          {
            $addFields: {
              sales_label: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ['$broadcast.ke_sales', ''] },
                      { $eq: ['$broadcast.ke_sales', null] },
                      { $eq: ['$broadcast', null] },
                    ],
                  },
                  then: '(Belum Diteruskan)',
                  else: '$broadcast.ke_sales',
                },
              },
            },
          },
          {
            $addFields: {
              _hasStatus: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$broadcast', null] },
                      { $ne: ['$broadcast.status_wa', ''] },
                      { $ne: ['$broadcast.status_wa', null] }
                    ]
                  },
                  then: 0, // muncul duluan
                  else: 1  // muncul belakangan
                }
              }
            }
          },
          { $sort: { _hasStatus: 1, _sortDate: -1, _sortCounter: -1 } },
          {
            $group: {
              _id: '$sales_label',
              unik: { $sum: 1 },
            },
          },
          { $sort: { unik: -1 } },
        ])
        .toArray() as Promise<any[]>,
    ])

    const totalCount = countResult[0]?.total ?? 0
    const countMap: Record<string, number> = {}
    for (const s of statusWaCounts) {
      const key = normalizeStatusWa(s._id)
      countMap[key] = (countMap[key] ?? 0) + s.count
    }

    const totalKeSalesUnik = keSalesProvinsi.reduce(
      (sum: number, r: any) => sum + r.unik,
      0,
    )
    const tableKeSalesProvinsi = keSalesProvinsi.map((r: any, idx: number) => ({
      no: idx + 1,
      ke_sales: r._id.ke_sales,
      provinsi: r._id.provinsi,
      kota: r._id.kota,
      unik: r.unik,
      pct:
        totalKeSalesUnik > 0
          ? Math.round((r.unik / totalKeSalesUnik) * 100)
          : 0,
    }))

    // Tabel per sales (grouped by ke_sales only)
    const totalPerSalesUnik = keSalesPerSales.reduce(
      (sum: number, r: any) => sum + r.unik,
      0,
    )
    const tablePerSales = keSalesPerSales.map((r: any, idx: number) => ({
      no: idx + 1,
      ke_sales: r._id,
      unik: r.unik,
      pct:
        totalPerSalesUnik > 0
          ? Math.round((r.unik / totalPerSalesUnik) * 100)
          : 0,
    }))

    const uniqueNoTelp = await col.distinct('no_telp', {
      ...filter,
      no_telp: { $ne: '' },
    })
    const uniqueProvinsi = await col.distinct('provinsi', {
      ...filter,
      provinsi: { $ne: '' },
    })
    const uniqueKota = await col.distinct('kota', {
      ...filter,
      kota: { $ne: '' },
    })
    const uniqueNama = await col.distinct('nama', {
      ...filter,
      nama: { $ne: '' },
    })
    const uniqueMerek = await col.distinct('merek_tayang', {
      ...filter,
      merek_tayang: { $ne: '' },
    })

    // Total kontak unik (nama + no_telp)
    const uniqueCombinedAgg = await col
      .aggregate([
        { $match: { ...filter, nama: { $ne: '' }, no_telp: { $ne: '' } } },
        { $group: { _id: { nama: '$nama', no_telp: '$no_telp' } } },
        { $count: 'total' },
      ])
      .toArray()
    const totalKontakUnik = uniqueCombinedAgg[0]?.total ?? 0

    // Total WA unik
    const waFilter = {
      ...matchStage,
      tipe_kontak: 'WhatsApp',
      nama: { $ne: '' },
      no_telp: { $nin: ['', null] },
    }
    const uniqueWaAgg = await col
      .aggregate([
        { $match: waFilter },
        { $group: { _id: { nama: '$nama', no_telp: '$no_telp' } } },
        { $count: 'total' },
      ])
      .toArray()
    const totalWaUnik = uniqueWaAgg[0]?.total ?? 0

    // --- Tabel Analitik: Unik per Provinsi & Kota ---
    const provinsiKotaAgg = await col
      .aggregate([
        {
          $match: {
            ...matchStage,
            provinsi: { $ne: '' },
            kota: { $ne: '' },
            nama: { $ne: '' },
            no_telp: { $nin: ['', null] },
          },
        },
        {
          $group: {
            _id: {
              provinsi: '$provinsi',
              kota: '$kota',
              nama: '$nama',
              no_telp: '$no_telp',
            },
          },
        },
        {
          $group: {
            _id: { provinsi: '$_id.provinsi', kota: '$_id.kota' },
            unik: { $sum: 1 },
          },
        },
        { $sort: { '_id.provinsi': 1, '_id.kota': 1 } },
      ])
      .toArray()

    const totalUnikSeluruh = provinsiKotaAgg.reduce((sum, r) => sum + r.unik, 0)
    const tableProvinsiKota = provinsiKotaAgg.map((r, idx) => ({
      no: idx + 1,
      provinsi: r._id.provinsi,
      kota: r._id.kota,
      unik: r.unik,
      pct:
        totalUnikSeluruh > 0
          ? Math.round((r.unik / totalUnikSeluruh) * 100)
          : 0,
    }))

    // --- Tabel Analitik: WA Unik per Provinsi & Kota ---
    const waProvinsiKotaAgg = await col
      .aggregate([
        {
          $match: {
            ...matchStage,
            tipe_kontak: 'WhatsApp',
            provinsi: { $ne: '' },
            kota: { $ne: '' },
            nama: { $ne: '' },
            no_telp: { $nin: ['', null] },
          },
        },
        {
          $group: {
            _id: {
              provinsi: '$provinsi',
              kota: '$kota',
              nama: '$nama',
              no_telp: '$no_telp',
            },
          },
        },
        {
          $group: {
            _id: { provinsi: '$_id.provinsi', kota: '$_id.kota' },
            unik: { $sum: 1 },
          },
        },
        { $sort: { '_id.provinsi': 1, '_id.kota': 1 } },
      ])
      .toArray()

    const totalWaSeluruh = waProvinsiKotaAgg.reduce((sum, r) => sum + r.unik, 0)
    const tableWaProvinsiKota = waProvinsiKotaAgg.map((r, idx) => ({
      no: idx + 1,
      provinsi: r._id.provinsi,
      kota: r._id.kota,
      unik: r.unik,
      pct: totalWaSeluruh > 0 ? Math.round((r.unik / totalWaSeluruh) * 100) : 0,
    }))

    const items = pageRows.map((r) => ({
      _id: r._id?.toString() ?? '',
      kode: r.code_input ?? '',
      requestor: r.requestor ?? '',
      nama_perusahaan: r.nama_perusahaan ?? '',
      segmen: r.segmen ?? '',
      segmentasi: r.segmentasi ?? '',
      sumber_data: r.sumber_data ?? '',
      sales_internal: r.sales_internal ?? '',
      kota: r.kota ?? '',
      provinsi: r.provinsi ?? '',
      produk: r.produk_relevan ?? '',
      merek_tayang: r.merek_tayang ?? '',
      merek_lainnya: r.merek_lainnya ?? '',
      pic: r.nama ?? '',
      jabatan: r.jabatan ?? '',
      telp: String(r.no_telp ?? ''),
      tipe: r.tipe_kontak ?? '',
      bidang_perusahaan: r.bidang_perusahaan ?? '',
      brand_owner: r.brand_owner ?? '',
      email: r.email ?? '',
      link_produk: r.link_produk ?? '',
      link_toko: r.link_toko ?? '',
      alamat: r.alamat ?? '',
      sumber_date: r.sumber_date ?? '',
      sumber_lain: r.sumber_lain ?? '',
      penginput: r.penginput ?? '',
      jenis_entitas: r.jenis_entitas ?? '',
      keterangan_update: r.keterangan_update ?? '',
      bulan_data: r.bulan_data ?? '',
      status_wa: normalizeStatusWa(r.broadcast?.status_wa),
      detail_update: normalizeStatusWa(r.broadcast?.detail_update),
      ke_sales: r.broadcast?.ke_sales ?? '',
      created_at: r.created_at ?? '',
      updated_at: r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('id-ID')
        : '',
    }))

    const summaryStats = {
      total_no_telp: uniqueNoTelp.length,
      total_provinsi: uniqueProvinsi.length,
      total_kota: uniqueKota.length,
      total_nama: uniqueNama.length,
      total_merek: uniqueMerek.length,
      total_kontak_unik: totalKontakUnik,
      total_wa_unik: totalWaUnik,
      provinsi_kota: tableProvinsiKota,
      wa_provinsi_kota: tableWaProvinsiKota,
      ke_sales_provinsi: tableKeSalesProvinsi,
      per_sales: tablePerSales,
    }

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      statusWaSummary: {
        terkirim: countMap['Terkirim (1C)'] ?? 0,
        diterima: countMap['Diterima (2C)'] ?? 0,
        belumRespon: countMap['Dibaca - Belum Respons'] ?? 0,
        positif: countMap['Dibaca - Respons Positif'] ?? 0,
        netral: countMap['Dibaca - Respons Netral'] ?? 0,
        negatif: countMap['Dibaca - Respons Negatif'] ?? 0,
        aktif: countMap['Aktif Progres'] ?? 0,
        kosong: countMap[''] ?? 0,
        total: statusWaCounts.reduce((acc, s) => acc + s.count, 0),
      },
      summaryStats: { ...summaryStats },
      keSalesSummary: {
        arie: 0,
        beffry: 0,
        ferrie: 0,
        kosong: 0,
      },
    })
  } catch (error) {
    console.error('Error fetching broadcast data:', error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { header, items } = body

    if (!header || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Payload tidak valid: header atau items kosong' },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('tracking_broadcast')

    const now = new Date()

    const docs = items.map((item: KontakTrackingItem) => ({
      kode: item.id,                        // ← WAJIB ada untuk $lookup
      nama_perusahaan: item.nama_perusahaan || header.namaPerusahaan || '',
      produk_relevan: item.produk_relevan || header.produkRelevan || '',
      alamat: item.alamat || header.alamat || '',
      nama: item.nama || header.nama || '',
      no_telp: item.no_telp || header.noTelp || '',
      status_wa: '',                        // default kosong
      ke_sales: '',                         // default kosong
      created_at: now,
      updated_at: now,
    }))
    const result = await col.insertMany(docs)

    return NextResponse.json(
      { success: true, inserted: result.insertedCount },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/tracking-broadcast] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, pic } = body

    if (!id || typeof pic !== 'string') {
      return NextResponse.json(
        { error: 'Parameter tidak valid: id dan pic wajib diisi' },
        { status: 400 },
      )
    }

    const { ObjectId } = await import('mongodb')

    let objectId: InstanceType<typeof ObjectId>
    try {
      objectId = new ObjectId(id)
    } catch {
      return NextResponse.json(
        { error: 'Format id tidak valid' },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('input_database')

    const result = await col.updateOne(
      { _id: objectId },
      { $set: { nama: pic.trim(), updated_at: new Date().toISOString() } },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, updated: result.modifiedCount })
  } catch (error) {
    console.error('[PATCH /api/tracking-broadcast] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 },
    )
  }
}
