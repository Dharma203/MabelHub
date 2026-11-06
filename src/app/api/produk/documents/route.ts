import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateIndo(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get("kategori");

    if (!kategori) {
      return NextResponse.json({ error: "Parameter kategori diperlukan" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_documents");

    const docs = await col.find({ categoryId: kategori }).sort({ createdAt: -1 }).toArray();

    const formattedDocs = docs.map((d: any) => ({
      id: d.id || d._id.toString(),
      name: d.name,
      type: d.type || "PDF",
      size: d.size || "1.0 MB",
      updatedAt: d.updatedAt || formatDateIndo(new Date(d.createdAt || Date.now())),
      url: d.url || "",
      isLocked: d.isLocked || false,
    }));

    return NextResponse.json(formattedDocs);
  } catch (error) {
    console.error("[GET /api/produk/documents] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoryId = formData.get("categoryId") as string | null;

    if (!file || !categoryId) {
      return NextResponse.json({ error: "File dan categoryId wajib diisi" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "produk");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name).toLowerCase().replace(".", "") || "bin";
    const cleanBase = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const filename = `${cleanBase}_${uniqueSuffix}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const docId = `doc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const docData = {
      id: docId,
      categoryId,
      name: file.name,
      type: ext.toUpperCase(),
      size: formatBytes(file.size),
      updatedAt: formatDateIndo(new Date()),
      url: `/uploads/produk/${filename}`,
      isLocked: false,
      createdAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db("MabelHub");
    await db.collection("product_documents").insertOne(docData);

    // Update docCount in category
    const actualCount = await db.collection("product_documents").countDocuments({ categoryId });
    await db.collection("product_categories").updateOne(
      { id: categoryId },
      { $set: { docCount: actualCount, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      document: {
        id: docData.id,
        name: docData.name,
        type: docData.type,
        size: docData.size,
        updatedAt: docData.updatedAt,
        url: docData.url,
        isLocked: docData.isLocked,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/produk/documents] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
