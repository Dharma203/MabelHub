import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DEFAULT_META: Record<string, { name: string; description: string }> = {
  brochure: { name: "Brochure", description: "Brosur produk & layanan" },
  catalogue: { name: "Catalogue", description: "Katalog produk lengkap" },
  "company-profile": { name: "Company Profile", description: "Profil perusahaan resmi" },
  datasheet: { name: "Datasheet", description: "Lembar data teknis produk" },
  "presentation-materials": { name: "Presentation Materials", description: "Materi presentasi sales" },
  pricelist: { name: "Pricelist", description: "Daftar harga produk & jasa" },
  "id-kit": { name: "ID KIT", description: "Identitas visual & kit brand" },
  tools: { name: "Tools", description: "Alat bantu & template kerja" },
  certification: { name: "Certification", description: "Sertifikat & akreditasi resmi" },
  legalitas: { name: "Legalitas", description: "Dokumen legal & perizinan" },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_categories");

    let category = await col.findOne({ id });

    // Fallback if not found in db
    if (!category) {
      const fallback = DEFAULT_META[id] || {
        name: id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        description: "",
      };
      return NextResponse.json({
        id,
        name: fallback.name,
        description: fallback.description,
        isLocked: false,
      });
    }

    return NextResponse.json({
      id: category.id,
      name: category.name,
      description: category.description || "",
      superAdminOnly: category.superAdminOnly || false,
      isLocked: category.isLocked || false,
    });
  } catch (error) {
    console.error("[GET /api/produk/categories/[id]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_categories");

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (typeof body.isLocked === "boolean") {
      updateData.isLocked = body.isLocked;
    }
    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    }

    const result = await col.updateOne({ id }, { $set: updateData }, { upsert: false });

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("[PATCH /api/produk/categories/[id]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_categories");
    const docCol = db.collection("product_documents");

    await col.deleteOne({ id });
    await docCol.deleteMany({ categoryId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/produk/categories/[id]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
