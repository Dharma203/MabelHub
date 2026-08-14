import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";


export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise
        const db = client.db('MabelHubStaging')
        const col = db.collection('input_database')

        const { searchParams } = req.nextUrl

        const filter: Record<string, any> = {}

        const createdAt = searchParams.get('createdAt')

        if (createdAt) {
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
        const statusCallArr = searchParams.getAll('status_call')
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

        // Filter tipe_kontak selain WhatsApp
        const matchStage: Record<string, any> = {
            tipe_kontak: { $ne: 'WhatsApp' },
            no_telp: { $nin: ['', null] },
        }
        if (produkArr.length > 0) matchStage['produk_relevan'] = { $in: produkArr }
        if (perusahaanArr.length > 0)
            matchStage['nama_perusahaan'] = { $in: perusahaanArr }
        if (provinsiArr.length > 0) matchStage['provinsi'] = { $in: provinsiArr }
        if (kotaArr.length > 0) matchStage['kota'] = { $in: kotaArr }

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

        // Filter setelah lookup ke tracking_call
        const matchAfterLookup: Record<string, any> = {}
        if (statusCallArr.length > 0) {
            const hasKosong = statusCallArr.includes('')
            const nonKosong = statusCallArr.filter((s) => s !== '')

            if (hasKosong && nonKosong.length > 0) {
                matchAfterLookup['$or'] = [
                    { 'callData.status_call': { $in: nonKosong } },
                    { 'callData.status_call': { $in: ['', null] } },
                    { callData: null },
                ]
            } else if (hasKosong) {
                matchAfterLookup['$or'] = [
                    { 'callData.status_call': { $in: ['', null] } },
                    { callData: null },
                ]
            } else {
                matchAfterLookup['callData.status_call'] = { $in: nonKosong }
            }
        }
        if (keSalesArr.length > 0) {
            const hasKosong = keSalesArr.includes('')
            const nonKosong = keSalesArr.filter((s) => s !== '')

            if (hasKosong && nonKosong.length > 0) {
                matchAfterLookup['$or'] = [
                    { 'callData.ke_sales': { $in: nonKosong } },
                    { 'callData.ke_sales': { $in: ['', null] } },
                    { callData: null },
                ]
            } else if (hasKosong) {
                matchAfterLookup['$or'] = [
                    { 'callData.ke_sales': { $in: ['', null] } },
                    { callData: null },
                ]
            } else {
                matchAfterLookup['callData.ke_sales'] = { $in: nonKosong }
            }
        }

        const pipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'tracking_call',
                    localField: 'code_input',
                    foreignField: 'kode',
                    as: 'callData',
                },
            },
            {
                $addFields: {
                    callData: { $arrayElemAt: ['$callData', -1] },
                },
            },
            ...(Object.keys(matchAfterLookup).length > 0
                ? [{ $match: matchAfterLookup }]
                : []),
        ]

        const [
            countResult,
            pageRows,
            statusCallCounts,
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

            // Hitung per status_call (dari tracking_call collection)
            col
                .aggregate([
                    { $match: { tipe_kontak: { $ne: 'WhatsApp' }, no_telp: { $nin: ['', null] } } },
                    {
                        $lookup: {
                            from: 'tracking_call',
                            localField: 'code_input',
                            foreignField: 'kode',
                            as: 'callData',
                        },
                    },
                    {
                        $addFields: {
                            callData: { $arrayElemAt: ['$callData', -1] },
                        },
                    },
                    {
                        $group: {
                            _id: { $ifNull: ['$callData.status_call', ''] },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray() as Promise<any[]>,

            // Agregasi ke_sales per provinsi & kota
            col
                .aggregate([
                    { $match: { tipe_kontak: { $ne: 'WhatsApp' }, no_telp: { $nin: ['', null] } } },
                    {
                        $lookup: {
                            from: 'tracking_call',
                            localField: 'code_input',
                            foreignField: 'kode',
                            as: 'callData',
                        },
                    },
                    {
                        $addFields: {
                            callData: {
                                $cond: {
                                    if: { $isArray: '$callData' },
                                    then: { $arrayElemAt: ['$callData', -1] },
                                    else: null,
                                },
                            },
                        },
                    },
                    {
                        $match: {
                            'callData.ke_sales': { $nin: ['', null] },
                            provinsi: { $ne: '' },
                            kota: { $ne: '' },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                ke_sales: '$callData.ke_sales',
                                provinsi: '$provinsi',
                                kota: '$kota',
                            },
                            unik: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.ke_sales': 1, '_id.provinsi': 1, '_id.kota': 1 } },
                ])
                .toArray() as Promise<any[]>,

            // Agregasi per ke_sales saja
            col
                .aggregate([
                    { $match: { tipe_kontak: { $ne: 'WhatsApp' } } },
                    {
                        $lookup: {
                            from: 'tracking_call',
                            localField: 'code_input',
                            foreignField: 'kode',
                            as: 'callData',
                        },
                    },
                    {
                        $addFields: {
                            callData: {
                                $cond: {
                                    if: { $isArray: '$callData' },
                                    then: { $arrayElemAt: ['$callData', -1] },
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
                                            { $eq: ['$callData.ke_sales', ''] },
                                            { $eq: ['$callData.ke_sales', null] },
                                            { $eq: ['$callData', null] },
                                        ],
                                    },
                                    then: '(Belum Diteruskan)',
                                    else: '$callData.ke_sales',
                                },
                            },
                        },
                    },
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
        const countMap = Object.fromEntries(
            statusCallCounts.map((s: any) => [s._id, s.count]),
        )
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

        // Tabel per sales
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

        // Statistik unik
        const nonWaFilter = { tipe_kontak: { $ne: 'WhatsApp' } }
        const uniqueNoTelp = await col.distinct('no_telp', {
            ...nonWaFilter,
            no_telp: { $ne: '' },
        })
        const uniqueProvinsi = await col.distinct('provinsi', {
            ...nonWaFilter,
            provinsi: { $ne: '' },
        })
        const uniqueKota = await col.distinct('kota', {
            ...nonWaFilter,
            kota: { $ne: '' },
        })
        const uniqueNama = await col.distinct('nama', {
            ...nonWaFilter,
            nama: { $ne: '' },
        })
        const uniqueMerek = await col.distinct('merek_tayang', {
            ...nonWaFilter,
            merek_tayang: { $ne: '' },
        })

        // Total kontak unik (nama + no_telp) non-WhatsApp
        const uniqueCombinedAgg = await col
            .aggregate([
                { $match: { ...nonWaFilter, nama: { $ne: '' }, no_telp: { $ne: '' } } },
                { $group: { _id: { nama: '$nama', no_telp: '$no_telp' } } },
                { $count: 'total' },
            ])
            .toArray()
        const totalKontakUnik = uniqueCombinedAgg[0]?.total ?? 0

        // --- Tabel Analitik: Unik per Provinsi & Kota ---
        const provinsiKotaAgg = await col
            .aggregate([
                {
                    $match: {
                        ...matchStage,
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

        // --- Tabel Analitik: Non-WA Unik per Provinsi & Kota ---
        const callProvinsiKotaAgg = await col
            .aggregate([
                {
                    $match: {
                        tipe_kontak: { $ne: 'WhatsApp' },
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

        const totalCallSeluruh = callProvinsiKotaAgg.reduce((sum, r) => sum + r.unik, 0)
        const tableCallProvinsiKota = callProvinsiKotaAgg.map((r, idx) => ({
            no: idx + 1,
            provinsi: r._id.provinsi,
            kota: r._id.kota,
            unik: r.unik,
            pct: totalCallSeluruh > 0 ? Math.round((r.unik / totalCallSeluruh) * 100) : 0,
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
            status_call: r.callData?.status_call ?? '',
            detail_update: r.callData?.detail_update ?? '',
            ke_sales: r.callData?.ke_sales ?? '',
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
            provinsi_kota: tableProvinsiKota,
            call_provinsi_kota: tableCallProvinsiKota,
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
            statusCallSummary: {
                tidak_tersedia: countMap['Nomor tidak tersedia'] ?? 0,
                sedang_sibuk: countMap['Nomor sedang sibuk'] ?? 0,
                tidak_diangkat: countMap['Tidak di angkat'] ?? 0,
                mailbox: countMap['Mailbox'] ?? 0,
                positif: countMap['Di angkat respon positif'] ?? 0,
                negatif: countMap['Diangkat respon negatif'] ?? 0,
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
        console.error('Error fetching tracking call data:', error)
        return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
    }
}