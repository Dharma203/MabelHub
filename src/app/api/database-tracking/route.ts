import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

type KontakItem = {
  id: string
  nama: string
  jabatan: string
  role: string
  tipeKontak: string
  noTelp: string
  email: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'b2g'
    const prefix = searchParams.get('prefix') || ''
    const dmy = searchParams.get('dmy') || ''

    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const colB2B = db.collection('database_b2b')
    const colB2G = db.collection('database_b2g')

    // Pilih collection berdasarkan mode
    const col = mode === 'b2b' ? colB2B : colB2G

    const filter: Record<string, any> = {}

    // timestamp
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const createdAt = searchParams.get('createdAt')
    if (createdAt) {
      const createdAtDate = new Date(createdAt)
      filter ['created_at'] = {
        $gte: createdAtDate.toDateString(),
      }
    }

    // data b2g
    const segmentasi = searchParams.get('segmentasi')
    if (segmentasi) filter['segmentasi'] = segmentasi
    const satuanKerja = searchParams.get('satuanKerja')
    if (satuanKerja) filter['satuanKerja'] = satuanKerja
    const institusiKerja = searchParams.get('institusiKerja')
    if (institusiKerja) filter['institusiKerja'] = institusiKerja
    const klpd = searchParams.get('klpd')
    if (klpd) filter['klpd'] = klpd

    // data b2b
    const jenisEntitas = searchParams.get('jenisEntitas')
    if (jenisEntitas) filter['jenisEntitas'] = jenisEntitas
    const namaEntitas = searchParams.get('namaEntitas')
    if (namaEntitas) filter['namaEntitas'] = namaEntitas
    const bidangUsaha = searchParams.get('bidangUsaha')
    if (bidangUsaha) filter['bidangUsaha'] = bidangUsaha
    const produkRelevanArr = searchParams.getAll('produkRelevan')
    const merekTayangArr = searchParams.getAll('merekTayang')
    const sumberData = searchParams.get('sumberData')
    if (sumberData) filter['sumberData'] = sumberData

    // data kontak
    const nama = searchParams.get('nama')
    const jabatan = searchParams.get('jabatan')
    const role = searchParams.get('role')
    const tipeKontakArr = searchParams.getAll('tipeKontak')
    const noTelp = searchParams.get('noTelp')
    const email = searchParams.get('email')

    // data sekunder
    const ring = searchParams.get('ring')
    if (ring) filter['ring'] = ring
    const salesInternal = searchParams.get('salesInternal')
    if (salesInternal) filter['salesInternal'] = salesInternal
    const alamat = searchParams.get('alamat')
    const kotaArr = searchParams.getAll('kota')
    const provinsiArr = searchParams.getAll('provinsi')
    const kabupatenArr = searchParams.getAll('kabupaten')
    const bulanArr = searchParams.getAll('bulan')

    if (produkRelevanArr.length > 0) filter['produkRelevan'] = { $in: produkRelevanArr}
    if (merekTayangArr.length > 0) filter['merekTayang'] = { $in: merekTayangArr}
    if (kotaArr.length > 0) filter['kota'] = { $in: kotaArr}
    if (provinsiArr.length > 0) filter['provinsi'] = { $in: provinsiArr}
    if (kabupatenArr.length > 0) filter['kabupaten'] = { $in : kabupatenArr}
    if (tipeKontakArr.length > 0) filter['tipeKontak'] = { $in: tipeKontakArr}

    const midExpr = { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1]}
    const dateStrExpr = {
      $concat: [
        '20',
        { $substr: [midExpr, 4 ,2]},
        { $substr: [midExpr, 2, 2]},
        { $substr: [midExpr, 0, 2]},
      ],
    }

    if (bulanArr.length > 0) {
      // Filter bulan: match MM dan YY dari code_input
      // bulan format "2025-12" → YY="25", MM="12"
      const monthConditions = bulanArr
        .map((m) => {
          const [yyyy, mm] = m.split('-')
          if (!yyyy || !mm) return null
          const yy = yyyy.slice(2) // "2025" → "25"
          return {
            $and: [
              { $eq: [{ $substr: [midExpr, 2, 2] }, mm] },
              { $eq: [{ $substr: [midExpr, 4, 2] }, yy] },
            ],
          }
        })
        .filter(Boolean)

      if (monthConditions.length === 1) {
        filter['$expr'] = monthConditions[0]
      } else if (monthConditions.length > 1) {
        filter['$expr'] = { $or: monthConditions }
      }
    } else if (startDate || endDate) {
      // Date range filter
      // startDate "2026-01-01" → "20260101", endDate "2026-01-31" → "20260131"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = []
      if (startDate) {
        const s = startDate.replace(/-/g, '') // "2026-01-01" → "20260101"
        conditions.push({ $gte: [dateStrExpr, s] })
      }
      if (endDate) {
        const e = endDate.replace(/-/g, '') // "2026-01-31" → "20260131"
        conditions.push({ $lte: [dateStrExpr, e] })
      }
      if (conditions.length === 1) {
        filter['$expr'] = conditions[0]
      } else {
        filter['$expr'] = { $and: conditions }
      }
    }

    const bulanAgg = await col.aggregate([
      { $match: { code_input: { $exists: true, $ne: "" } } },
      {
        $project: {
          mid: { $arrayElemAt: [{ $split: ["$code_input", "-"] }, 1] }
        }
      },
      {
        $match: {
          mid: { $exists: true },
          $expr: { $eq: [{ $strLenCP: "$mid" }, 6] } // pastikan 6 digit
        }
      },
      {
        $project: {
          yearMonth: {
            $concat: [
              "20",
              { $substr: ["$mid", 4, 2] }, // YY
              "-",
              { $substr: ["$mid", 2, 2] }  // MM
            ]
          }
        }
      },
      { $group: { _id: "$yearMonth" } },
      { $sort: { _id: -1 } }
    ]).toArray();

    const hasPagination = searchParams.has('page') || searchParams.has('limit')

    if (!hasPagination) {
      const allRows = await col
      .aggregate([
        { $match: filter},
        {
          $addFields: {
            _sortDate: {
              $concat: [
                '20',
                {
                  $substr: [
                    { $arrayElemAt: [{ $split: ['$code_input', '-']}, 1]},
                    4,
                    2,
                  ],
                }, // YY
                {
                  $substr: [
                    { $arrayElemAt: [{ $split: ['$code_input', '-']}, 1]},
                    2,
                    2,
                  ],
                }, // MM
                {
                  $substr: [
                    { $arrayElemAt: [{ $split: ['$code_input', '-']}, 1]},
                    0,
                    2,
                  ],
                }, // DD
              ],
            },
            _sortCounter: {
              $arrayElemAt: [{ $split: ['$code_input', '-']}, 2],
            },
          },
        },
        { $sort: { _sortDate: -1, _sortCounter: -1 } }, // terbaru dari atas
      ])
      .toArray()
      const data = allRows.map((r) => ({
        _id: r._id?.toString() ?? '',
        kode: r.code_input ?? '',
        satuanKerja: r.satuanKerja ?? '',
        institusiKerja: r.institusiKerja ?? '',
        klpd: r.klpd ?? '',
        segmentasi: r.segmentasi ?? '',
        jenisEntitas: r.jenisEntitas ?? '',
        namaEntitas: r.namaEntitas ?? '',
        bidangUsaha: r.bidangUsaha ?? '',
        produkRelevan: r.produkRelevan ?? '',
        merekTayang: r.merekTayang ?? '',
        sumberData: r.sumberData ?? '',
        nama: r.nama ?? '',
        jabatan: r.jabatan ?? '',
        role: r.role ?? '',
        tipeKontak: r.tipe_kontak ?? r.tipeKontak ?? '',
        noTelp: r.no_telp ?? r.noTelp ?? '',
        email: r.email ?? '',
        ring: r.ring ?? '',
        salesInternal: r.salesInternal ?? '',
        alamat: r.alamat ?? '',
        kota: r.kota ?? '',
        provinsi: r.provinsi ?? '',
        kabupaten: r.kabupaten ?? '',
        bulan: r.bulan ?? '',
        startDate: r.startDate ?? '',
        endDate: r.endDate ?? '',
        createdAt: r.created_at ?? r.createdAt ?? '',
        linkToko: r.linkToko ?? '',
        linkProduk: r.linkProduk ?? '',
        brandOwner: r.brandOwner ?? '',
        merekLainnya: r.merekLainnya ?? '',
        updatedAt: r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('id-ID')
        : r.updatedAt
        ? new Date(r.updatedAt).toLocaleDateString('id-ID')
        : '',
        }))

        const bulan_data = bulanAgg
        .map(r => r._id as string)
        return NextResponse.json({ rows: data, bulan_data, mode })
    }
    
    const rawPage = Number(searchParams.get('page'))
    const rawLimit = Number(searchParams.get('limit'))
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Number(rawPage) : 1
    const sortByDate = searchParams.get('sortByDate') === '1' ? 1 : -1
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Number(rawLimit) : 25
    const skip = (page - 1) * limit

    const [totalCount, pageRows] = await Promise.all([
      col.countDocuments(filter),
      col
        .aggregate([
          { $match: filter },
          { $sort: { created_at: sortByDate } },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray(),
    ])

    const data = pageRows.map((r) => ({
        _id: r._id?.toString() ?? '',
        kode: r.code_input ?? '',
        satuanKerja: r.satuanKerja ?? '',
        institusiKerja: r.institusiKerja ?? '',
        klpd: r.klpd ?? '',
        segmentasi: r.segmentasi ?? '',
        jenisEntitas: r.jenisEntitas ?? '',
        namaEntitas: r.namaEntitas ?? '',
        bidangUsaha: r.bidangUsaha ?? '',
        produkRelevan: r.produkRelevan ?? '',
        merekTayang: r.merekTayang ?? '',
        sumberData: r.sumberData ?? '',
        nama: r.nama ?? '',
        jabatan: r.jabatan ?? '',
        role: r.role ?? '',
        tipeKontak: r.tipe_kontak ?? r.tipeKontak ?? '',
        noTelp: r.no_telp ?? r.noTelp ?? '',
        email: r.email ?? '',
        ring: r.ring ?? '',
        salesInternal: r.salesInternal ?? '',
        alamat: r.alamat ?? '',
        kota: r.kota ?? '',
        provinsi: r.provinsi ?? '',
        kabupaten: r.kabupaten ?? '',
        bulan: r.bulan ?? '',
        startDate: r.startDate ?? '',
        endDate: r.endDate ?? '',
        createdAt: r.created_at ?? r.createdAt ?? '',
        linkToko: r.linkToko ?? '',
        linkProduk: r.linkProduk ?? '',
        brandOwner: r.brandOwner ?? '',
        merekLainnya: r.merekLainnya ?? '',
        updatedAt: r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('id-ID')
        : r.updatedAt
        ? new Date(r.updatedAt).toLocaleDateString('id-ID')
        : '',
        }))

        return NextResponse.json({
      rows: data,
      mode,
      pagination: {
        sort: sortByDate,
        page,
        limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    })
  } catch (error) {
    console.error('Error fetching tracking database:', error)
    return NextResponse.json({ error: 'gagal mengambil data'}, { status: 500})
  }
}
