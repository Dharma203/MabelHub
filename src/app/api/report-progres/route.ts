import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("MabelHubStaging");
    const colInput = db.collection("input_database");
    const colBroadcast = db.collection("tracking_broadcast");
    const colValidasi = db.collection("validasi_sales");

    const { searchParams } = req.nextUrl;
    const sumberData = searchParams.get("sumberData") || "semua";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // Multiple values for filters
    const picSalesArr = searchParams.getAll("pic_sales");
    const validitasArr = searchParams.getAll("validitas");
    const provinsiArr = searchParams.getAll("provinsi");
    const statusWaArr = searchParams.getAll("status_wa");

    // Build common filter for input_database
    const filterInput: any = {};
    if (startDate || endDate) {
      filterInput.created_at = {};
      if (startDate) filterInput.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filterInput.created_at.$lte = end;
      }
    }
    if (picSalesArr.length > 0) filterInput.penginput = { $in: picSalesArr };
    if (provinsiArr.length > 0) filterInput.provinsi = { $in: provinsiArr };
    // input_database doesn't have status_wa natively, but we might want to filter by validitas
    
    // Build common filter for tracking_broadcast
    const filterBroadcast: any = {};
    if (startDate || endDate) {
      filterBroadcast.created_at = {};
      if (startDate) filterBroadcast.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filterBroadcast.created_at.$lte = end;
      }
    }
    if (picSalesArr.length > 0) filterBroadcast.ke_sales = { $in: picSalesArr };
    if (provinsiArr.length > 0) filterBroadcast.provinsi = { $in: provinsiArr };
    if (statusWaArr.length > 0) filterBroadcast.status_wa = { $in: statusWaArr };

    // Validitas filter
    let validasiCompanies: string[] = [];
    if (validitasArr.length > 0) {
      const validasiDocs = await colValidasi.find({ validasi: { $in: validitasArr } }).toArray();
      validasiCompanies = validasiDocs.map(d => d.nama_perusahaan);
      filterInput.nama_perusahaan = { $in: validasiCompanies };
      filterBroadcast.nama_perusahaan = { $in: validasiCompanies };
    }

    // Determine what to query based on sumberData
    const sumberDataLower = sumberData.toLowerCase();
    let runInput = sumberDataLower === "semua" || sumberDataLower === "validasi sales";
    let runBroadcast = sumberDataLower === "semua" || sumberDataLower === "report wa";

    const [inputDocs, broadcastDocs, allValidasi] = await Promise.all([
      runInput ? colInput.find(filterInput).toArray() : Promise.resolve([]),
      runBroadcast ? colBroadcast.find(filterBroadcast).toArray() : Promise.resolve([]),
      colValidasi.find({}).toArray() // Fetch all to map validitas later
    ]);

    const validasiMap = new Map(allValidasi.map(v => [v.nama_perusahaan, v.validasi]));

    // --- Compute Dashboard Stats ---

    const totalLaporanSales = inputDocs.length;
    const totalReportWa = broadcastDocs.length;

    const uniqueCompanies = new Set([
      ...inputDocs.map(d => d.nama_perusahaan).filter(Boolean),
      ...broadcastDocs.map(d => d.nama_perusahaan).filter(Boolean)
    ]);
    const unikPerusahaan = uniqueCompanies.size;

    const uniquePicSales = new Set([
      ...inputDocs.map(d => d.penginput).filter(Boolean),
      ...broadcastDocs.map(d => d.ke_sales).filter(Boolean)
    ]);
    const aktifPicSales = uniquePicSales.size;

    // --- Chart Validitas ---
    const validitasCount: Record<string, number> = {};
    uniqueCompanies.forEach(comp => {
      const val = validasiMap.get(comp) || "Not Yet";
      validitasCount[val] = (validitasCount[val] || 0) + 1;
    });
    const chartValiditas = Object.entries(validitasCount).map(([name, value]) => ({ name, value }));

    // --- Chart Status WA ---
    const statusWaCount: Record<string, number> = {};
    broadcastDocs.forEach(d => {
      const status = d.status_wa || "Kosong";
      statusWaCount[status] = (statusWaCount[status] || 0) + 1;
    });
    const chartStatusWa = Object.entries(statusWaCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // --- Chart Provinsi ---
    const provinsiCount: Record<string, number> = {};
    [...inputDocs, ...broadcastDocs].forEach(d => {
      const prov = d.provinsi || "Lainnya";
      provinsiCount[prov] = (provinsiCount[prov] || 0) + 1;
    });
    const chartProvinsi = Object.entries(provinsiCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // --- Tren Laporan per Bulan ---
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const trenMap: Record<string, { validasiSales: number, reportWa: number }> = {};
    
    // Initialize all months of current year or from data
    inputDocs.forEach(d => {
      if (d.created_at) {
        const date = new Date(d.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!trenMap[key]) trenMap[key] = { validasiSales: 0, reportWa: 0 };
        trenMap[key].validasiSales++;
      }
    });
    broadcastDocs.forEach(d => {
      if (d.created_at) {
        const date = new Date(d.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!trenMap[key]) trenMap[key] = { validasiSales: 0, reportWa: 0 };
        trenMap[key].reportWa++;
      }
    });

    const chartTren = Object.keys(trenMap).sort().map(key => {
      const [year, month] = key.split('-');
      return {
        name: `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`,
        validasiSales: trenMap[key].validasiSales,
        reportWa: trenMap[key].reportWa
      };
    });

    // --- Progress per PIC Sales ---
    const picProgressMap: Record<string, { validasiSalesCount: number, totalCompanies: Set<string> }> = {};
    inputDocs.forEach(d => {
      const pic = d.penginput || "Unknown";
      if (!picProgressMap[pic]) picProgressMap[pic] = { validasiSalesCount: 0, totalCompanies: new Set() };
      picProgressMap[pic].validasiSalesCount++;
      if (d.nama_perusahaan) picProgressMap[pic].totalCompanies.add(d.nama_perusahaan);
    });
    broadcastDocs.forEach(d => {
      const pic = d.ke_sales || "Unknown";
      if (!picProgressMap[pic]) picProgressMap[pic] = { validasiSalesCount: 0, totalCompanies: new Set() };
      if (d.nama_perusahaan) picProgressMap[pic].totalCompanies.add(d.nama_perusahaan);
    });

    const progressPicSales = Object.entries(picProgressMap).map(([pic, data], idx) => ({
      no: idx + 1,
      pic,
      unik: data.totalCompanies.size,
      progress: data.validasiSalesCount // Or whatever metric best represents 'progress'
    })).sort((a, b) => b.unik - a.unik);

    // --- Detail Data ---
    const detailData = [];
    let detailIdx = 1;
    // Interleave or just append, let's just append and limit to top 100 for performance on UI
    for (const d of inputDocs.slice(0, 50)) {
      detailData.push({
        no: detailIdx++,
        tanggal: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '',
        pic: d.penginput || '',
        perusahaan: d.nama_perusahaan || '',
        kota: d.kota || '',
        provinsi: d.provinsi || '',
        validitas: validasiMap.get(d.nama_perusahaan) || 'Not Yet',
        source: 'Validasi Sales'
      });
    }
    for (const d of broadcastDocs.slice(0, 50)) {
      detailData.push({
        no: detailIdx++,
        tanggal: d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '',
        pic: d.ke_sales || '',
        perusahaan: d.nama_perusahaan || '',
        kota: d.kota || '',
        provinsi: d.provinsi || '',
        validitas: validasiMap.get(d.nama_perusahaan) || 'Not Yet',
        source: 'Report WA'
      });
    }

    // --- Filter Options (for dynamic dropdowns) ---
    // Extract unique values from raw collections to provide filter options even if current selection is narrow
    const rawPicSales = Array.from(new Set([...inputDocs.map(d=>d.penginput), ...broadcastDocs.map(d=>d.ke_sales)])).filter(Boolean);
    const rawProvinsi = Array.from(new Set([...inputDocs.map(d=>d.provinsi), ...broadcastDocs.map(d=>d.provinsi)])).filter(Boolean);
    const rawStatusWa = Array.from(new Set(broadcastDocs.map(d=>d.status_wa))).filter(Boolean);
    const rawValiditas = Array.from(new Set(allValidasi.map(d=>d.validasi))).filter(Boolean);

    return NextResponse.json({
      totalLaporanSales,
      totalReportWa,
      unikPerusahaan,
      aktifPicSales,
      chartValiditas,
      chartStatusWa,
      chartTren,
      chartProvinsi,
      progressPicSales,
      detailData,
      filterOptions: {
        pic_sales: rawPicSales,
        provinsi: rawProvinsi,
        status_wa: rawStatusWa,
        validitas: rawValiditas
      }
    });

  } catch (error) {
    console.error("Error fetching report progress:", error);
    return NextResponse.json({ error: "Gagal mengambil data report progress" }, { status: 500 });
  }
}
