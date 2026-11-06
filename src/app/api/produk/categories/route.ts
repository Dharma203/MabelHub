import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const ALL_CATEGORIES = [
  { id: "brochure", name: "Brochure", docCount: 0, iconBg: "bg-[#1D80D9]/10 text-[#1D80D9]", superAdminOnly: false, isLocked: false, description: "Brosur produk & layanan" },
  { id: "catalogue", name: "Catalogue", docCount: 0, iconBg: "bg-purple-100 text-purple-600", superAdminOnly: false, isLocked: false, description: "Katalog produk lengkap" },
  { id: "company-profile", name: "Company Profile", docCount: 0, iconBg: "bg-orange-100 text-orange-600", superAdminOnly: false, isLocked: false, description: "Profil perusahaan resmi" },
  { id: "datasheet", name: "Datasheet", docCount: 0, iconBg: "bg-pink-100 text-pink-600", superAdminOnly: false, isLocked: false, description: "Lembar data teknis produk" },
  { id: "presentation-materials", name: "Presentation Materials", docCount: 0, iconBg: "bg-violet-100 text-violet-600", superAdminOnly: false, isLocked: false, description: "Materi presentasi sales" },
  { id: "pricelist", name: "Pricelist", docCount: 0, iconBg: "bg-emerald-100 text-emerald-600", superAdminOnly: false, isLocked: false, description: "Daftar harga produk & jasa" },
  { id: "id-kit", name: "ID KIT", docCount: 0, iconBg: "bg-rose-100 text-rose-600", superAdminOnly: false, isLocked: false, description: "Identitas visual & kit brand" },
  { id: "tools", name: "Tools", docCount: 0, iconBg: "bg-cyan-100 text-cyan-600", superAdminOnly: false, isLocked: false, description: "Alat bantu & template kerja" },
  { id: "certification", name: "Certification", docCount: 0, iconBg: "bg-yellow-100 text-yellow-600", superAdminOnly: true, isLocked: false, description: "Sertifikat & akreditasi resmi" },
  { id: "legalitas", name: "Legalitas", docCount: 0, iconBg: "bg-indigo-100 text-indigo-600", superAdminOnly: true, isLocked: false, description: "Dokumen legal & perizinan" },
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_categories");
    const docCol = db.collection("product_documents");

    let categories = await col.find({}).toArray();

    // If empty, insert defaults
    if (categories.length === 0) {
      await col.insertMany(ALL_CATEGORIES.map(cat => ({ ...cat, createdAt: new Date() })));
      categories = await col.find({}).toArray();
    }

    // Map categories with actual docCount and isLocked
    const formattedCategories = await Promise.all(
      categories.map(async (cat: any) => {
        const actualDocCount = await docCol.countDocuments({ categoryId: cat.id });
        return {
          id: cat.id,
          name: cat.name,
          docCount: actualDocCount,
          iconBg: cat.iconBg || "bg-[#1D80D9]/10 text-[#1D80D9]",
          superAdminOnly: cat.superAdminOnly || false,
          isLocked: cat.isLocked || false,
          description: cat.description || "",
        };
      })
    );

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error("[GET /api/produk/categories] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, superAdminOnly, iconBg, isLocked } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("MabelHub");
    const col = db.collection("product_categories");

    // Check if category already exists
    const existing = await col.findOne({ id });
    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }

    const newCategory = {
      id,
      name,
      description: description || "",
      superAdminOnly: superAdminOnly || false,
      isLocked: isLocked || false,
      iconBg: iconBg || "bg-[#1D80D9]/10 text-[#1D80D9]",
      docCount: 0,
      createdAt: new Date(),
    };

    await col.insertOne(newCategory);

    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/produk/categories] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
