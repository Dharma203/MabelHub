# Log Problem: Dark Mode Reverting on Page Refresh

## Deskripsi Masalah
Aplikasi sudah di-*deploy* ke server Hostinger (https://mabel-hub.co.id/). Saat pengaturan sistem operasi (OS) berada pada mode gelap (*dark mode*), aplikasi berhasil menampilkan desain mode gelap di awal. Namun, ketika halaman di-*refresh* (F5 / muat ulang), tampilan aplikasi langsung ter-reset kembali menjadi mode terang (*light mode*), meskipun settingan OS pengguna masih berada pada mode gelap.

## Analisis Penyebab (Root Cause)
1. **Sifat Bawaan Tailwind CSS v4**: Secara *default*, Tailwind v4 mendeteksi *dark mode* hanya dengan memanfaatkan CSS media query murni (`@media (prefers-color-scheme: dark)`).
2. **Hydration Mismatch pada SSR (Next.js)**: Saat halaman di-*refresh* pada environment *production* seperti Hostinger, Next.js akan me-render HTML (Server-Side Rendering) sebelum status pengaturan browser sepenuhnya bisa dieksekusi. Ketidakadaan penanda persisten seperti `localStorage` dan manipulasi DOM sinkronisasi sering kali membuat *layout* ter-reset ke *state* standar (mode terang) dari rehidrasi React.
3. Ketiadaan manajemen sinkronisasi tema ini membuat CSS tidak mampu menahan status tema saat *page load lifecycle* bergulir di React App Router, mengakibatkan *flash of light mode* atau tertahannya mode terang secara permanen.

## Solusi Implementasi (Resolution)
Untuk mengatasi masalah ini secara stabil agar mode tidak ter-reset, *dark mode* diubah strateginya menjadi **class-based strategy** dengan menggunakan library standar Next.js yaitu `next-themes`.

### Langkah-langkah Perbaikan:
1. **Instalasi `next-themes`**: 
   Menambahkan package `next-themes` untuk mengelola penyisipan tema pada level DOM, menyimpan preferensi di `localStorage`, serta menyelaraskan tema SSR dan Client tanpa *hydration warning*.

2. **Menambahkan Custom Variant Tailwind v4**:
   Pada `src/app/globals.css`, ditambahkan instruksi custom agar Tailwind menggunakan mode gelap berbasis *class selector*, bukan sekadar *media query*.
   ```css
   @import "tailwindcss";
   @variant dark (&:where(.dark, .dark *));
   ```

3. **Membuat Client Component `<ThemeProvider>`**:
   Membuat file `src/components/theme/ThemeProvider.tsx` sebagai pembungkus komponen *Provider* dari `next-themes`. Hal ini wajib karena React Context (provider tema) harus berupa *Client Component* (`"use client"`).

4. **Injeksi Tema pada `RootLayout` (`src/app/layout.tsx`)**:
   - Menambahkan atribut `suppressHydrationWarning` ke dalam tag `<html>`. Ini penting agar Next.js tidak menampilkan error jika ada skrip yang mengganti nama *class* `<html>` saat proses render awal.
   - Membungkus seluruh aplikasi dengan:
     ```tsx
     <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
     ```
     Aturan ini secara cerdas akan langsung memetakan mode OS (melalui `enableSystem`) menjadi class `.dark` di element HTML, sehingga statusnya selalu tertahan dan awet sekalipun halaman di-*refresh* jutaan kali.

## Status Penyelesaian
**Resolved (Selesai)**. Mode gelap telah menjadi persisten dan sinkron secara konsisten dengan sistem operasi pengguna.
