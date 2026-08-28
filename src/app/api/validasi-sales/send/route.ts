import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST (req: NextRequest) {
    try {
        const body = await req.json()

        if (!body || !body.source_id) {
            return NextResponse.json(
                { error: "Payload tidak valid: source_id diperlukan"},
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db("MabelHubStaging")
        const col = db.collection("validasi_sales")

        const now = new Date()

        //upsert
        const result = await col.updateOne(
            { source_id: body.source_id },
            {
                $set: {
                    source_id: body.source_id,
                    nama_perusahaan: body.nama_perusahaan ?? "",
                    sales_internal: body.sales_internal ?? "",
                    alamat: body.alamat ?? "",
                    kota: body.kota ?? "",
                    provinsi: body.provinsi ?? "",
                    pic: body.pic ?? "",
                    jabatan: body.jabatan ?? "",
                    produk: body.produk ?? "",
                    tipe_kontak: body.tipe_kontak ?? "",
                    no_telp: body.no_telp ?? "",
                    validasi: body.validasi ?? "",
                    detail_validasi: body.detail_validasi ?? "",
                    produk_relevan: body.produk_relevan ?? "",
                    tipe_penyedia: body.tipe_penyedia ?? "",
                    catatan: body.catatan ?? "",
                    status: body.status ?? "",
                    status_wa: body.status_wa ?? "",
                    updated_at: now,
                },
                $setOnInsert: {
                    created_at: now,
                },
            },
            { upsert: true },
        )

        const isNew = result.upsertedCount > 0
        return NextResponse.json(
            {
                success: true,
                action: isNew ? "inserted" : "updated",
                id: result.upsertedId?.toString() ?? body.source_id,
            },
            { status: isNew ? 201 : 200 }
        )
    } catch (error) {
        console.error("[POST /api/validasi-sales/send] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}