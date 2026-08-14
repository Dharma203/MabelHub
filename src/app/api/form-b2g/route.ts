import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { setAbortedLogsStyle } from "next/dist/server/node-environment-extensions/console-dim.external";

type KontakItem = {
    id: string
    nama: string
    jabatan: string
    role: string
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
        const col = db.collection("database_b2g")

        // Hitung jumlah kode unik yang sudah pakai prefix+dmy ini
        const pattern = `^${prefix}-${dmy}-`
        const distinct = await col.distinct("code_input", {
            code_input: { $regex: pattern }
        })
        const institusiKerjaArr = searchParams.getAll("institusiKerja");
        const satuanKerjaArr = searchParams.getAll("satuanKerja");

        const matchStage: Record<string, any> = {};
        if (institusiKerjaArr.length > 0) {
            matchStage["institusiKerja"] = { $in: institusiKerjaArr };
        }
        if (satuanKerjaArr.length > 0) {
            matchStage["satuanKerja"] = { $in: satuanKerjaArr};
        }

        
        const next = distinct.length + 1
        const counter = String(next).padStart(4, '0')

        return NextResponse.json({ counter })
    } catch (error) {
        console.error("[GET /api/database_b2g] Error:", error)
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
        const col = db.collection("database_b2g")

        const now = new Date()

        // Setiap item kontak disimpan sebagai dokumen terpisah bersama data header
        const docs = items.map((item: KontakItem) => ({
            // Data identifikasi
            code_input: header.codeInput || "",
            requestor: header.requestor || "",
            // Data perusahaan
            satuanKerja: header.satuanKerja || "",
            institusiKerja: header.institusiKerja || "",
            provinsi: header.provinsi || "",
            kota: header.kota || "",
            alamat: header.alamat || "",
            klpd: header.klpd || "",
            ring: header.ring || "",
            salesInternal: header.salesInternal || "",
            // Data kontak
            nama: item.nama || "",
            jabatan: item.jabatan || "",
            role: item.role || "",
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
        console.error("[POST /api/database_b2g] Error:", error)
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
        const colMain = db.collection("database_b2g")
        const colHistory = db.collection("database_b2g_history")

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
            // Data perusahaan
            segmen: header.segmen || "",
            satuanKerja: header.satuanKerja || "",
            institusiKerja: header.institusiKerja || "",
            segementasi: header.segmentasi || "",
            provinsi: header.provinsi || "",
            kota: header.kota || "",
            alamat: header.alamat || "",
            klpd: header.klpd || "",
            ring: header.ring || "",
            salesInternal: header.salesInternal || "",
            // Data kontak (dari item, bukan header)
            nama: item.nama || "",
            jabatan: item.jabatan || "",
            role: item.role || "",
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
        console.error("[PUT /api/database_b2g] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}