# 📋 Log Percakapan & Perubahan Kode — MabelHubStaging
**Tanggal:** 2 Mei 2026
**Developer:** Ramad
**Project:** MabelHubStaging (Next.js + MongoDB)

---

## ================================
## SESI 1 — Audit & Fix PUT /api/input-database
## ================================

### 🔍 Pertanyaan User:
"GET /api/input-database/YTK-121225-0150, apakah feature ini sudah benar code nya, dan outputnya bisa mengubah atau revisi data dengan ID tersebut, lalu data tersebut di kirim ke collection input-database-history, lalu di collection input-database datanya berubah sesuai form yang direvisi"

---

### 🐛 Bug yang Ditemukan

**File:** `src/app/api/input-database/route.ts` (L108-170)

#### Bug #1 — `newData.map()` crash
```
// SEBELUM (BUG):
const docs = newData.map((item: any) => ({
    code_input: newData.code_input || "",   // ← newData bukan array!
    ...
}))
```
**Penyebab:** `newData` adalah object header (bukan array), sehingga `.map()` akan crash atau menghasilkan hasil salah.

#### Bug #2 — Field kontak diambil dari header, bukan item
```
// SEBELUM (BUG):
nama: newData.nama || "",       // ← seharusnya item.nama
jabatan: newData.jabatan || "", // ← seharusnya item.jabatan
```

#### Bug #3 — Collection `input_database` tidak pernah diupdate
```
// SEBELUM (BUG):
const col = db.collection("input_database_history")  // ← hanya insert ke history
// TIDAK ADA operasi update ke input_database
```

#### Bug #4 — `handleKirim` di page.tsx selalu panggil POST (tidak pernah PUT)
```typescript
// SEBELUM (BUG) — selalu POST:
const res = await fetch('/api/input-database', {
  method: 'POST',   // ← harusnya PUT saat mode revisi
  ...
})
```

---

### ✅ Fix yang Dilakukan

#### File: `src/app/api/input-database/route.ts`

```typescript
// SESUDAH (FIX):
export async function PUT(req: Request) {
    try {
        const body = await req.json()
        // Payload baru: { id, header, items, oldData }
        const { id, header, items, oldData, changedFields, revisedBy } = body

        if (!id || !header || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Payload tidak valid: id, header, atau items kosong" },
                { status: 400 }
            )
        }

        const colMain = db.collection("input_database")
        const colHistory = db.collection("input_database_history")

        // ── 1. Simpan history ──────────────────────────────────────────────────
        await colHistory.insertOne({
            code_input: id,
            revised_by: revisedBy || header.requestor || "unknown",
            revised_at: now,
            changed_fields: Array.isArray(changedFields) && changedFields.length > 0
                ? changedFields
                : [{ field: "(tidak ada perubahan terdeteksi)", oldValue: "", newValue: "" }],
            snapshot_before: oldData ?? null,
        })

        // ── 2. Siapkan dokumen baru (field kontak dari item, bukan header) ─────
        const newDocs = items.map((item: any) => ({
            code_input: id,
            requestor: header.requestor || "",
            // ... semua field header ...
            nama: item.nama || "",       // ← BENAR: dari item
            jabatan: item.jabatan || "", // ← BENAR: dari item
            tipe_kontak: item.tipeKontak || "",
            no_telp: item.noTelp || "",
            email: item.email || "",
            updated_at: now,
        }))

        // ── 3. Hapus dokumen lama, insert baru ────────────────────────────────
        await colMain.deleteMany({ code_input: id })
        const insertResult = await colMain.insertMany(newDocs)

        return NextResponse.json({
            success: true,
            updated: insertResult.insertedCount,
            message: `Data dengan kode ${id} berhasil direvisi`,
        }, { status: 200 })
    } catch (error) { ... }
}
```

#### File: `src/app/input-database/page.tsx`

```typescript
// SESUDAH (FIX) — handleKirim mendeteksi mode revisi:
const handleKirim = async () => {
    const isRevisionMode = !!(searchParams.get('id')?.trim() || originalSnapshot)

    if (isRevisionMode) {
        // Panggil PUT
        res = await fetch('/api/input-database', {
            method: 'PUT',
            body: JSON.stringify({ id, header, items, oldData, changedFields, revisedBy }),
        })
    } else {
        // Panggil POST
        res = await fetch('/api/input-database', {
            method: 'POST',
            body: JSON.stringify({ header, items }),
        })
    }
}
```

**Label tombol juga berubah:**
- Mode baru → "Simpan Database"
- Mode revisi → "Simpan Revisi"

---

## ================================
## SESI 2 — Fix Snapshot History + Diff Perubahan Field
## ================================

### 🔍 Pertanyaan User:
"data snapshot tidak masuk ke input_database_history, perbaiki ini. lalu berikan keterangan user mengubah field apa, dan apa yang dirubah"

---

### 🐛 Root Cause
`oldData: null` selalu dikirim dari frontend → history tidak pernah tersimpan dengan isi.

---

### ✅ Fix yang Dilakukan

#### Tambahan di `src/app/input-database/page.tsx`

**1. Konstanta label field:**
```typescript
const FIELD_LABELS: Record<string, string> = {
  requestor: 'Penginput',
  segmen: 'Jenis Entitas',
  namaPerusahaan: 'Nama Perusahaan',
  provinsi: 'Provinsi',
  kota: 'Kota/Kabupaten',
  alamat: 'Alamat',
  bidangPerusahaan: 'Bidang Usaha',
  segmentasi: 'Segmentasi',
  produkRelevan: 'Produk Relevan',
  merekTayang: 'Merek Tayang',
  brandOwner: 'Brand Owner',
  sumberData: 'Sumber Data',
  linkProduk: 'Link Produk',
  linkToko: 'Link Toko',
}
```

**2. Fungsi `computeChangedFields()`:**
```typescript
function computeChangedFields(
  oldSnap: { header: Record<string, string>; items: any[] } | null,
  newHeader: Record<string, string>,
  newItems: any[]
): { field: string; oldValue: string; newValue: string }[] {
  const changes = []
  if (!oldSnap) return changes

  // Bandingkan header field by field
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const oldVal = String(oldSnap.header[key] ?? '')
    const newVal = String(newHeader[key] ?? '')
    if (oldVal !== newVal) {
      changes.push({ field: label, oldValue: oldVal, newValue: newVal })
    }
  }

  // Bandingkan items kontak per-index
  const maxLen = Math.max(oldSnap.items.length, newItems.length)
  for (let i = 0; i < maxLen; i++) {
    // Cek tambah kontak, hapus kontak, atau ubah field kontak
    const kontakFields = ['nama', 'jabatan', 'tipeKontak', 'noTelp', 'email']
    // ...
  }

  return changes
}
```

**3. State `originalSnapshot`:**
```typescript
// Disimpan saat form pertama kali di-load (via URL ?id= atau tombol Cari Kode)
const [originalSnapshot, setOriginalSnapshot] = useState<{
  header: Record<string, string>;
  items: any[]
} | null>(null)
```

**4. Di-set saat auto-load (useEffect) dan handleCariKode:**
```typescript
setOriginalSnapshot({
  header: {
    requestor: header?.requestor ?? '',
    segmen: header?.segmen ?? '',
    namaPerusahaan: header?.namaPerusahaan ?? '',
    // ... semua field header ...
  },
  items: kontakItems,
})
```

**5. handleKirim mode revisi sekarang kirim data lengkap:**
```typescript
const changedFields = computeChangedFields(
  originalSnapshot,
  headerPayload,
  itemsPayload
)

body: JSON.stringify({
  id: generatedCode,
  header: headerPayload,
  items: itemsPayload,
  oldData: originalSnapshot,      // ← snapshot sebelum revisi (tidak null lagi)
  changedFields,                  // ← daftar field yang berubah
  revisedBy: requestor || user?.fullName || '',
})
```

**Contoh dokumen yang tersimpan di `input_database_history`:**
```json
{
  "code_input": "YTK-121225-0150",
  "revised_by": "Aliya",
  "revised_at": "2026-05-02T04:41:00Z",
  "changed_fields": [
    { "field": "Nama Perusahaan", "oldValue": "PT Lama", "newValue": "PT Baru" },
    { "field": "Kontak 1 – No Kontak", "oldValue": "08111", "newValue": "08222" }
  ],
  "snapshot_before": {
    "header": { ... },
    "items": [ ... ]
  }
}
```

---

## ================================
## SESI 3 — Tampilkan Riwayat Revisi di Tracking Database
## ================================

### 🔍 Pertanyaan User:
"di row ini, berikan function yang mengambil update terbaru dari id yang datanya baru di revisi di input_database_history"
(merujuk ke L1101: `<DetailItem icon='📝' label='Keterangan Update' value={selected.newDocs} />`)

---

### ✅ Yang Diimplementasikan

#### File Baru: `src/app/api/input-database/history/[code]/route.ts`

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const col = db.collection('input_database_history')

  // Ambil entri terbaru (sort revised_at descending)
  const latest = await col
    .find({ code_input: code.trim() })
    .sort({ revised_at: -1 })
    .limit(1)
    .toArray()

  if (!latest || latest.length === 0) {
    return NextResponse.json({ found: false, message: 'Belum ada riwayat revisi' })
  }

  const doc = latest[0]
  return NextResponse.json({
    found: true,
    code_input: doc.code_input,
    revised_by: doc.revised_by ?? '-',
    revised_at: doc.revised_at ?? null,
    changed_fields: doc.changed_fields ?? [],
    snapshot_before: doc.snapshot_before ?? null,
  })
}
```

#### File: `src/app/tracking-database/page.tsx`

**1. Tambah type `LatestRevision`:**
```typescript
type LatestRevision = {
  found: boolean
  code_input?: string
  revised_by?: string
  revised_at?: string
  changed_fields?: { field: string; oldValue: string; newValue: string }[]
  snapshot_before?: any
}
```

**2. Tambah state dan auto-fetch:**
```typescript
const [latestRevision, setLatestRevision] = useState<LatestRevision | null>(null)
const [loadingRevision, setLoadingRevision] = useState(false)

// Auto-fetch saat row di-expand
useEffect(() => {
  if (!selected?.kode) {
    setLatestRevision(null)
    return
  }
  setLoadingRevision(true)
  fetch(`/api/input-database/history/${encodeURIComponent(selected.kode)}`)
    .then(r => r.json())
    .then((data: LatestRevision) => setLatestRevision(data))
    .catch(() => setLatestRevision({ found: false }))
    .finally(() => setLoadingRevision(false))
}, [selected?.kode])
```

**3. Render "Keterangan Update" — tampilan baru (menggantikan DetailItem lama):**

Menampilkan 3 state:
- **Loading:** "Memuat riwayat..."
- **Tidak ada history:** "Belum ada riwayat revisi"
- **Ada history:**
  ```
  Direvisi oleh Aliya pada 02 Mei 2026, 11:30
    Nama Perusahaan: PT Lama → PT Baru
    Kontak 1 – No Kontak: 08111 → 08222
  ```

---

## ================================
## RINGKASAN FILE YANG DIMODIFIKASI
## ================================

| No | File | Jenis | Keterangan |
|----|------|-------|------------|
| 1 | `src/app/api/input-database/route.ts` | Dimodifikasi | Fix PUT handler (payload, history, update collection) |
| 2 | `src/app/input-database/page.tsx` | Dimodifikasi | originalSnapshot, computeChangedFields, mode revisi PUT |
| 3 | `src/app/api/input-database/history/[code]/route.ts` | **Baru dibuat** | GET history terbaru dari input_database_history |
| 4 | `src/app/tracking-database/page.tsx` | Dimodifikasi | LatestRevision type, auto-fetch history, render diff UI |

---

## ================================
## ALUR KERJA FITUR REVISI (SETELAH FIX)
## ================================

```
1. User buka /tracking-database
2. User klik tombol ✏️ (Revisi) pada row → router.push('/input-database?id=YTK-121225-0150')
3. Halaman /input-database load:
   - useEffect deteksi ?id= di URL
   - Fetch GET /api/input-database/YTK-121225-0150
   - Form terisi otomatis dengan data existing
   - originalSnapshot disimpan di state (snapshot data SEBELUM edit)
4. User edit form, klik "Simpan Revisi"
5. handleKirim:
   - isRevisionMode = true (ada ?id= dan originalSnapshot)
   - computeChangedFields(originalSnapshot, newHeader, newItems)
   - Fetch PUT /api/input-database dengan: { id, header, items, oldData, changedFields, revisedBy }
6. Backend PUT handler:
   - INSERT ke input_database_history (audit trail lengkap)
   - DELETE docs lama dari input_database (by code_input)
   - INSERT docs baru ke input_database
7. User kembali ke /tracking-database
8. User expand row → Keterangan Update:
   - Fetch GET /api/input-database/history/YTK-121225-0150
   - Tampilkan: siapa yang revisi, kapan, field apa yang berubah (lama → baru)
```

---

*Dokumen dibuat otomatis oleh Antigravity AI — 2 Mei 2026*
