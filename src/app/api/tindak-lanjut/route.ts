import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("MabelHubStaging");
        const col = db.collection("input_database");

        const { searchParams } = req.nextUrl;
        const page = Number(searchParams.get("page") ?? 1);
        const limit = Number(searchParams.get("limit") ?? 25);

        const skip = (page - 1) * limit;

        const totalNoTelp = await col.countDocuments({ no_telp: { $ne: "" } });
        const totalNama = await col.countDocuments({ nama: { $ne: "" } });
        const totalProvinsi = await col.countDocuments({ provinsi: { $ne: "" } });
        const totalKota = await col.countDocuments({ kota: { $ne: "" } });

        const pipeline: any[] = [
            {
                $match: {
                    no_telp: { $ne: "" },
                    nama: { $ne: "" },
                    provinsi: { $ne: "" },
                    kota: { $ne: "" }
                }
            },
            {
                $sort: { kode_input: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ];

        const [rows, totalRows] = await Promise.all([
            col.aggregate(pipeline).toArray(),
            col.countDocuments({
                no_telp: { $ne: "" },
                nama: { $ne: "" },
                provinsi: { $ne: "" },
                kota: { $ne: "" }
            })
        ]);

        return NextResponse.json({
            rows,
            totalRows,
            totalNoTelp,
            totalNama,
            totalProvinsi,
            totalKota
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return NextResponse.json(
            { error: "Failed to fetch data" },
            { status: 500 }
        );
    }
}