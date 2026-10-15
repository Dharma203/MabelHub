/**
 * Resize (sisi terpanjang max `maxSize` px) dan kompres foto menjadi JPEG data URL.
 * Foto kamera 3-8 MB biasanya turun jadi sekitar 200-400 KB.
 *
 * ponytail: tanpa fallback <img> untuk browser lama tanpa createImageBitmap,
 * tambahkan hanya kalau ada user di browser yang terlalu tua.
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.7,
): Promise<string> {
  let bitmap: ImageBitmap
  try {
    // 'from-image' memutar foto sesuai EXIF, supaya foto potret HP tidak miring
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Gagal membaca file foto. Silakan pilih ulang foto.')
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Browser tidak mendukung kompres foto.')
  }

  // PNG transparan menjadi latar putih, karena JPEG tidak punya alpha
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', quality)
}
