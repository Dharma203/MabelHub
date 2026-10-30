import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const client = await clientPromise;
    const db = client.db(getDbName());
    const col = db.collection("katalog_produk");

    let product = null;
    if (ObjectId.isValid(id)) {
      product = await col.findOne({ _id: new ObjectId(id) });
    }

    if (!product) {
      // Also check if id is SKU or namaProduk slug
      product = await col.findOne({
        $or: [{ sku: id }, { namaProduk: new RegExp(`^${id}$`, "i") }],
      });
    }

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        _id: product._id.toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/katalog-produk/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = assertLoggedIn(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Hanya Admin dan Superadmin yang dapat mengubah produk" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json();
    const updateData = { ...body };
    delete updateData._id;
    updateData.updatedAt = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db(getDbName());
    const result = await db
      .collection("katalog_produk")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui",
    });
  } catch (error) {
    console.error("[PUT /api/katalog-produk/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui produk" },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = assertLoggedIn(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Hanya Admin dan Superadmin yang dapat menghapus produk" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDbName());
    const result = await db
      .collection("katalog_produk")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus",
    });
  } catch (error) {
    console.error("[DELETE /api/katalog-produk/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus produk" },
      { status: 500 }
    );
  }
}
