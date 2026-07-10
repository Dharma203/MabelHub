'use client'

import { Building2, LucideCopyCheck, Trophy } from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface StatCardProps {
  title: string
  value: string
  icon?: React.ReactNode
}

type VisitRow = {
  _id: string
  nama_sales: string
  visit_date: string // ISO string
  status_visit: string
  satuan_kerja: string
  city: string
  pic_name: string
  pic_phone: string
  status_ring: 'RING 1' | 'RING 2' | 'RING 3' | 'RING 4' | string

  created_at: string
  status_market: string
  klpd: string
  reschedule: string // ISO or "-"
  institusi_kerja: string
  pic_position: string
  pic_role: string
  tindak_lanjut: string
  kegiatan_status: string
  descriptions: string
}

export default function TrackingSatuanKerja() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  //   filter state
  const [fSales, setFSales] = useState<string>('All')
  const [fStart, setFStart] = useState<string>('')
  const [fEnd, setFEnd] = useState<string>('')
  const [fPhone, setFPhone] = useState<string>('')
  const [fRing, setFRing] = useState<string>('ALL')
  const [fCity, setFCity] = useState<string>('ALL')
  const [fSatker, setFSatker] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  //   dropdown meta
  const [salesOptions, setSalesOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [satkerOptions, setSatkerOptions] = useState<string[]>([])
  const [phoneOptions, setPhoneOptions] = useState<string[]>([])

  // pagination
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // selected row for detail
  const [selected, setSelected] = useState<VisitRow | null>(null)

  const onChangeFilter = (fn: (v: string) => void, v: string) => {
    fn(v)
    setSelected(null)
    setPage(1)
  }

  function cn(...s: Array<string | false | null | undefined>) {
    return s.filter(Boolean).join(' ')
  }

  const [paramRing, setParamRing] = useState<string[]>([])

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        {/* Content goes here */}
        <div className='flex-1 p-3 sm:p-6'>
          {/* TOP Bar */}
          <div className='mb-4 px-4 pt-2 pb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h2 className='tex-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Tracking Satuan Kerja
              </h2>
            </div>
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <StatCard
              title='TOTAL SATUAN KERJA'
              value={'1145'}
              icon={<Building2 className='h-6 w-6 text-gray-500' />}
            />
            <StatCard
              title='TOTAL VISIT (VISITED+LEAD+NEGO)'
              value={'3285'}
              icon={<LucideCopyCheck className='h-6 w-6 text-green-500' />}
            />
            <StatCard
              title='SATKER PALING BANYAK DIKUNJUNGI'
              value={'INSPEKTORAT DAERAH'}
              icon={<Trophy className='h-6 w-6 text-yellow-500' />}
            />
          </div>
          <section className='rounded-2xl bg-white p-7 shadow-sm'>
            {/* Mobile Filter Toggle Button */}
            <div
              className='md:hidden flex items-center justify-between cursor-pointer mb-2 bg-blue-50 p-4 rounded-xl border border-blue-100'
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <div className='flex items-center gap-2 font-extrabold text-[#0B6AA9]'>
                <span>{isFilterOpen ? '🔽' : '▶️'}</span>
                <span>FILTER PENCARIAN</span>
              </div>
              <span className='text-sm font-bold text-[#0B6AA9] bg-white px-3 py-1 rounded-full shadow-sm'>
                {isFilterOpen ? 'Tutup' : 'Buka'}
              </span>
            </div>

            <div
              className={cn(
                'grid grid-cols-1 gap-6 md:grid-cols-7 mt-4 md:mt-0',
                !isFilterOpen ? 'hidden md:grid' : 'grid',
              )}
            >
              <FilterSelect
                label='SALES PERSON'
                value={fSales}
                onChange={(v) => onChangeFilter(setFSales, v)}
                options={[{ label: 'Semua Sales', value: 'ALL' }].concat(
                  salesOptions.map((s) => ({ label: s, value: s })),
                )}
              />

              <FilterDate
                label='TANGGAL MULAI'
                value={fStart}
                onChange={(v) => onChangeFilter(setFStart, v)}
                onClick={(e) => {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker()
                  }
                }}
              />
              <FilterDate
                label='TANGGAL AKHIR'
                value={fEnd}
                onChange={(v) => onChangeFilter(setFEnd, v)}
                onClick={(e) => {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker()
                  }
                }}
              />

              <FilterSelect
                label='RING'
                value={fRing}
                onChange={(v) => onChangeFilter(setFRing, v)}
                options={[{ label: 'Semua Ring', value: 'ALL' }].concat(
                  paramRing.map((r) => ({ label: r, value: r })),
                )}
              />

              <FilterSelect
                label='CITY'
                value={fCity}
                onChange={(v) => onChangeFilter(setFCity, v)}
                options={[{ label: 'Semua City', value: 'ALL' }].concat(
                  cityOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <FilterSelect
                label='PIC PHONE'
                value={fPhone}
                onChange={(v) => onChangeFilter(setFPhone, v)}
                options={[{ label: 'Semua Kontak', value: 'ALL' }].concat(
                  phoneOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <div>
                <FilterSelect
                  label='SATUAN KERJA'
                  value={fSatker}
                  onChange={(v) => onChangeFilter(setFSatker, v)}
                  options={[{ label: 'Semua Satker', value: 'ALL' }].concat(
                    satkerOptions.map((s) => ({ label: s, value: s })),
                  )}
                  full
                />
              </div>
            </div>
          </section>
          <section className='mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100'>
            {/* Desktop View */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-blue-200'>
                  <tr className='text-left'>
                    {[
                      'RANK',
                      'SALES PERSON',
                      'CITY',
                      'RING',
                      'SATUAN KERJA',
                      'PIC NAME',
                      'PIC PHONE',
                      'TOTAL VISIT',
                    ].map((h) => (
                      <th
                        key={h}
                        className='whitespace-nowrap px-6 py-5 text-xs font-extrabold tracking-wider text-black'
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                    
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
/* ----------------------------- UI Pieces ----------------------------- */

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className='rounded-xl bg-white p-7 shadow flex items-center gap-4'>
      {icon && <div className='rounded-lg bg-blue-100 p-3'>{icon}</div>}
      <div>
        <p className='text-l text-gray-500'>{title}</p>
        <p className='mt-2 text-3xl font-semibold'>{value ?? '-'}</p>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  full,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ label: string; value: string }>
  full?: boolean
}) {
  return (
    <div className={cn(full && 'w-full')}>
      <div className='text-xs font-extrabold tracking-wider text-[#0B6AA9]'>
        {label}
      </div>
      <div className='relative mt-2'>
        <SearchableSelect
          value={value}
          onChange={(val: string) => onChange(val)}
          options={options}
          placeholder={`Pilih ${label}...`}
          className='h-12 w-full appearance-none rounded-xl border-blue-200 border bg-white'
        />
      </div>
    </div>
  )
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

function FilterDate({
  label,
  value,
  onChange,
  onClick,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onClick: (e: React.MouseEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <div className='text-xs font-extrabold tracking-wider text-blue-600'>
        {label}
      </div>
      <div className='relative mt-2'>
        <input
          type='date'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={onClick}
          className='h-12 w-full rounded-xl border border-blue-200 bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-200'
        />
      </div>
    </div>
  )
}
