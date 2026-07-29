const FIELD_LABELS: Record<string, string> = {
  requestor: 'Penginput',
  satuanKerja: 'Satuan Kerja',
  institusiKerja: 'Institusi Kerja',
  segmentasi: 'Segmentasi',
  provinsi: 'Provinsi',
  kota: 'Kota',
  alamat: 'Alamat',
  klpd: 'KLPD',
  ring: 'RING',
  salesInternal: 'Sales Internal',
}

export function computeChangeFieldsB2G(
  oldSnap: { header: Record<string, string>; items: any[] } | null,
  newHeader: Record<string, string>,
  newItems: any[],
): { field: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; oldValue: string; newValue: string }[] = []
  if (!oldSnap) return changes

  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const oldVal = String(oldSnap.header[key] ?? '')
    const newVal = String(newHeader[key] ?? '')
    if (oldVal !== newVal) {
      changes.push({ field: label, oldValue: oldVal, newValue: newVal })
    }
  }

  const maxLen = Math.max(oldSnap.items.length, newItems.length)
  for (let i = 0; i < maxLen; i++) {
    const oldItem = oldSnap.items[i]
    const newItem = newItems[i]
    const prefix = `Kontak ${i + 1}`
    if (!oldItem && newItem) {
      changes.push({
        field: `${prefix}`,
        oldValue: '(tidak ada)',
        newValue: `${newItem.nama} – ${newItem.jabatan}`,
      })
      continue
    }
    if (oldItem && !newItem) {
      changes.push({
        field: `${prefix}`,
        oldValue: `${oldItem.nama} – ${oldItem.jabatan}`,
        newValue: '(dihapus)',
      })
      continue
    }
    const kontakFields: { key: keyof typeof oldItem; label: string }[] = [
      { key: 'nama', label: 'Nama' },
      { key: 'jabatan', label: 'Jabatan' },
      { key: 'role', label: 'Role'},
      { key: 'tipeKontak', label: 'Tipe Kontak' },
      { key: 'noTelp', label: 'No Kontak' },
      { key: 'email', label: 'Email' },
    ]
    for (const f of kontakFields) {
      const ov = String(oldItem[f.key] ?? '')
      const nv = String(newItem[f.key] ?? '')
      if (ov !== nv) {
        changes.push({
          field: `${prefix} – ${f.label}`,
          oldValue: ov,
          newValue: nv,
        })
      }
    }
  }

  return changes
}
