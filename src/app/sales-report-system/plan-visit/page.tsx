'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Target, X } from 'lucide-react'
import {
  createInitialPlanVisitsSalesTargets,
  planVisitSalesNames,
  planVisitSegmenNames,
  planVisitTypes,
} from '@/utils/planVisitSales'
import { validateFormFieldsVisits } from '@/utils/formValidationVisits'

function PlanVisitContent() {
  const [visitTargets, setVisitTargets] = useState(
    createInitialPlanVisitsSalesTargets,
  )
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('sales-report-plan-tim-draft')) {
      alert('Isi Plan Tim terlebih dahulu.')
      router.replace('/sales-report-system/plan-tim')
    }
  }, [router])

  const handleKirim = async () => {
    if (visitTargets.length === 0) {
      alert('Tambahkan minimal satu rencana visit.')
      return
    }

    for (const [index, row] of visitTargets.entries()) {
      const headerError = validateFormFieldsVisits(row)
      if (headerError) {
        alert(`Baris ${index + 1}: ${headerError.message}`)
        return
      }
    }

    const draft = sessionStorage.getItem('sales-report-plan-tim-draft')
    if (!draft) {
      alert('Data Plan Tim tidak ditemukan. Silakan isi kembali.')
      router.replace('/sales-report-system/plan-tim')
      return
    }

    let planTimHeader: unknown
    try {
      planTimHeader = JSON.parse(draft)
    } catch {
      sessionStorage.removeItem('sales-report-plan-tim-draft')
      alert('Data sementara Plan Tim tidak valid. Silakan isi kembali.')
      router.replace('/sales-report-system/plan-tim')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/plan-tim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: planTimHeader,
          sales_visit: visitTargets.map(
            ({ nama_sales, segmentasi, tipe_visit, nama_perusahaan, note }) => ({
              nama_sales,
              segmentasi,
              tipe_visit,
              nama_perusahaan,
              note,
            }),
          ),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || 'Gagal menyimpan data visit.')
      }

      sessionStorage.removeItem('sales-report-plan-tim-draft')
      alert('Data Plan Tim dan Plan Visit berhasil disimpan.')
      router.push('/sales-report-system')
    } catch (error) {
      console.error('Error saving sales report:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan data.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='mx-auto'>
        <div className='flex-1 p-4'>
          <div className='bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-100'>
            <div className='flex flex-col'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Form Submit Plan Visit
              </h1>
              <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
                Isi data sales, segmentasi, tipe visit, dan perusahaan yang akan
                dikunjungi.
              </div>
            </div>
          </div>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Target
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h3 className='text-lg font-bold text-gray-900'>
                  Rencana Visit / Kunjungan
                </h3>
                <p className='text-sm text-gray-500'>
                  Daftarkan rencana kunjungan periode ini
                </p>
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-262.5 text-left text-sm'>
                <thead>
                  <tr className='bg-slate-50 text-xs uppercase text-slate-600'>
                    <th className='px-3 py-3'>#</th>
                    <th className='px-3 py-3'>Nama Sales *</th>
                    <th className='px-3 py-3'>Segmentasi</th>
                    <th className='px-3 py-3'>Tipe Visit</th>
                    <th className='px-3 py-3'>Entity / Nama Perusahaan</th>
                    <th className='px-3 py-3'>Catatan</th>
                    <th className='px-3 py-3' aria-label='Aksi' />
                  </tr>
                </thead>
                <tbody>
                  {visitTargets.map((row, index) => (
                    <tr key={row.id}>
                      <td className='px-3 py-2 text-slate-500'>{index + 1}</td>
                      <td className='min-w-48 px-2 py-2'>
                        <SearchableSelect
                          value={row.nama_sales}
                          onChange={(value) =>
                            setVisitTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, nama_sales: value }
                                  : item,
                              ),
                            )
                          }
                          options={[
                            { value: '', label: '-- Pilih sales --' },
                            ...planVisitSalesNames
                              .filter(
                                (name) =>
                                  name === row.nama_sales ||
                                  !visitTargets.some(
                                    (item) =>
                                      item.id !== row.id &&
                                      item.nama_sales === name,
                                  ),
                              )
                              .map((name) => ({ value: name, label: name })),
                          ]}
                          className='px-2 mt-2'
                        />
                      </td>
                      <td>
                        <SearchableSelect
                          value={row.segmentasi}
                          onChange={(value) =>
                            setVisitTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, segmentasi: value }
                                  : item,
                              ),
                            )
                          }
                          options={[
                            { value: '', label: '-- Pilih Segmen --' },
                            ...planVisitSegmenNames
                              .filter(
                                (name) =>
                                  name === row.segmentasi ||
                                  !visitTargets.some(
                                    (item) =>
                                      item.id !== row.id &&
                                      item.segmentasi === name,
                                  ),
                              )
                              .map((name) => ({ value: name, label: name })),
                          ]}
                          className='px-2 mt-2'
                        />
                      </td>
                      <td>
                        <SearchableSelect
                          value={row.tipe_visit}
                          onChange={(value) =>
                            setVisitTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? { ...item, tipe_visit: value }
                                  : item,
                              ),
                            )
                          }
                          options={[
                            { value: '', label: '-- Pilih Tipe Visit --' },
                            ...planVisitTypes.map((type) => ({
                              value: type,
                              label: type,
                            })),
                          ]}
                          className='px-2 mt-2'
                        />
                      </td>
                      <td className='min-w-48 px-2 py-2'>
                        <input
                          aria-label={`Nama perusahaan ${row.nama_sales || index + 1}`}
                          type='text'
                          value={row.nama_perusahaan}
                          placeholder='Nama perusahaan'
                          onChange={(event) =>
                            setVisitTargets((current) =>
                              current.map((item) =>
                                item.id === row.id
                                  ? {
                                      ...item,
                                      nama_perusahaan: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                          className='h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                        />
                      </td>
                      <td className='min-w-28 px-2 py-2'>
                        <input
                          aria-label={`Catatan ${row.nama_sales || index + 1}`}
                          type='text'
                          value={row.note}
                          placeholder='Opsional'
                          onChange={(event) =>
                            setVisitTargets((current) =>
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
                            setVisitTargets((current) =>
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
              </table>
            </div>
          </section>
          <div className='mt-6'>
            <div className='flex items-center justify-center gap-4 mb-6'>
              <button
                onClick={handleKirim}
                disabled={isSaving}
                aria-label={isSaving ? 'Menyimpan data visit' : 'Simpan data visit'}
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
      <PlanVisitContent />
    </Suspense>
  )
}
