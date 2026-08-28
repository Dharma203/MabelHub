import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise
        const db = client.db('MabelHubStaging')

        const inputCol = db.collection("input_database");

        const filterBase = { tipe_kontak: { $ne: "WhatsApp" } };

        const [produk, perusahaan, provinsi, kota] = await Promise.all([
            inputCol.distinct("produk_relevan", { ...filterBase, produk_relevan: { $nin: ["", null] } }),
            inputCol.distinct("nama_perusahaan", { ...filterBase, nama_perusahaan: { $nin: ["", null] } }),
            inputCol.distinct("provinsi", { ...filterBase, provinsi: { $nin: ["", null] } }),
            inputCol.distinct("kota", { ...filterBase, kota: { $nin: ["", null] } }),
        ]);

        // Ekstrak bulan unik dari code_input (format: PREFIX-DDMMYY-COUNTER)
        // Contoh: YTK-011225-0012 → middle="011225" → DD=01, MM=12, YY=25 → "2025-12"
        const bulanAgg = await inputCol.aggregate([
            { $match: { code_input: { $exists: true, $ne: "" }, ...filterBase } },
            {
                $project: {
                    mid: { $arrayElemAt: [{ $split: ["$code_input", "-"] }, 1] }
                }
            },
            {
                $match: {
                    mid: { $exists: true },
                    $expr: { $eq: [{ $strLenCP: "$mid" }, 6] }
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

        // status_call & ke_sales → pilihan tetap (hardcoded), karena ini opsi yang sudah ditentukan
        // Tapi juga ambil dari tracking_call jika ada isian custom
        const callCol = db.collection("tracking_call");
        const [statusCallDb, keSalesDb] = await Promise.all([
            callCol.distinct("status_call", { status_call: { $nin: ["", null] } }),
            callCol.distinct("ke_sales", { ke_sales: { $nin: ["", null] } }),
        ]);

        const defaultStatusCall = [
            "Nomor tidak tersedia",
            "Nomor sedang sibuk",
            "Tidak di angkat",
            "Mailbox",
            "Di angkat respon positif",
            "Diangkat respon negatif"
        ];

        const defaultKeSales = [
            "Arie Muhamad Fajar",
            "Beffry Rizkana",
            "Ferrie Ferdinal",
        ];

        const status_call = [...new Set([...defaultStatusCall, ...statusCallDb])].sort();
        const ke_sales = [...new Set([...defaultKeSales, ...keSalesDb])].sort();

        return NextResponse.json({
            bulan,
            produk: produk.sort(),
            perusahaan: perusahaan.sort(),
            provinsi: provinsi.sort(),
            kota: kota.sort(),
            status_call,
            ke_sales,
        });
    } catch (error) {
        console.error("Error fetching filter options:", error);
        return NextResponse.json({ error: "Gagal mengambil opsi filter" }, { status: 500 });
    }
}