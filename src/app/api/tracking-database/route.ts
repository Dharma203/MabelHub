import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('input_database')
    

    const { searchParams } = req.nextUrl

    // ----------------------------------------------------------------
    // Build filter from query params (shared by stats + pagination)
    // ----------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {}

    const bulanArr = searchParams.getAll('bulan')
    const segmen = searchParams.get('segmen')
    if (segmen) filter['segmen'] = segmen
    const produkArr = searchParams.getAll('produk')
    const merek_lainnya = searchParams.get('merek_lainnya')
    if (merek_lainnya) filter['merek_lainnya'] = merek_lainnya
    const merekArr = searchParams.getAll('merek')
    const perusahaanArr = searchParams.getAll('perusahaan')
    const provinsiArr = searchParams.getAll('provinsi')
    const kotaArr = searchParams.getAll('kota')
    const tipeArr = searchParams.getAll('tipe')
    const salesInternal = searchParams.get('sales_internal')
    if (salesInternal) filter['sales_internal'] = salesInternal
    const sumberData = searchParams.get('sumber_data')
    if (sumberData) filter['sumber_data'] = sumberData
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
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

    if (produkArr.length > 0) filter['produk_relevan'] = { $in: produkArr }
    if (merekArr.length > 0) filter['merek_tayang'] = { $in: merekArr }
    if (perusahaanArr.length > 0)
      filter['nama_perusahaan'] = { $in: perusahaanArr }
    if (provinsiArr.length > 0) filter['provinsi'] = { $in: provinsiArr }
    if (kotaArr.length > 0) filter['kota'] = { $in: kotaArr }
    if (tipeArr.length > 0) filter['tipe_kontak'] = { $in: tipeArr }

    // ----------------------------------------------------------------
    // Date filter berdasarkan code_input (format: PREFIX-DDMMYY-COUNTER)
    // Contoh: YTK-011225-0012 → DD=01, MM=12, YY=25 → 01 Desember 2025
    //
    // Untuk perbandingan tanggal, kita bangun string YYYYMMDD dari code_input:
    //   mid = split("-")[1] → "011225"
    //   YYYYMMDD = "20" + mid[4..5] + mid[2..3] + mid[0..1]
    //            = "20" + "25" + "12" + "01" = "20251201"
    // ----------------------------------------------------------------

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

    const midExpr = { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] }
    const dateStrExpr = {
      $concat: [
        '20',
        { $substr: [midExpr, 4, 2] }, // YY
        { $substr: [midExpr, 2, 2] }, // MM
        { $substr: [midExpr, 0, 2] }, // DD
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

    // ----------------------------------------------------------------
    // Statistik Unik — pakai filter
    // ----------------------------------------------------------------
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
      ...filter,
      tipe_kontak: 'WhatsApp',
      nama: { $ne: '' },
      no_telp: { $ne: '' },
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
            ...filter,
            provinsi: { $ne: '' },
            kota: { $ne: '' },
            nama: { $ne: '' },
            no_telp: { $ne: '' },
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
            ...filter,
            tipe_kontak: 'WhatsApp',
            provinsi: { $ne: '' },
            kota: { $ne: '' },
            nama: { $ne: '' },
            no_telp: { $ne: '' },
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

    // Statistik ringkasan
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
    }

    // ----------------------------------------------------------------
    // Deteksi mode: jika ada param `page` atau `limit` → pagination mode
    // ----------------------------------------------------------------
    const hasPagination = searchParams.has('page') || searchParams.has('limit')

    if (!hasPagination) {
      const allRows = await col
        .aggregate([
          { $match: filter },
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
                  }, // YY
                  {
                    $substr: [
                      { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] },
                      2,
                      2,
                    ],
                  }, // MM
                  {
                    $substr: [
                      { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] },
                      0,
                      2,
                    ],
                  }, // DD
                ],
              },
              _sortCounter: {
                $arrayElemAt: [{ $split: ['$code_input', '-'] }, 2],
              },
            },
          },
          { $sort: { _sortDate: -1, _sortCounter: -1 } }, // terbaru di atas
        ])
        .toArray()
      const data = allRows.map((r) => ({
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
        telp: r.no_telp ?? '',
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
        created_at: r.created_at ?? '',
        updated_at: r.updated_at
          ? new Date(r.updated_at).toLocaleDateString('id-ID')
          : '',
      }))

      const bulan_data = bulanAgg
        .map(r => r._id as string)
      return NextResponse.json({ ...summaryStats, rows: data, bulan_data })
    }

    // ----------------------------------------------------------------
    // Mode pagination
    // ----------------------------------------------------------------
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
      telp: r.no_telp ?? '',
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
      created_at: r.created_at ?? '',
      updated_at: r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('id-ID')
        : '',
    }))

    return NextResponse.json({
      ...summaryStats,
      items,
      pagination: {
        sort: sortByDate,
        page,
        limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    })
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
