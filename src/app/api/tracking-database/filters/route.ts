import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("MabelHub");
        const col = db.collection("input_database");

        // Ambil distinct values untuk filter (non-date fields)
        const [produk, merek, perusahaan, provinsi, kota, tipe] = await Promise.all([
            col.distinct("produk_relevan", { produk_relevan: { $nin: ["", null] } }),
            col.distinct("merek_tayang", { merek_tayang: { $nin: ["", null] } }),
            col.distinct("nama_perusahaan", { nama_perusahaan: { $nin: ["", null] } }),
            col.distinct("provinsi", { provinsi: { $nin: ["", null] } }),
            col.distinct("kota", { kota: { $nin: ["", null] } }),
            col.distinct("tipe_kontak", { tipe_kontak: { $nin: ["", null] } }),
        ]);

        // Ekstrak bulan unik dari code_input (format: PREFIX-DDMMYY-COUNTER)
        // Contoh: YTK-011225-0012 → middle="011225" → DD=01, MM=12, YY=25 → "2025-12"
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

        const bulan = bulanAgg
            .map(r => r._id as string)
            .filter(b => /^\d{4}-\d{2}$/.test(b));

        return NextResponse.json({
            bulan,
            produk: produk.sort(),
            merek: merek.sort(),
            perusahaan: perusahaan.sort(),
            provinsi: provinsi.sort(),
            kota: kota.sort(),
            tipe: tipe.sort(),
        });
    } catch (error) {
        console.error("Error fetching filter options:", error);
        return NextResponse.json({ error: "Gagal mengambil opsi filter" }, { status: 500 });
    }
}
