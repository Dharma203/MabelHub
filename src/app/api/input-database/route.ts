import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type KontakItem = {
    id: string
    nama: string
    jabatan: string
    tipeKontak: string
    noTelp: string
    email: string
}

// Mengembalikan counter berikutnya (misal "0003") berdasarkan jumlah kode unik yang sudah ada
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const prefix = searchParams.get('prefix') || ''
        const dmy = searchParams.get('dmy') || ''

        if (!prefix || !dmy) {
            return NextResponse.json({ counter: '0001' })
        }

        const client = await clientPromise
        const db = client.db("MabelHubStaging")
        const col = db.collection("input_database")

        // Hitung jumlah kode unik yang sudah pakai prefix+dmy ini
        const pattern = `^${prefix}-${dmy}-`
        const distinct = await col.distinct("code_input", {
            code_input: { $regex: pattern }
        })
        const namaPerusahaanArr = searchParams.getAll("namaPerusahaan");

        const matchStage: Record<string, any> = {};
        if (namaPerusahaanArr.length > 0) {
            matchStage["nama_perusahaan"] = { $in: namaPerusahaanArr };
        }

        
        const next = distinct.length + 1
        const counter = String(next).padStart(4, '0')

        return NextResponse.json({ counter })
    } catch (error) {
        console.error("[GET /api/input-database] Error:", error)
        return NextResponse.json({ counter: '0001' })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { header, items } = body

        if (!header || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Payload tidak valid: header atau items kosong" },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db("MabelHubStaging")
        const col = db.collection("input_database")

        const now = new Date()

        // Setiap item kontak disimpan sebagai dokumen terpisah bersama data header
        const docs = items.map((item: KontakItem) => ({
            // Data identifikasi
            code_input: header.codeInput || "",
            requestor: header.requestor || "",
            assigned_to: header.assignedToUserId || "",
            // Data perusahaan
            segmen: header.segmen || "",
            nama_perusahaan: header.namaPerusahaan || "",
            provinsi: header.provinsi || "",
            kota: header.kota || "",
            alamat: header.alamat || "",
            bidang_perusahaan: header.bidangPerusahaan || "",
            segmentasi: header.segmentasi || "",
            produk_relevan: header.produkRelevan || "",
            merek_tayang: header.merekTayang || "",
            merek_lainnya: header.merekLainnya || "",
            brand_owner: header.brandOwner || "",
            sumber_data: header.sumberData || "",
            sales_internal: header.salesInternal || "",
            link_produk: header.linkProduk || "",
            link_toko: header.linkToko || "",
            // Data kontak
            nama: item.nama || "",
            jabatan: item.jabatan || "",
            tipe_kontak: item.tipeKontak || "",
            no_telp: item.noTelp || "",
            email: item.email || "",
            // Metadata
            created_at: now,
            updated_at: now,
        }))
        const result = await col.insertMany(docs)

        return NextResponse.json(
            { success: true, inserted: result.insertedCount },
            { status: 201 }
        )
    } catch (error) {
        console.error("[POST /api/input-database] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        // id = code_input (e.g. "YTK-121225-0150")
        // header = object data perusahaan
        // items = array data kontak
        // oldData = snapshot sebelum revisi (untuk history)
        const { id, header, items, oldData, changedFields, revisedBy } = body

        if (!id || !header || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Payload tidak valid: id, header, atau items kosong" },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db("MabelHubStaging")
        const colMain = db.collection("input_database")
        const colHistory = db.collection("input_database_history")

        const now = new Date()

        // ── 1. Simpan history lengkap ke input_database_history ─────────────
        await colHistory.insertOne({
            code_input: id,
            revised_by: revisedBy || header.requestor || "unknown",
            revised_at: now,
            // Daftar field yang diubah beserta nilai lama & baru
            changed_fields: Array.isArray(changedFields) && changedFields.length > 0
                ? changedFields
                : [{ field: "(tidak ada perubahan terdeteksi)", oldValue: "", newValue: "" }],
            // Snapshot lengkap data sebelum revisi
            snapshot_before: oldData ?? null,
        })

        // ── 2. Siapkan dokumen baru ─────────────────────────────────────────
        const newDocs = items.map((item: any) => ({
            // Data identifikasi
            code_input: id,
            requestor: header.requestor || "",
            assigned_to: header.assignedToUserId || "",
            // Data perusahaan
            segmen: header.segmen || "",
            nama_perusahaan: header.namaPerusahaan || "",
            provinsi: header.provinsi || "",
            kota: header.kota || "",
            alamat: header.alamat || "",
            bidang_perusahaan: header.bidangPerusahaan || "",
            segmentasi: header.segmentasi || "",
            produk_relevan: header.produkRelevan || "",
            merek_tayang: header.merekTayang || "",
            merek_lainnya: header.merekLainnya || "",
            brand_owner: header.brandOwner || "",
            sumber_data: header.sumberData || "",
            sales_internal: header.salesInternal || "",
            link_produk: header.linkProduk || "",
            link_toko: header.linkToko || "",
            // Data kontak (dari item, bukan header)
            nama: item.nama || "",
            jabatan: item.jabatan || "",
            tipe_kontak: item.tipeKontak || "",
            no_telp: item.noTelp || "",
            email: item.email || "",
            // Metadata
            updated_at: now,
        }))

        // ── 3. Hapus dokumen lama lalu insert baru ──────────────────────────
        await colMain.deleteMany({ code_input: id })
        const insertResult = await colMain.insertMany(newDocs)

        return NextResponse.json(
            {
                success: true,
                updated: insertResult.insertedCount,
                message: `Data dengan kode ${id} berhasil direvisi`,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("[PUT /api/input-database] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}