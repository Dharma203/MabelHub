import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { unlink } from "fs/promises";
import path from "path";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID dokumen diperlukan" }, { status: 400 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_documents");

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (typeof body.isLocked === "boolean") {
      updateData.isLocked = body.isLocked;
    }

    const res = await col.updateOne(
      { $or: [{ id }, { _id: id as any }] },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, modifiedCount: res.modifiedCount });
  } catch (error) {
    console.error("[PATCH /api/produk/documents/[id]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID dokumen diperlukan" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_documents");

    const doc = await col.findOne({ $or: [{ id }, { _id: id as any }] });
    if (!doc) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    // Try deleting physical file if in /uploads/produk/
    if (doc.url && doc.url.startsWith("/uploads/produk/")) {
      try {
        const fullPath = path.join(process.cwd(), "public", doc.url);
        await unlink(fullPath);
      } catch (err) {
        // Ignore file removal errors if file was already removed
      }
    }

    await col.deleteOne({ _id: doc._id });

    // Decrement or update docCount in category
    if (doc.categoryId) {
      const actualCount = await col.countDocuments({ categoryId: doc.categoryId });
      await db.collection("product_categories").updateOne(
        { id: doc.categoryId },
        { $set: { docCount: actualCount, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/produk/documents/[id]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

