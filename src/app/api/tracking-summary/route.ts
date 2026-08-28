import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"


export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise
        const db = client.db('MabelHub')
        const Broadcol = db.collection('tracking_broadcast')
        const Callcol = db.collection('tracking_call')
        const Valcol = db.collection('validasi_sales')
        const Dbcol = db.collection('input_database')
    }
}