import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/**
 * Normaliza status_wa: konversi en-dash (–) / em-dash (—) → hyphen (-),
 * trim spasi berlebih, dan mapping alias ke nilai canonical.
 */
function normalizeStatusWa(val: string): string {
    if (!val) return ''
    let s = val
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
    if (s === '-') return ''
    const aliases: Record<string, string> = {
        'Aktif Broadcast': 'Aktif Progres',
    }
    return aliases[s] ?? s
}

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("MabelHubStaging");

        // bulan, perusahaan, produk, provinsi, kota → dari input_database (sumber data utama)
        const inputCol = db.collection("input_database");

        const [produk, perusahaan, provinsi, kota, pic] = await Promise.all([
            inputCol.distinct("produk_relevan", { produk_relevan: { $nin: ["", null] } }),
            inputCol.distinct("nama_perusahaan", { nama_perusahaan: { $nin: ["", null] } }),
            inputCol.distinct("provinsi", { provinsi: { $nin: ["", null] } }),
            inputCol.distinct("kota", { kota: { $nin: ["", null] } }),
            inputCol.distinct("nama", { nama: { $nin: ["", null] } }),
        ]);

        // Ekstrak bulan unik dari code_input (format: PREFIX-DDMMYY-COUNTER)
        // Contoh: YTK-011225-0012 → middle="011225" → DD=01, MM=12, YY=25 → "2025-12"
        const bulanAgg = await inputCol.aggregate([
            { $match: { code_input: { $exists: true, $ne: "" } } },
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

        // status_wa & ke_sales → pilihan tetap (hardcoded), karena ini opsi yang sudah ditentukan
        // Tapi juga ambil dari tracking_broadcast jika ada isian custom
        const broadcastCol = db.collection("tracking_broadcast");
        const [statusWaDb, keSalesDb] = await Promise.all([
            broadcastCol.distinct("status_wa", { status_wa: { $nin: ["", null] } }),
            broadcastCol.distinct("ke_sales", { ke_sales: { $nin: ["", null] } }),
        ]);

        // Normalize DB values to eliminate en-dash/em-dash duplicates
        const normalizedStatusWaDb = statusWaDb
            .map(s => normalizeStatusWa(s))
            .filter(s => s !== '');

        // Merge dengan pilihan default supaya tetap muncul walau tracking_broadcast masih kosong
        const defaultStatusWa = [
            "Nomor Invalid",
            "Terkirim (1C)",
            "Diterima (2C)",
            "Dibaca - Belum Respons",
            "Dibaca - Respons Positif",
            "Dibaca - Respons Netral",
            "Dibaca - Respons Negatif",
            "Aktif Progres",
        ];
        const defaultKeSales = [
            "Arie Muhamad Fajar",
            "Beffry Rizkana",
            "Ferrie Ferdinal",
        ];

        const status_wa = [...new Set([...defaultStatusWa, ...normalizedStatusWaDb])].sort();
        const ke_sales = [...new Set([...defaultKeSales, ...keSalesDb])].sort();

        return NextResponse.json({
            bulan,
            produk: produk.sort(),
            perusahaan: perusahaan.sort(),
            provinsi: provinsi.sort(),
            kota: kota.sort(),
            pic: pic.sort(),
            status_wa,
            ke_sales,
        });
    } catch (error) {
        console.error("Error fetching filter options:", error);
        return NextResponse.json({ error: "Gagal mengambil opsi filter" }, { status: 500 });
    }
}