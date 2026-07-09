"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronUp, Filter, Calendar, Users, MapIcon, Phone, CheckCircle, Briefcase, PieChartIcon, PhoneCallIcon, TrendingUpIcon, User, CalendarCheckIcon, SearchXIcon, ChevronDown, Loader2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";

type DashboardStats = {
    totalLaporanSales: number;
    totalReportWa: number;
    unikPerusahaan: number;
    aktifPicSales: number;
    chartValiditas: { name: string; value: number }[];
    chartStatusWa: { name: string; value: number }[];
    chartTren: { name: string; validasiSales: number; reportWa: number }[];
    chartProvinsi: { name: string; value: number }[];
    progressPicSales: { no: number; pic: string; unik: number; progress: number }[];
    detailData: { no: number; tanggal: string; pic: string; perusahaan: string; kota: string; provinsi: string; validitas: string; source: string }[];
    filterOptions: Record<string, string[]>;
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316'];

export default function ReportProgresPage() {
    const filterButtons = [
        { id: 'pic_sales', icon: Users, label: 'PIC Sales' },
        { id: 'validitas', icon: CheckCircle, label: 'Validitas' },
        { id: 'provinsi', icon: MapIcon, label: 'Provinsi' },
        { id: 'status_wa', icon: Phone, label: 'Status WA' },
    ];

    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [sumberData, setSumberData] = useState('Semua');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
    const [filterValues, setFilterValues] = useState<Record<string, string[]>>({
        pic_sales: [],
        validitas: [],
        provinsi: [],
        status_wa: []
    });

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setOpenFilterDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('sumberData', sumberData);
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                
                Object.entries(filterValues).forEach(([key, values]) => {
                    values.forEach(val => params.append(key, val));
                });

                const res = await fetch(`/api/report-progres?${params.toString()}`);
                const data = await res.json();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch report progress stats", error);
            }
            setLoading(false);
        };
        fetchData();
    }, [sumberData, startDate, endDate, filterValues]);

    const handleFilterChange = (filterId: string, value: string) => {
        setFilterValues(prev => {
            const current = prev[filterId] || [];
            if (current.includes(value)) {
                return { ...prev, [filterId]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [filterId]: [...current, value] };
            }
        });
    };

    const dataValiditas = stats?.chartValiditas || [];
    const dataStatusWa = stats?.chartStatusWa || [];
    const dataTren = stats?.chartTren || [];
    const dataProvinsi = stats?.chartProvinsi || [];

    const formatFilterButtonClass = (isActive: boolean) => 
        `text-sm border rounded-lg mb-3 px-3 py-2 h-9 border-slate-300 bg-white ${isActive ? 'border-blue-500 text-blue-600 bg-blue-50' : 'text-slate-500'} hover:border-blue-400 hover:text-blue-500 transition-all duration-200 cursor-pointer whitespace-nowrap`;

    return (
        <div className="min-h-screen bg-blue-50">
            <div className="flex">
                <div className="flex-1 p-6">
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100 flex justify-between items-center">
                        <div className="flex flex-col">
                            <h4 className="text-[16px] mb-1 font-extrabold text-(--gray-800) m-0 tracking-[0-.5px]">
                                Report Progres
                            </h4>
                            <p className="text-sm ml-0.5 text-slate-500 font-bold">
                                Analisa & grafik dari VALIDASI_SALES dan REPORT_WA
                            </p>
                        </div>
                        {loading && <Loader2 className="animate-spin text-blue-500" />}
                    </div>
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-blue-500 text-white px-6 h-10 flex items-center justify-between">
                            <div className="flex items-center">
                                <Filter size={12} className="mr-2" strokeWidth={2.5} />
                                <strong className="text-[10px] font-extrabold tracking-widest">
                                    Filter Report
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
                        <div
                            className="p-4 flex flex-col gap-3"
                            style={{ display: isFilterOpen ? "flex" : "none" }}
                        >
                            <div className="flex items-center gap-3 justify-start">
                                <span className="text-md text-slate-500 items-center pl-1 h-10">Sumber:</span>
                                {['Semua', 'Validasi Sales', 'Report WA'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setSumberData(s)}
                                        className={formatFilterButtonClass(sumberData === s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
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
                                        className="w-30 text-xs h-8 shadow-none border-1 border-slate-300 cursor-pointer rounded-lg"
                                        placeholder="Dari"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        onClick={(e) => {
                                            if ('showPicker' in HTMLInputElement.prototype) {
                                                e.currentTarget.showPicker();
                                            }
                                        }}
                                    />
                                    <span className="text-gray-400 font-semibold">-</span>
                                    <input
                                        type="date"
                                        className="w-30 text-xs h-8 shadow-none border-1 border-slate-300 cursor-pointer rounded-lg"
                                        placeholder="Sampai"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        onClick={(e) => {
                                            if ('showPicker' in HTMLInputElement.prototype) {
                                                e.currentTarget.showPicker();
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full mt-1" ref={filterRef}>
                                {filterButtons.map((btn, idx) => {
                                    const IconComponent = btn.icon;
                                    const isActive = filterValues[btn.id]?.length > 0;
                                    const options = stats?.filterOptions[btn.id] || [];
                                    const isOpen = openFilterDropdown === btn.id;

                                    return (
                                        <div key={idx} className="relative flex-1 min-w-[120px]">
                                            <button
                                                onClick={() => setOpenFilterDropdown(isOpen ? null : btn.id)}
                                                className={`w-full flex items-center justify-center gap-1.5 py-[7px] px-2 text-xs font-semibold border-[1.5px] rounded-lg cursor-pointer transition-all duration-150 select-none box-border truncate ${isActive ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-[#ced4da] text-[#495057] hover:bg-slate-50 hover:border-slate-400'}`}
                                            >
                                                <IconComponent
                                                    size={10}
                                                    className={isActive ? "text-blue-500 shrink-0" : "text-slate-500 shrink-0"}
                                                    strokeWidth={2}
                                                />
                                                <span className="truncate">
                                                    {btn.label} {isActive ? `(${filterValues[btn.id].length})` : ''}
                                                </span>
                                            </button>
                                            
                                            {isOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                                    {options.length === 0 ? (
                                                        <div className="p-3 text-xs text-slate-500 text-center">Tidak ada data</div>
                                                    ) : (
                                                        options.map(opt => (
                                                            <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={filterValues[btn.id]?.includes(opt)}
                                                                    onChange={() => handleFilterChange(btn.id, opt)}
                                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <span className="text-xs text-slate-700">{opt || "(Kosong)"}</span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </section>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mt-4">
                        {/* Card 1: Total Laporan Sales */}
                        <div className="flex flex-row items-center gap-3 bg-blue-100 rounded-xl shadow-sm border border-gray-100 px-4 py-3 ">
                            <div className="rounded-full flex items-center justify-center text-white shrink-0 w-11 h-11 bg-blue-800">
                                <Briefcase size={18} strokeWidth={2} className="text-white" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[11px] font-semibold text-slate-500 truncate">
                                    Total Laporan Sales
                                </div>
                                <div className="text-[1.6rem] font-extrabold leading-tight text-blue-900">
                                    {stats?.totalLaporanSales ?? 0}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    entri di VALIDASI_SALES
                                </div>
                            </div>
                        </div>
                        {/* Card 2: Total Report WA */}
                        <div className="flex flex-row items-center gap-3 bg-green-100 rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                            <div className="rounded-full flex items-center justify-center text-white shrink-0 w-11 h-11 bg-green-600">
                                <Phone size={18} strokeWidth={2} className="text-white" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[11px] font-semibold text-slate-500 truncate">
                                    Total Report WA
                                </div>
                                <div className="text-[1.6rem] font-extrabold leading-tight text-green-700">
                                    {stats?.totalReportWa ?? 0}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    entri di REPORT_WA
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Unik Perusahaan */}
                        <div className="flex flex-row items-center gap-3 bg-orange-100 rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                            <div className="rounded-full flex items-center justify-center text-white shrink-0 w-11 h-11 bg-orange-500">
                                <Users size={18} strokeWidth={2} className="text-white" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[11px] font-semibold text-slate-500 truncate">
                                    Unik Perusahaan
                                </div>
                                <div className="text-[1.6rem] font-extrabold leading-tight text-orange-500">
                                    {stats?.unikPerusahaan ?? 0}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    perusahaan berbeda
                                </div>
                            </div>
                        </div>

                        {/* Card 4: Aktif PIC Sales */}
                        <div className="flex flex-row items-center gap-3 bg-teal-100 rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                            <div className="rounded-full flex items-center justify-center text-white shrink-0 w-11 h-11 bg-teal-600">
                                <CheckCircle size={18} strokeWidth={2} className="text-white" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[11px] font-semibold text-slate-500 truncate">
                                    Aktif PIC Sales
                                </div>
                                <div className="text-[1.6rem] font-extrabold leading-tight text-teal-700">
                                    {stats?.aktifPicSales ?? 0}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    PIC Sales berkontribusi
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        {/* Pie Chart: Distribusi Validitas */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b-2 bg-blue-100 border-blue-700">
                                <PieChartIcon size={12} strokeWidth={2} className="text-indigo-600" />
                                <p className="text-[11px] font-bold text-[#1e293b]">
                                    Distribusi Validitas
                                </p>
                            </div>
                            <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataValiditas}
                                            cx="40%"
                                            cy="50%"
                                            dataKey="value"
                                            nameKey="name"
                                            outerRadius={90}
                                            innerRadius={45}
                                            paddingAngle={3}
                                        >
                                            {dataValiditas.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any, name: any) => [value, name]}
                                        />
                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: '11px' }}
                                            align="right"
                                            verticalAlign="middle"
                                            layout="vertical"
                                            height={20}
                                            width={100}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b-2 bg-green-100 border-green-700">
                                <PhoneCallIcon size={12} strokeWidth={2} className="text-green-600" />
                                <p className="text-[11px] font-bold text-[#1e293b]">
                                    Distribusi Status Wa
                                </p>
                            </div>
                            <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={dataStatusWa}
                                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                                        layout="vertical"
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                            stroke="#E5E7EB"
                                        />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: "#6B7280" }}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: "#374151" }}
                                            width={135}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "rgba(0,0,0,0.04)" }}
                                            contentStyle={{
                                                borderRadius: "8px",
                                                border: "none",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                fontSize: "11px",
                                            }}
                                            formatter={(value: any) => [value, "Jumlah"]}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                                            {dataStatusWa.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 w-full mt-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-2 pt-3 pb-2 border-b-2 bg-blue-100 border-blue-700">
                                <TrendingUpIcon size={12} strokeWidth={2} className="text-blue-600" />
                                <p className="text-[11px] font-bold text-[#1e293b]">
                                    Tren Laporan per Bulan
                                </p>
                            </div>
                            <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={dataTren}
                                        margin={{ top: 16, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="gradValidasi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="gradWa" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#E5E7EB"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: "#6B7280" }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: "#6B7280" }}
                                            width={30}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: "8px",
                                                border: "1px solid #E5E7EB",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                fontSize: "11px",
                                            }}
                                            formatter={(value: any, name: any) => [
                                                value,
                                                name === "validasiSales" ? "Validasi Sales" : "Report WA",
                                            ]}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="center"
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: "11px", paddingBottom: "4px" }}
                                            formatter={(value) =>
                                                value === "validasiSales" ? "Validasi Sales" : "Report WA"
                                            }
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="validasiSales"
                                            stroke="#f97316"
                                            strokeWidth={2.5}
                                            fill="url(#gradValidasi)"
                                            fillOpacity={1}
                                            dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="reportWa"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            fill="url(#gradWa)"
                                            fillOpacity={1}
                                            dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full h-[250px] mt-5">
                        <div className="flex flex-col rounded-lg border border-slate-100 overflow-hidden bg-slate-100 shadow-sm">
                            <div className="flex justify-between items-center gap-1.5 px-2 pt-3 pb-2 border-b-2 bg-orange-100 border-yellow-700 lg:table-cell">
                                <div className="flex items-center gap-1.5">
                                    <User size={12} strokeWidth={2} className="text-yellow-600" />
                                    <p className="text-[11px] font-bold text-[#1e293b]">
                                        Progress per PIC Sales
                                    </p>
                                </div>
                                <p className="text-xs px-2 py-0.5 rounded-full text-yellow-900">
                                    {stats?.progressPicSales?.length || 0} Pic Sales
                                </p>
                            </div>
                            <div className="flex flex-col overflow-hidden shadow-sm overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        <tr>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                                                #
                                            </th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                                                PIC Sales
                                            </th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                                                Validasi Sales
                                            </th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        id='tbodyPicSales'
                                        className='divide-y divide-gray-300'
                                    >
                                        {(stats?.progressPicSales || []).map((row) => {
                                            const maxUnik = Math.max(...(stats?.progressPicSales.map(r => r.unik) || [1]));
                                            const percent = (row.unik / maxUnik) * 100;
                                            return (
                                                <tr
                                                    key={row.no}
                                                    className='hover:bg-green-50/50 transition-colors cursor-pointer bg-white'
                                                >
                                                    <td className='px-2 py-1.5 text-[10px] text-slate-900 font-bold'>
                                                        {row.no}
                                                    </td>
                                                    <td className='px-2 py-1.5 text-[10px] text-slate-900 font-medium truncate max-w-[100px]'>
                                                        {row.pic || "(Kosong)"}
                                                    </td>
    
                                                    <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                                                        <div className='flex-1 min-w-[36px] bg-blue-100 rounded-full h-[4px] overflow-hidden'>
                                                            <div
                                                                className='bg-blue-600 h-full rounded-full'
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-[10px] text-slate-700 font-medium">
                                                        <div className='items-center inline-flex justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-700 text-white'>
                                                            {row.unik}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center gap-1.5 px-2 pt-3 pb-2 border-b-2 bg-blue-100 border-blue-700">
                            <MapIcon size={12} strokeWidth={2} className="text-blue-600" />
                            <p className="text-[11px] font-bold text-[#1e293b]">
                                Distribusi per Provinsi
                            </p>
                        </div>
                        <div style={{ width: '100%', height: 230 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dataProvinsi}
                                    margin={{ top: 30, right: 16, left: 0, bottom: 30 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#E5E7EB"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 9,
                                            fill: "#374151",
                                            textAnchor: "end",
                                        }}
                                        angle={-30}
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: "#6B7280" }}
                                        width={28}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                                        contentStyle={{
                                            borderRadius: "8px",
                                            border: "none",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            fontSize: "11px",
                                        }}
                                        formatter={(value: any) => [value, "Jumlah"]}
                                    />
                                    <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={50}>
                                        {dataProvinsi.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 w-full gap-3 h-auto lg:h-[350px] mt-5">
                    <div className="flex flex-col rounded-lg border border-white overflow-hidden bg-white-100 shadow-sm">
                        <div className="flex items-center gap-1.5 px-2 pt-3 pb-2 border-b-2 bg-white-100 border-blue-600">
                            <CalendarCheckIcon size={12} strokeWidth={2} className="text-blue-600" />
                            <p className="text-[11px] font-bold text-[#1e293b]">
                                Detail Data {stats?.detailData?.length ? `(Menampilkan ${stats.detailData.length} data)` : ''}
                            </p>
                        </div>
                        <div className="overflow-y-auto max-h-[320px] shadow-sm" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                            <table className="border-collapse w-full block lg:table">
                                <thead className='w-full text-left border-collapse sticky top-0 z-10 bg-white hidden lg:table-header-group'>
                                    <tr>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            No
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Tanggal
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            PIC SALES
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Perusahaan
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Kota
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Provinsi
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Validitas
                                        </th>
                                        <th className="px-2 py-1.5 text-[10px] text-black font-bold border-b border-slate-200">
                                            Sumber
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    id="tbodyDetailData"
                                    className="block lg:table-row-group divide-y divide-gray-200 px-2 bg-white">
                                    {(stats?.detailData || []).map((row, index) => (
                                        <tr key={index} className="block lg:table-row mb-4 lg:mb-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none shadow-md lg:shadow-none border border-gray-200 lg:border-b lg:border-t-0 lg:border-x-0 p-3 lg:p-0 hover:bg-slate-50">
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">No</span>
                                                <span>{row.no}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Tanggal</span>
                                                <span>{row.tanggal}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">PIC Sales</span>
                                                <span>{row.pic || "-"}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Perusahaan</span>
                                                <span className="max-w-[200px] truncate">{row.perusahaan || "-"}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Kota</span>
                                                <span>{row.kota || "-"}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Provinsi</span>
                                                <span>{row.provinsi || "-"}</span>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-900 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Validitas</span>
                                                <div className={`flex items-center justify-center gap-1.5 px-2 py-1 border rounded-full text-xs font-medium ${row.validitas === 'Valid' ? 'bg-green-100 border-green-200 text-green-700' : row.validitas === 'Invalid' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-orange-100 border-orange-200 text-orange-700'}`}>
                                                    <span className={`flex h-2 w-2 rounded-full ${row.validitas === 'Valid' ? 'bg-green-500' : row.validitas === 'Invalid' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                                                    {row.validitas}
                                                </div>
                                            </td>
                                            <td className='flex justify-between items-center lg:table-cell py-1.5 lg:py-1 px-2 text-xs font-medium text-slate-700 border-b border-slate-200 border-dashed lg:border-solid lg:border-0 lg:border-b'>
                                                <span className="lg:hidden font-bold text-gray-500">Sumber</span>
                                                <div className={`flex items-center gap-1.5 px-2 py-1 border rounded-full text-xs font-medium ${row.source === 'Validasi Sales' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-purple-100 border-purple-200 text-purple-700'}`}>
                                                    <span className={`flex h-2 w-2 rounded-full ${row.source === 'Validasi Sales' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                                                    {row.source}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats?.detailData?.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div >
    );
}