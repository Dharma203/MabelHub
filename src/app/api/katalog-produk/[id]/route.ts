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

    const client = await clientPromise;
    const db = client.db(getDbName());
    const col = db.collection("katalog_produk");

    const currentProduct = await col.findOne({ _id: new ObjectId(id) });
    if (!currentProduct) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateData = { ...body };
    delete updateData._id;
    updateData.updatedAt = new Date().toISOString();

    // Kalkulasi otomatis harga modal, harga tayang, fee admin, dan margin
    if (
      body.hargaProduk !== undefined ||
      body.hargaModal !== undefined ||
      body.feeAdminPersen !== undefined
    ) {
      const finalHarga =
        body.hargaProduk !== undefined
          ? Number(body.hargaProduk) || 0
          : Number(currentProduct.hargaProduk) || 0;
      const finalModal =
        body.hargaModal !== undefined
          ? Number(body.hargaModal) || 0
          : Number(currentProduct.hargaModal) || 0;
      const finalFeePersen =
        body.feeAdminPersen !== undefined
          ? Number(body.feeAdminPersen) || 0
          : Number(currentProduct.feeAdminPersen) || 0;
      const feeNominal = Math.round((finalHarga * finalFeePersen) / 100);
      const labaKotor = finalHarga - finalModal;
      const labaBersih = labaKotor - feeNominal;
      const persenMargin =
        finalHarga > 0 ? Math.round((labaBersih / finalHarga) * 1000) / 10 : 0;

      updateData.hargaProduk = finalHarga;
      updateData.hargaModal = finalModal;
      updateData.feeAdminPersen = finalFeePersen;
      updateData.feeAdminNominal = feeNominal;
      updateData.labaKotor = labaKotor;
      updateData.labaBersih = labaBersih;
      updateData.persenMargin = persenMargin;
    }

    // Logika pencatatan log riwayat stok
    let existingLogs = Array.isArray(currentProduct.riwayatStok)
      ? [...currentProduct.riwayatStok]
      : [];

    // Jika ada aksi cepat penyesuaian stok (quick adjustment)
    if (body.quickAdjustmentStok !== undefined && typeof body.quickAdjustmentStok === "number") {
      const delta = body.quickAdjustmentStok;
      const oldStock = Number(currentProduct.jumlahStok) || 0;
      const newStock = Math.max(0, oldStock + delta);
      updateData.jumlahStok = newStock;

      const logItem = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tanggal: new Date().toISOString(),
        tipe: delta > 0 ? "tambah" : "kurang",
        jumlahPerubahan: delta,
        stokSebelum: oldStock,
        stokSesudah: newStock,
        catatan: body.catatanPerubahanStok || (delta > 0 ? `Penambahan stok (+${delta})` : `Pengurangan stok (${delta})`),
        user: auth.session.fullName || auth.session.username || "Admin",
      };
      existingLogs.unshift(logItem);
      updateData.riwayatStok = existingLogs;
      delete updateData.quickAdjustmentStok;
      delete updateData.catatanPerubahanStok;
    } else if (body.jumlahStok !== undefined) {
      const newStock = Number(body.jumlahStok) || 0;
      const oldStock = Number(currentProduct.jumlahStok) || 0;
      const diff = newStock - oldStock;

      if (diff !== 0) {
        const logItem = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          tanggal: new Date().toISOString(),
          tipe: diff > 0 ? "tambah" : "kurang",
          jumlahPerubahan: diff,
          stokSebelum: oldStock,
          stokSesudah: newStock,
          catatan: body.catatanPerubahanStok || (diff > 0 ? `Penambahan stok (+${diff})` : `Pengurangan stok (${diff})`),
          user: auth.session.fullName || auth.session.username || "Admin",
        };
        existingLogs.unshift(logItem);
        updateData.riwayatStok = existingLogs;
      }
      delete updateData.catatanPerubahanStok;
    }

    const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

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
