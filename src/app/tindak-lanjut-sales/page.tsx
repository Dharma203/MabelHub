"use client";

import { useState } from "react";
import { Users, Calendar, MapPin, Filter, ChevronUp, Package, Building2, MapIcon, Phone, MapPinCheck, BookOpenCheckIcon, CheckCircle, LucideBookUser, Box, BarChart2, ChevronDown } from 'lucide-react';

type KontakItems = {
    kode_input: string;
    nama_perusahaan: string;
    kota: string;
    provinsi: string;
    produk_relevan: string;
    nama: string;
    jabatan: string;
    no_telp: string;
    tipe_kontak: string;
    is_wa_send: string;
    is_wa_read: string;
    is_wa_replied: string;
}

type ApiStats = {
    total_no_telp: number
    total_provinsi: number
    total_kota: number
    total_nama: number
    total_kontak_unik: number
    total_wa_unik: number
    provinsi_kota: ProvinsiKotaRow[]
    wa_provinsi_kota: ProvinsiKotaRow[]
}

type ProvinsiKotaRow = {
    no: number
    provinsi: string
    kota: string
    unik: number
    pct: number
}

export default function TindakLanjutSalesPage() {

    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [isFilterOpen2, setIsFilterOpen2] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selected, setSelected] = useState<KontakItems | null>(null);
    const [loading, setLoading] = useState(false);
    const [provinsi, setProvinsi] = useState<string[]>([]);
    const [kota, setKota] = useState<string[]>([]);
    const [stats, setStats] = useState<ApiStats | null>(null);

    // pagination
    const [rows, setRows] = useState<KontakItems[]>([])
    const [loadingRows, setLoadingRows] = useState(true)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    const filterButtons = [
        { id: 'perusahaan', icon: Building2, label: 'Perusahaan' },
        { id: 'pic_sales', icon: Users, label: 'PIC Sales' },
        { id: 'produk', icon: Package, label: 'Produk' },
        { id: 'provinsi', icon: MapIcon, label: 'Provinsi' },
        { id: 'kota', icon: MapPin, label: 'Kota/Kab' },
        { id: 'validitas', icon: CheckCircle, label: 'Validitas' },
        { id: 'detail_validitas', icon: CheckCircle, label: 'Detail Validitas' },
    ]

    return (
        <div className="min-h-screen bg-blue-50">
            <div className="flex">
                <div className="flex-1 p-3 sm:p-6">
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                        <div className="flex flex-col">
                            <h4 className="text-[16px] mb-1 font-extrabold  text-(--gray-800) m-0 tracking-[0-.5px]">
                                Tindak Lanjut Sales
                            </h4>
                            <p className="text-sm ml-0.5 text-slate-500 font-bold">
                                Monitor & update validitas prospek dari sheet FWD_SALES
                            </p>
                        </div>
                    </div>
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-amber-500 text-white px-6 h-10 flex items-center justify-between">
                            <div className="flex items-center">
                                <Filter size={12} className="mr-2" strokeWidth={2.5} />
                                <strong className="text-[10px] font-extrabold tracking-widest">
                                    Filter Data Sales
                                </strong>
                                <span className="text-[8px] ml-2 text-gray-200 font-normal tracking-wide">
                                    (Multi-pilih, cascading dinamis)
                                </span>
                            </div>
                            <button className="bg-white text-gray-400 p-1 rounded hover:bg-slate-50 transition-colors shadow-sm cursor-pointer" aria-label={isFilterOpen ? "Tutup filter" : "Buka filter"}>
                                <ChevronDown
                                    size={16}
                                    strokeWidth={2.5}
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={isFilterOpen ? "rotate-180" : ""}
                                />
                            </button>
                        </div>
                        {/* Konten Filter */}
                        <div
                            className="p-4 flex flex-col gap-3"
                            style={{ display: isFilterOpen ? "flex" : "none" }}
                        >
                            {/* Baris 1: Filter Tanggal Input */}
                            <div className="border border-slate-200 rounded-lg p-2 flex flex-col sm:flex-row items-start sm:items-center bg-white shadow-sm max-w-full ">
                                <div className="flex items-center text-xs font-semibold text-gray-600 min-w-max mr-3 px-1 lg:mb-0 mb-2">
                                    <Calendar
                                        size={14}
                                        className="mr-2 text-blue-500"
                                        strokeWidth={2.5}
                                    />
                                    Tanggal Input :
                                </div>
                                <div className="flex item-center gap-2">
                                    <input
                                        type="date"
                                        className="w-30 text-xs h-8 shadow-none border-1 border-slate-300 rounded-lg"
                                        placeholder="Dari"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); setPage(1); setSelected(null); }}
                                    />
                                    <span className="text-gray-400 font-semibold">-</span>
                                    <input
                                        type="date"
                                        className="w-30 text-xs h-8 shadow-none border-1 border-slate-300 rounded-lg"
                                        placeholder="Sampai"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setPage(1); setSelected(null); }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 w-full mt-1">
                                {filterButtons.map((btn, idx) => {
                                    const IconComponent = btn.icon
                                    return (
                                        <button
                                            key={idx}
                                            className="flex items-center justify-center gap-1.5 py-[7px] px-2 text-xs font-semibold border-[1.5px] border-[#ced4da] rounded-lg bg-white cursor-pointer text-[#495057] transition-all duration-150 select-none box-border truncate hover:bg-slate-50 hover:border-slate-400"
                                        >
                                            <IconComponent
                                                size={10}
                                                className="text-slate-500 shrink-0"
                                                strokeWidth={2}
                                            />
                                            <span className="truncate">{btn.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Klik tombol filter → centang pilihan. Bisa pilih lebih dari
                                satu.
                            </p>
                        </div>
                    </section>
                    <section className="bg-white mt-4 flex flex-col rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-[#853B0E] text-white px-6 h-10 flex items-center justify-between ">
                            <div className="flex items-center gap-2 justify-between">
                                <BarChart2 size={12} strokeWidth={2.5} />
                                <strong className="text-[8px] font-bold tracking-wide">
                                    Analis Data Sales
                                </strong>
                                <span className="text-[8px] ml-2 text-blue-100 font-normal tracking-wide">
                                    (Klik baris tabel untuk drill-down)
                                </span>
                            </div>
                            <button className="bg-white text-gray-600 p-1 rounded hover:bg-slate-50 transition-colors shadow-sm cursor-pointer" aria-label={isFilterOpen2 ? "Tutup filter" : "Buka filter"}>
                                <ChevronDown
                                    size={16}
                                    strokeWidth={2.5}
                                    onClick={() => setIsFilterOpen2(!isFilterOpen2)}
                                    className={isFilterOpen2 ? "rotate-180" : ""}
                                />
                            </button>
                        </div>

                        <div
                            className="p-4 flex flex-col gap-3"
                            style={{ display: isFilterOpen2 ? "flex" : "none" }}
                        >
                            <div className="flex flex-col md:flex-row gap-3 w-full">
                                <div className="shrink-0">
                                    <div className="flex flex-col h-20 md:w-[430px] bg-[#f8f9fa] rounded-lg shadow-sm border-[#F2A549] overflow-hidden">
                                        <div className="flex flex-row items-center justify-between w-full flex-1 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-full flex items-center justify-center text-white shrink-0 w-9 h-9 bg-linear-to-br from-[#F2A549] to-[#e8913a]">
                                                    <Phone size={14} className="text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[11px] text-[#1e293b]">
                                                        Total Unik No Kontak
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        Kolom H (noKontak) unik
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div
                                                    className="font-bold text-[1.8rem] leading-none text-orange-500"
                                                    id='statTotalUnik'
                                                >
                                                    {loading ? '...' : (stats?.total_kontak_unik ?? 0)}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Kontak
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-[#dbeafe] h-1">
                                            <div className="bg-orange-500 h-full w-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="items-center justify-center relative w-2/3">
                                    <div className="bg-orange-100/50 border border-orange-200 rounded-lg shadow-sm px-4 py-2.5 h-full">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                            <span className='font-bold text-[11px] text-slate-700'>
                                                Distribusi Validitas
                                            </span>
                                        </div>
                                        <div className='flex flex-wrap gap-1.5'>
                                            {/* Terkirim (1C) */}
                                            <div className='flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5'>
                                                <span className='w-2 h-2 rounded-full bg-slate-400 shrink-0'></span>
                                                <span className='text-[10px] text-slate-600 font-medium whitespace-nowrap'>
                                                    Terkirim (1C)
                                                </span>
                                                <span className='text-[10px] font-bold text-slate-700 ml-0.5' id='statTerkirim'>11</span>
                                            </div>
                                            {/* Diterima (2C) */}
                                            <div className='flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5'>
                                                <span className='w-2 h-2 rounded-full bg-blue-400 shrink-0'></span>
                                                <span className='text-[10px] text-blue-700 font-medium whitespace-nowrap'>
                                                    Diterima (2C)
                                                </span>
                                                <span className='text-[10px] font-bold text-blue-800 ml-0.5' id='statDiterima'>37</span>
                                            </div>
                                            {/* Dibaca - Belum Respons */}
                                            <div className='flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5'>
                                                <span className='w-2 h-2 rounded-full bg-yellow-400 shrink-0'></span>
                                                <span className='text-[10px] text-yellow-700 font-medium whitespace-nowrap'>
                                                    Dibaca - Belum Respons
                                                </span>
                                                <span className='text-[10px] font-bold text-yellow-800 ml-0.5' id='statBelumRespons'>74</span>
                                            </div>
                                            {/* Dibaca - Belum Respons */}
                                            <div className='flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5'>
                                                <span className='w-2 h-2 rounded-full bg-yellow-400 shrink-0'></span>
                                                <span className='text-[10px] text-yellow-700 font-medium whitespace-nowrap'>
                                                    Dibaca - Belum Respons
                                                </span>
                                                <span className='text-[10px] font-bold text-yellow-800 ml-0.5' id='statBelumRespons'>74</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                <div className='flex flex-col rounded-lg border border-blue-100 overflow-hidden shadow-sm'>
                                    {/* Header Panel Kiri */}
                                    <div
                                        className='flex items-center justify-between px-3 py-[6px]'
                                        style={{
                                            background: 'linear-gradient(135deg, #FEF7DB, #FFF5CF)',
                                            borderBottom: '2px solid #B45309',
                                        }}
                                    >
                                        <div className='flex items-center gap-1.5'>
                                            <MapPinCheck
                                                size={13}
                                                className='text-orange-600 shrink-0'
                                                strokeWidth={2.5}
                                            />
                                            <span className='text-[11px] font-bold text-[#1e293b]'>
                                                Unik No Kontak per Provinsi &amp; Kota
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                                            <span
                                                id='statProvinsiRows'
                                                className='font-semibold text-orange-700'
                                            >
                                                {loading ? '...' : (stats?.provinsi_kota.length ?? 0)}
                                            </span>
                                            <span>baris</span>
                                            <span className='mx-0.5 text-slate-300'>|</span>
                                            <span
                                                id='statProvinsiTotal'
                                                className='font-semibold text-orange-700'
                                            >
                                                {loading ? '...' : (stats?.total_kontak_unik ?? 0)}
                                            </span>
                                            <span>total</span>
                                        </div>
                                    </div>
                                    {/* Tabel */}
                                    <div className='max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-blue-50 [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-blue-400'>
                                        <table className='w-full text-left border-collapse'>
                                            <thead className='sticky top-0 z-10'>
                                                <tr>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-black-500 w-7'>
                                                        #
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-black-500'>
                                                        Provinsi
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-black-500'>
                                                        Kota/Kab
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-black-500 text-right'>
                                                        Unik
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody
                                                id='tbodyProvinsiUnik'
                                                className='divide-y divide-gray-100'
                                            >
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={4} className='px-2 py-4 text-center text-[10px] text-slate-400'>
                                                            Memuat data...
                                                        </td>
                                                    </tr>
                                                ) : (stats?.provinsi_kota ?? []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className='px-2 py-4 text-center text-[10px] text-slate-400'>
                                                            Tidak ada data
                                                        </td>
                                                    </tr>
                                                ) : (stats?.provinsi_kota ?? []).map((row) => (
                                                    <tr
                                                        key={row.no}
                                                        onClick={() => {
                                                            setProvinsi([row.provinsi])
                                                            setKota([row.kota])
                                                            setPage(1)
                                                            setSelected(null)
                                                        }}
                                                        className={`transition-colors cursor-pointer ${provinsi.includes(row.provinsi) && kota.includes(row.kota)
                                                            ? 'bg-blue-100 ring-1 ring-inset ring-blue-400'
                                                            : 'hover:bg-blue-50/70'
                                                            }`}
                                                    >
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-400'>
                                                            {row.no}
                                                        </td>
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-700 font-medium'>
                                                            {row.provinsi}
                                                        </td>
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                                                            <div className='flex items-center gap-1.5'>
                                                                <span>{row.kota}</span>
                                                                <div className='flex-1 min-w-[36px] bg-blue-100 rounded-full h-[4px] overflow-hidden'>
                                                                    <div
                                                                        className='bg-blue-500 h-full rounded-full'
                                                                        style={{ width: `${row.pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className='px-2 py-1.5 text-right'>
                                                            <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white'>
                                                                {row.unik}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className='flex flex-col rounded-lg border border-orange-100 overflow-hidden shadow-sm'>
                                    {/* Header Panel Kanan */}
                                    <div
                                        className='flex items-center justify-between px-3 py-[6px]'
                                        style={{
                                            background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                                            borderBottom: '2px solid #f59e0b',
                                        }}
                                    >
                                        <div className='flex items-center gap-1.5'>
                                            <LucideBookUser
                                                size={13}
                                                className='text-orange-600 shrink-0'
                                                strokeWidth={2.5}
                                            />
                                            <span className='text-[11px] font-bold text-[#1e293b]'>
                                                Unik No HP per Ke Sales
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                                            <span
                                                id='statWaProvinsiRows'
                                                className='font-semibold text-orange-700'
                                            >
                                                14
                                            </span>
                                            <span>baris</span>
                                            <span className='mx-0.5 text-slate-300'>|</span>
                                            <span
                                                id='statWaProvinsiTotal'
                                                className='font-semibold text-orange-700'
                                            >
                                                14
                                            </span>
                                            <span>total</span>
                                        </div>
                                    </div>
                                    {/* Tabel */}
                                    <div className='max-h-[200px] overflow-x-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-orange-50 [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-orange-400'>
                                        <table className='w-full text-left border-collapse'>
                                            <thead className='sticky top-0 z-10'>
                                                <tr>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                                                        #
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                                                        Pic Sales
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                                                        WA Unik
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody
                                                id='tbodyWaProvinsi'
                                                className='divide-y divide-gray-100'
                                            >
                                                {[
                                                    {
                                                        no: 1,
                                                        prov: 'Arie Muhammad Fajar',
                                                        unik: 5,
                                                    },
                                                    {
                                                        no: 2,
                                                        prov: 'Beffry',
                                                        unik: 2,
                                                    },
                                                    {
                                                        no: 3,
                                                        prov: 'Ferrie',
                                                        unik: 4,
                                                    },
                                                ].map((row) => (
                                                    <tr
                                                        key={row.no}
                                                        className='hover:bg-green-50/50 transition-colors cursor-pointer'
                                                    >
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-400'>
                                                            {row.no}
                                                        </td>
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-700 font-medium'>
                                                            {row.prov}
                                                        </td>

                                                        <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                                                            <div className='flex items-center gap-1.5'>
                                                                <div className='flex-1 min-w-[36px] bg-orange-100 rounded-full h-[4px] overflow-hidden'>
                                                                    <div
                                                                        className='bg-orange-300 h-full rounded-full'
                                                                        style={{ width: `${Math.round((row.unik / 5) * 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-200 text-black'>
                                                                    {row.unik}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className='flex flex-col rounded-lg border border-blue-100 overflow-hidden shadow-sm'>
                                    {/* Header Panel Kanan */}
                                    <div
                                        className='flex items-center justify-between px-3 py-[6px]'
                                        style={{
                                            background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
                                            borderBottom: '2px solid #2563eb',
                                        }}
                                    >
                                        <div className='flex items-center gap-1.5'>
                                            <Box
                                                size={13}
                                                className='text-blue-600 shrink-0'
                                                strokeWidth={2.5}
                                            />
                                            <span className='text-[11px] font-bold text-[#1e293b]'>
                                                Unik No Kontak per Produk
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                                            <span
                                                id='statWaProvinsiRows'
                                                className='font-semibold text-blue-700'
                                            >
                                                14
                                            </span>
                                            <span>baris</span>
                                            <span className='mx-0.5 text-slate-300'>|</span>
                                            <span
                                                id='statWaProvinsiTotal'
                                                className='font-semibold text-blue-700'
                                            >
                                                14
                                            </span>
                                            <span>total</span>
                                        </div>
                                    </div>
                                    {/* Tabel */}
                                    <div className='max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-blue-50 [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-blue-400'>
                                        <table className='w-full text-left border-collapse'>
                                            <thead className='sticky top-0 z-10'>
                                                <tr>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500 w-7'>
                                                        #
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                                                        Produk
                                                    </th>
                                                    <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                                                        WA Unik
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody
                                                id='tbodyWaProvinsi'
                                                className='divide-y divide-gray-100'
                                            >
                                                {[
                                                    {
                                                        no: 1,
                                                        prov: 'IFP',
                                                        unik: 20,
                                                        pct: 20,
                                                    },
                                                ].map((row) => (
                                                    <tr
                                                        key={row.no}
                                                        className='hover:bg-green-50/50 transition-colors cursor-pointer'
                                                    >
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-400'>
                                                            {row.no}
                                                        </td>
                                                        <td className='px-2 py-1.5 text-[10px] text-slate-700 font-medium'>
                                                            {row.prov}
                                                        </td>

                                                        <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                                                            <div className='flex items-center gap-1.5'>
                                                                <div className='flex-1 min-w-[36px] bg-blue-100 rounded-full h-[4px] overflow-hidden'>
                                                                    <div
                                                                        className='bg-blue-300 h-full rounded-full'
                                                                        style={{ width: `${row.pct}%` }}
                                                                    />
                                                                </div>
                                                                <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-black'>
                                                                    {row.unik}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div className="mt-6 overflow-hidden rounded-2xl bg-blue shadow-sm ring-1 ring-gray-200">
                        <div className="overflow-x-auto">
                            <div className="min-w-full text-sm text-left items-center bg-white">
                                <table className="w-full text-sm text-left items-center bg-transparent lg:bg-white block lg:table">
                                    <thead className="bg-blue-100 justify-center hidden lg:table-header-group">
                                        <tr>
                                            {[
                                                'NO',
                                                'LIHAT',
                                                'PIC SALES',
                                                'PERUSAHAAN',
                                                'INFO LOKASI',
                                                'KONTAK PIC',
                                                'VALIDITAS',
                                                'DETAIL VALIDITAS',
                                                '',
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-2 py-2.5 text-[10px] font-semibold text-black"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y lg:divide-gray-300 block lg:table-row-group">
                                        {Array(10).fill(0).map((_, i) => (
                                            <tr
                                                key={i}
                                                className="block lg:table-row mb-4 lg:mb-0 rounded-xl lg:rounded-none shadow-md lg:shadow-none border border-gray-200 lg:border-b lg:border-t-0 lg:border-x-0 p-3 lg:p-0 transition-colors cursor-pointer bg-white hover:bg-green-50/50"
                                            >
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-400 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">NO</span>
                                                    <span>1</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-700 font-medium border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">LIHAT</span>
                                                    <span className="text-right">081231849271</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">PIC SALES</span>
                                                    <span className="text-right">Ramadhan</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">PERUSAHAAN</span>
                                                    <span className="text-right">Maju Mundur</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">INFO LOKASI</span>
                                                    <span className="text-right">Jakarta</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">KONTAK PIC</span>
                                                    <span className="text-right">087899878888</span>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">VALIDITAS</span>
                                                    <select className="bg-white border border-gray-300 rounded px-1 py-0.5 text-right lg:text-left">
                                                        <option value="True">True</option>
                                                    </select>
                                                </td>
                                                <td className="flex justify-between items-center px-1 py-1.5 lg:px-2 lg:py-1.5 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell">
                                                    <span className="lg:hidden font-bold text-gray-400">DETAIL VALIDITAS</span>
                                                    <select className="bg-white border border-gray-300 rounded px-1 py-0.5 text-right lg:text-left">
                                                        <option value="True">True</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

}
