import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        if (!body || !body.source_id) {
            return NextResponse.json(
                { error: "Payload tidak valid: source_id diperlukan" },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db("MabelHub")
        const col = db.collection("tracking_broadcast")

        const now = new Date()

        // Upsert berdasarkan source_id agar tidak duplikat jika dikirim ulang
        const result = await col.updateOne(
            { source_id: body.source_id },
            {
                $set: {
                    source_id: body.source_id,
                    kode: body.kode ?? "",
                    nama_perusahaan: body.nama_perusahaan ?? "",
                    produk: body.produk ?? "",
                    merek_tayang: body.merek_tayang ?? "",
                    kota: body.kota ?? "",
                    provinsi: body.provinsi ?? "",
                    pic: body.pic ?? "",
                    jabatan: body.jabatan ?? "",
                    telp: body.telp ?? "",
                    email: body.email ?? "",
                    alamat: body.alamat ?? "",
                    segmen: body.segmen ?? "",
                    segmentasi: body.segmentasi ?? "",
                    tipe: body.tipe ?? "",
                    bidang_perusahaan: body.bidang_perusahaan ?? "",
                    brand_owner: body.brand_owner ?? "",
                    sumber_date: body.sumber_date ?? "",
                    sumber_lain: body.sumber_lain ?? "",
                    link_produk: body.link_produk ?? "",
                    link_toko: body.link_toko ?? "",
                    penginput: body.penginput ?? "",
                    jenis_entitas: body.jenis_entitas ?? "",
                    bulan_data: body.bulan_data ?? "",
                    status_wa: body.status_wa ?? "",
                    detail_update: body.detail_update ?? "",
                    ke_sales: body.ke_sales ?? "",
                    sent_at: body.sent_at ?? now.toISOString(),
                    updated_at: now,
                },
                $setOnInsert: {
                    created_at: now,
                },
            },
            { upsert: true }
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
        console.error("[POST /api/tracking-broadcast/send] Error:", error)
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        )
    }
}
