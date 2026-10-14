'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Notebook, Plus, Save, Target, X } from 'lucide-react'
import { validateFormFieldsPlan } from '@/utils/formValidationPlan'
import { generatePlanTimCode } from '@/utils/planTimCode'
import { getPlanTimPeriodConfig } from '@/utils/planTimPeriod'
import {
  createInitialPlanTimSalesTargets,
  planTimSalesNames,
  sumPlanTimSalesTargets,
} from '@/utils/planTimSales'

function PlanTimContent() {
  const [period, setPeriod] = useState('')
  const [periodOf, setPeriodOf] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const leaderName = 'Arie Muhamad Fajar'
  const [salesTargets, setSalesTargets] = useState(
    createInitialPlanTimSalesTargets,
  )
  const [note, setNote] = useState('')
  const router = useRouter()
  const periodConfig = getPlanTimPeriodConfig(period)
  const salesTotals = sumPlanTimSalesTargets(salesTargets)

  const handlePeriodChange = (value: string) => {
    const config = getPlanTimPeriodConfig(value)
    setPeriod(value)
    setPeriodOf(config.periodOfValue)
    setMonth(config.monthValue)
  }

  const handleKirim = () => {
    try {
      if (
        salesTargets.length === 0 ||
        salesTargets.some((row) => !row.nama_sales)
      ) {
        alert('Pilih nama sales untuk setiap baris atau hapus baris kosong.')
        return
      }
      const headerError = validateFormFieldsPlan({
        leaderName,
        visit_target: String(salesTotals.visit_target),
        demo_target: String(salesTotals.demo_target),
        revenue: String(salesTotals.revenue),
        sph_target: String(salesTotals.sph_target),
      })
      if (headerError) {
        alert(headerError.message)
        return
      }
      if (![period, periodOf, month, year].every((value) => value.trim())) {
        alert('Periode, Periode Ke, Bulan, dan Tahun wajib dipilih.')
        return
      }

      const payload = {
        code_submit: generatePlanTimCode({
          leaderName,
          period,
          periodOf,
          month,
          year,
        }),
        leaderName: leaderName.trim(),
        note: note.trim(),
        period,
        periodOf,
        month,
        year,
        total_active_sales: String(salesTargets.length),
        visit_target: String(salesTotals.visit_target),
        demo_target: String(salesTotals.demo_target),
        sph_target: String(salesTotals.sph_target),
        sph_deal_target: String(salesTotals.sph_deal_target),
        revenue: String(salesTotals.revenue),
        sales_targets: salesTargets.map(
          ({
            nama_sales,
            visit_target,
            demo_target,
            sph_target,
            sph_deal_target,
            revenue,
            note,
          }) => ({
            nama_sales,
            visit_target,
            demo_target,
            sph_target,
            sph_deal_target,
            revenue,
            note,
          }),
        ),
      }
      sessionStorage.setItem('sales-report-plan-tim-draft', JSON.stringify(payload))
      alert('Data Plan Tim disimpan sementara. Lengkapi Plan Visit untuk mengirim semuanya.')
      router.push('/sales-report-system/plan-visit')
    } catch (error) {
      console.error('Error saving Plan Tim draft:', error)
      alert('Gagal menyimpan data Plan Tim sementara di browser.')
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='mx-auto'>
        <div className='flex-1 p-4'>
          <div className='bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-100'>
            <div className='flex flex-col'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Form Submit Plan Sales
              </h1>
              <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
                Isi rencana penjualan tim untuk periode yang dipilih, Target tim
                dihitung otomatis dari akumulasi target per sales.
              </div>
            </div>
          </div>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Clock
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h2 className='text-xl font-bold text-gray-700'>Periode</h2>
                <p className='text-sm font-medium text-gray-500'>
                  Data Periode , Bulan , Tahun
                </p>
              </div>
            </div>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-2'>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Periode
                </label>
                <SearchableSelect
                  value={period}
                  onChange={handlePeriodChange}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: 'Bulanan', label: 'Bulanan' },
                    { value: 'Mingguan', label: 'Mingguan' },
                    { value: 'Triwulan', label: 'Triwulan' },
                    { value: 'Kuartal', label: 'Kuartal' },
                  ]}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Periode Ke
                </label>
                <SearchableSelect
                  value={periodOf}
                  onChange={(val: string) => setPeriodOf(val)}
                  options={periodConfig.periodOfOptions}
                  isDisabled={periodConfig.periodOfDisabled}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Bulan
                </label>
                <SearchableSelect
                  value={month}
                  onChange={(val: string) => setMonth(val)}
                  isDisabled={periodConfig.monthDisabled}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: 'January', label: 'January' },
                    { value: 'February', label: 'February' },
                    { value: 'March', label: 'March' },
                    { value: 'April', label: 'April' },
                    { value: 'May', label: 'May' },
                    { value: 'June', label: 'June' },
                    { value: 'July', label: 'July' },
                    { value: 'August', label: 'August' },
                    { value: 'September', label: 'September' },
                    { value: 'October', label: 'October' },
                    { value: 'November', label: 'November' },
                    { value: 'December', label: 'December' },
                  ]}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Tahun
                </label>
                <SearchableSelect
                  value={year}
                  onChange={(val: string) => setYear(val)}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' },
                    { value: '2028', label: '2028' },
                  ]}
                />
              </div>
            </div>
          </section>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Target
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h3 className='text-lg font-bold text-gray-900'>Target</h3>
                <p className='text-sm text-gray-500'>
                  Visit, Demo, SPH, SPH Deal, Revenue
                </p>
              </div>
            </div>
            <div className='mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800'>
              Setiap nama sales hanya dapat dipilih satu kali. Total target
              dihitung otomatis.
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-262.5 text-left text-sm'>
                <thead>
                  <tr className='bg-slate-50 text-xs uppercase text-slate-600'>
                    <th className='px-3 py-3'>#</th>
                    <th className='px-3 py-3'>Nama Sales *</th>
                    <th className='px-3 py-3'>Target Visit</th>
                    <th className='px-3 py-3'>Target Demo</th>
                    <th className='px-3 py-3'>Target SPH</th>
                    <th className='px-3 py-3'>Target Closing</th>
                    <th className='px-3 py-3'>Target Revenue (Rp)</th>
                    <th className='px-3 py-3'>Catatan</th>
                    <th className='px-3 py-3' aria-label='Aksi' />
                  </tr>
                </thead>
                <tbody>
                  {salesTargets.map((row, index) => (
                    <tr key={row.id}>
                      <td className='px-3 py-2 text-slate-500'>{index + 1}</td>
                      <td className='min-w-48 px-2 py-2'>
                        <SearchableSelect
                          value={row.nama_sales}
                          onChange={(value) =>
                            setSalesTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, nama_sales: value }
                                  : item,
                              ),
                            )
                          }
                          options={[
                            { value: '', label: '-- Pilih sales --' },
                            ...planTimSalesNames
                              .filter(
                                (name) =>
                                  name === row.nama_sales ||
                                  !salesTargets.some(
                                    (item) =>
                                      item.id !== row.id &&
                                      item.nama_sales === name,
                                  ),
                              )
                              .map((name) => ({ value: name, label: name })),
                          ]}
                        />
                      </td>
                      {(
                        [
                          ['visit_target', 'Target Visit'],
                          ['demo_target', 'Target Demo'],
                          ['sph_target', 'Target SPH'],
                          ['sph_deal_target', 'Target Closing'],
                          ['revenue', 'Target Revenue'],
                        ] as const
                      ).map(([field, label]) => (
                        <td key={field} className='min-w-28 px-2 py-2'>
                          <input
                            aria-label={`${label} ${row.nama_sales || index + 1}`}
                            type='number'
                            min='0'
                            value={row[field]}
                            onChange={(event) =>
                              setSalesTargets((current) =>
                                current.map((item) =>
                                  item.id === row.id
                                    ? { ...item, [field]: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className='h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                          />
                        </td>
                      ))}
                      <td className='min-w-28 px-2 py-2'>
                        <input
                          aria-label={`Catatan ${row.nama_sales || index + 1}`}
                          type='text'
                          value={row.note}
                          placeholder='Opsional'
                          onChange={(event) =>
                            setSalesTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, note: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className='h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                        />
                      </td>
                      <td className='px-2 py-2'>
                        <button
                          type='button'
                          aria-label={`Hapus baris sales ${index + 1}`}
                          onClick={() =>
                            setSalesTargets((current) =>
                              current.filter((item) => item.id !== row.id),
                            )
                          }
                          className='rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200'
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className='bg-sky-50 font-bold text-sky-900'>
                    <td colSpan={2} className='px-3 py-3'>
                      TOTAL TIM
                    </td>
                    <td className='px-3 py-3'>{salesTotals.visit_target}</td>
                    <td className='px-3 py-3'>{salesTotals.demo_target}</td>
                    <td className='px-3 py-3'>{salesTotals.sph_target}</td>
                    <td className='px-3 py-3'>{salesTotals.sph_deal_target}</td>
                    <td className='px-3 py-3'>
                      Rp {salesTotals.revenue.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              type='button'
              onClick={() =>
                setSalesTargets((current) => [
                  ...current,
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    nama_sales: '',
                    visit_target: '0',
                    demo_target: '0',
                    sph_target: '0',
                    sph_deal_target: '0',
                    revenue: '0',
                    note: '',
                  },
                ])
              }
              disabled={salesTargets.length >= planTimSalesNames.length}
              className='mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Plus size={16} />
              Tambah Sales
            </button>
          </section>
          <section className='mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Notebook
                size={38}
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
              />
              <div className='flex flex-col'>
                <h2 className='text-xl font-bold text-gray-800'>Catatan Tim</h2>
                <p className='text-sm font-medium text-gray-500'>
                  Keterangan Tambahan (Opsional)
                </p>
              </div>
            </div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Catatan
            </label>
            <input
              type='text'
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder='Tulis catatan (opsional)'
              className='h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
            />
          </section>
          <div className='mt-6'>
            <div className='flex items-center justify-center gap-4 mb-6'>
              <button
                onClick={handleKirim}
                className='flex h-10 items-center justify-center gap-2 cursor-pointer rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-blue-700 hover:bg-blue-700 transition-all'
              >
                <Save className='h-5 w-5' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlanTimPage() {
  return (
    <Suspense fallback={<div className='p-8 text-center'>Loading...</div>}>
      <PlanTimContent />
    </Suspense>
  )
}
