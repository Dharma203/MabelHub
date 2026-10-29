'use client'

import { useEffect, useMemo, useState, Suspense, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useSession } from '@/components/session/SessionProvider'
import { ChevronRight, ArrowLeft, Building } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ConfirmModal from '@/components/modals/ConfirmModal'

// --- Types ---

type Pic = {
  nama?: string
  no_telp?: string
  jabatan?: string
  role?: string
}

type Company = {
  _id: string
  institusiKerja: string
  namaEntitas: string
  jenis?: string
  jenisEntitas?: string
  kota: string
  klpd: string
  satuanKerja: string
  ring?: string
  pic_default?: Pic
}

// Institusi + Satker + Kota combo bound to a KLPD (from /api/companies/by-klpd)
type SatuanKerja = {
  _id: string
  source: 'klpd' | 'b2g' | 'visit'
  institusiKerja: string
  satuanKerja: string
  kota: string
  klpd: string
  ring?: string
  pic_default?: Pic | null
}

type PlanItem = {
  id: string // local id for rendering
  ring: string
  institusiQuery: string
  institusiSelected: boolean
  jenisEntitas: string
  namaEntitas: string
  selectedCompany: Company | null
  kota: string
  klpd: string
  satuanKerja: string
  selectedSatker: SatuanKerja | null
  pic_default: {
    nama: string
    no_telp: string
    jabatan: string
    role: string
  }
  targetUserId?: string // leader assigns to specific sales
  searchMode: 'institusi' | 'satker' // ponytail: lets user pick search order
  // KLPD search (entry point)
  klpdSelected: boolean
  showKlpdSug: boolean
  loadingKlpdSug: boolean
  klpdSugs: string[]
  showInstitusiSug: boolean
  loadingInstitusiSug: boolean
  institusiSugs: string[]
  // RING 4: nama entitas search
  showSug: boolean
  loadingSug: boolean
  sugs: Company[]
  // RING 1-3: institusi/satker candidates for the chosen KLPD
  showSatkerSug: boolean
  loadingSatkerSug: boolean
  satkerSugs: SatuanKerja[]
  showKotaSug: boolean
  loadingKotaSug: boolean
  kotaSugs: string[]
}

type AssigneeOption = {
  userId: string
  fullName?: string
  username?: string
  role?: string
}

// --- Helpers ---

const RING_B2G = ['RING 1', 'RING 2', 'RING 3']

const isSwasta = (klpd: string) => /\bswasta\b/i.test(klpd)

const labelCls = 'text-xs font-bold tracking-wide text-gray-500 uppercase'

const inputCls = (enabled: boolean) =>
  `relative w-full rounded-lg border-0 py-2.5 px-4 shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6 transition-all ${
    enabled
      ? 'bg-white text-gray-900 ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'
      : 'bg-gray-50 text-gray-500 ring-gray-200 cursor-not-allowed'
  }`

function toPic(p?: Pic | null) {
  return {
    nama: p?.nama || '',
    no_telp: p?.no_telp || '',
    jabatan: p?.jabatan || '',
    role: p?.role || '',
  }
}

// Everything downstream of the KLPD selection; cleared when it changes.
function clearedTarget(): Partial<PlanItem> {
  return {
    selectedCompany: null,
    selectedSatker: null,
    institusiQuery: '',
    institusiSelected: false,
    satuanKerja: '',
    namaEntitas: '',
    jenisEntitas: '',
    kota: '',
    pic_default: toPic(),
    sugs: [],
    showSug: false,
    satkerSugs: [],
    showSatkerSug: false,
    institusiSugs: [],
    showInstitusiSug: false,
    loadingInstitusiSug: false,
    kotaSugs: [],
    showKotaSug: false,
    loadingKotaSug: false,
  }
}

function displayAssignee(a: AssigneeOption) {
  const name =
    (a.fullName || '').trim() || (a.username || '').trim() || a.userId
  const role = (a.role || '').trim()
  return role ? `${name} • ${role}` : name
}

function pickArray(json: Record<string, unknown> | unknown[]) {
  const j = json as any
  if (Array.isArray(j?.data)) return j.data
  if (Array.isArray(j?.users)) return j.users
  if (Array.isArray(j?.members)) return j.members
  if (Array.isArray(j)) return j
  return []
}

function newItem(): PlanItem {
  return {
    id: crypto.randomUUID(),
    ring: '',
    jenisEntitas: '',
    namaEntitas: '',
    institusiQuery: '',
    institusiSelected: false,
    selectedCompany: null,
    kota: '',
    klpd: '',
    satuanKerja: '',
    selectedSatker: null,
    pic_default: toPic(),
    targetUserId: '',
    searchMode: 'institusi',
    klpdSelected: false,
    showKlpdSug: false,
    loadingKlpdSug: false,
    klpdSugs: [],
    showInstitusiSug: false,
    loadingInstitusiSug: false,
    institusiSugs: [],
    showSug: false,
    loadingSug: false,
    sugs: [],
    showSatkerSug: false,
    loadingSatkerSug: false,
    satkerSugs: [],
    showKotaSug: false,
    loadingKotaSug: false,
    kotaSugs: [],
  }
}

// --- Small UI pieces ---

function SuggestList<T>({
  loading,
  items,
  getKey,
  onPick,
  onClose,
  renderItem,
}: {
  loading: boolean
  items: T[]
  getKey: (x: T) => string
  onPick: (x: T) => void
  onClose: () => void
  renderItem: (x: T) => ReactNode
}) {
  return (
    <div className='absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100'>
      <div className='max-h-60 overflow-y-auto'>
        {loading ? (
          <div className='px-4 py-6 text-sm text-gray-500 text-center'>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className='px-4 py-6 text-sm text-gray-500 text-center'>
            Tidak ada data ditemukan.
          </div>
        ) : (
          items.map((x) => (
            <button
              key={getKey(x)}
              type='button'
              onClick={() => onPick(x)}
              className='block w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-none'
            >
              {renderItem(x)}
            </button>
          ))
        )}
      </div>
      <div className='bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end'>
        <button
          type='button'
          onClick={onClose}
          className='text-xs font-semibold text-gray-500 hover:text-gray-800'
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className='text-xs font-bold tracking-wide text-gray-400 uppercase'>
        {label}
      </label>
      <input
        value={value}
        readOnly
        placeholder='Terisi otomatis'
        className='mt-2 block w-full rounded-lg bg-gray-50 border-0 py-2.5 px-4 text-gray-500 shadow-sm ring-1 ring-gray-200 sm:text-sm cursor-not-allowed'
      />
    </div>
  )
}

// --- Main Content Component ---

function AddPlansContent() {
  const [jenisEntitas, setJenisEntitas] = useState('')
  const [namaEntitas, setNamaEntitas] = useState('')
  const router = useRouter()
  const sp = useSearchParams()

  const editId = sp.get('edit') // Not yet handled for multi-edit
  const { user, loading: sessionLoading } = useSession()

  const [tanggal, setTanggal] = useState('')
  const [items, setItems] = useState<PlanItem[]>([newItem()])
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Guard & Access Control
  useEffect(() => {
    if (!sessionLoading && user) {
      const ok =
        user.role === 'SALES' ||
        user.role === 'LEADER' ||
        user.role === 'ADMIN' ||
        user.role === 'SUPERADMIN' ||
        user.role === 'ADMIN SALES'
      if (!ok) router.replace('/')
    }
  }, [sessionLoading, user, router])

  // Assignee Logic for Leader/Admin
  const canPickAssignee = useMemo(() => {
    return (
      user?.role === 'LEADER' ||
      user?.role === 'SUPERADMIN' ||
      user?.role === 'ADMIN' ||
      user?.role === 'ADMIN SALES'
    )
  }, [user?.role])

  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [assigneeUserId, setAssigneeUserId] = useState<string>('') // Global assignee for all items in this bulk save

  useEffect(() => {
    if (sessionLoading || !user || !canPickAssignee) return
    ;(async () => {
      try {
        if (user.role === 'LEADER') {
          const res = await fetch('/api/teams/me/members', {
            cache: 'no-store',
          })
          const json = await res.json().catch(() => ({}))
          const arr = pickArray(json)

          const list: AssigneeOption[] = arr
            .map((m: Record<string, unknown>) => {
              const member = m as any
              return {
                userId: String(member.userId || member._id || ''),
                fullName: member.fullName ? String(member.fullName) : '',
                username: member.username ? String(member.username) : '',
                role: member.role ? String(member.role) : 'SALES',
              }
            })
            .filter((x: AssigneeOption) => x.userId)

          setAssigneeOptions(list)
        } else if (
          user.role === 'SUPERADMIN' ||
          user.role === 'ADMIN' ||
          user.role === 'ADMIN SALES'
        ) {
          const res = await fetch('/api/users', { cache: 'no-store' })
          const json = await res.json().catch(() => ({}))
          const arr = pickArray(json)

          const list: AssigneeOption[] = arr
            .map((u: Record<string, unknown>) => {
              const userObj = u as any
              return {
                userId: String(userObj._id || userObj.userId || ''),
                fullName: userObj.fullName ? String(userObj.fullName) : '',
                username: userObj.username ? String(userObj.username) : '',
                role: userObj.role ? String(userObj.role) : '',
              }
            })
            .filter(
              (x: AssigneeOption) =>
                x.userId && (x.role === 'SALES' || x.role === 'LEADER'),
            )

          setAssigneeOptions(list)
        }
      } catch {
        setAssigneeOptions([])
      }
    })()
  }, [sessionLoading, user, canPickAssignee])

  // Handlers
  function addItem() {
    setItems((prev) => [...prev, newItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  function patchItem(id: string, updates: Partial<PlanItem>) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...updates } : x)),
    )
  }

  // --- Step 1: KLPD (entry point) ---

  async function fetchKlpdSuggestion(itemId: string, q: string) {
    patchItem(itemId, { loadingKlpdSug: true, showKlpdSug: true })
    try {
      const qs = new URLSearchParams({ q: q || '', limit: '20' })
      const res = await fetch(`/api/companies/suggest-klpd?${qs.toString()}`, {
        cache: 'no-store',
      })
      const data = res.ok ? await res.json().catch(() => ({})) : {}
      patchItem(itemId, {
        klpdSugs: (data?.items ?? []) as string[],
        loadingKlpdSug: false,
      })
    } catch {
      patchItem(itemId, { klpdSugs: [], loadingKlpdSug: false })
    }
  }

  // Swasta -> RING 4 locked. Otherwise choose institution and satker from KLPD.
  function pickKlpd(itemId: string, klpd: string) {
    const swasta = isSwasta(klpd)
    patchItem(itemId, {
      ...clearedTarget(),
      klpd,
      klpdSelected: true,
      showKlpdSug: false,
      ring: swasta ? 'RING 4' : '',
    })
    if (!swasta) fetchInstitusiSuggestion(itemId, klpd, '')
  }

  function changeRing(it: PlanItem, ring: string) {
    patchItem(it.id, { ring })
  }

  async function fetchInstitusiSuggestion(
    itemId: string,
    klpd: string,
    q: string,
  ) {
    if (!klpd) return
    patchItem(itemId, {
      loadingInstitusiSug: true,
      showInstitusiSug: true,
    })
    try {
      const params = new URLSearchParams({
        klpd,
        mode: 'institusi',
        q,
        limit: '50',
      })
      const res = await fetch(`/api/companies/by-klpd?${params}`, {
        cache: 'no-store',
      })
      const data = res.ok ? await res.json().catch(() => ({})) : {}
      patchItem(itemId, {
        institusiSugs: (data?.items ?? []) as string[],
        loadingInstitusiSug: false,
      })
    } catch {
      patchItem(itemId, {
        institusiSugs: [],
        loadingInstitusiSug: false,
      })
    }
  }

  function pickInstitusi(itemId: string, klpd: string, institusi: string) {
    patchItem(itemId, {
      ...clearedTarget(),
      institusiQuery: institusi,
      institusiSelected: true,
      showInstitusiSug: false,
    })
    fetchKlpdTargets(itemId, klpd, institusi, '')
  }

  // --- Step 3: Satuan Kerja based on the selected KLPD and institution ---

  async function fetchKlpdTargets(
    itemId: string,
    klpd: string,
    institusi: string,
    q: string,
  ) {
    if (!klpd || !institusi) return
    patchItem(itemId, { loadingSatkerSug: true, showSatkerSug: true })
    try {
      const params: Record<string, string> = {
        klpd,
        institusi,
        q: q || '',
        limit: '50',
      }
      const qs = new URLSearchParams(params)
      const res = await fetch(`/api/companies/by-klpd?${qs.toString()}`, {
        cache: 'no-store',
      })
      const data = res.ok ? await res.json().catch(() => ({})) : {}
      const list = (data?.items ?? []) as SatuanKerja[]

      patchItem(itemId, { satkerSugs: list, loadingSatkerSug: false })
    } catch {
      patchItem(itemId, { satkerSugs: [], loadingSatkerSug: false })
    }
  }

  function pickTarget(itemId: string, c: SatuanKerja) {
    patchItem(itemId, {
      selectedSatker: c,
      institusiQuery: c.institusiKerja || '',
      institusiSelected: true,
      satuanKerja: c.satuanKerja || '',
      pic_default: toPic(c.pic_default),
      satkerSugs: [],
      showSatkerSug: false,
      loadingSatkerSug: false,
      kota: '',
    })
    fetchKotaSuggestion(
      itemId,
      c.klpd,
      c.institusiKerja,
      c.satuanKerja,
      '',
    )
  }

  async function fetchKotaSuggestion(
    itemId: string,
    klpd: string,
    institusi: string,
    satuanKerja: string,
    q: string,
  ) {
    if (!klpd || !institusi || !satuanKerja) return
    patchItem(itemId, { loadingKotaSug: true, showKotaSug: true })
    try {
      const params = new URLSearchParams({
        klpd,
        institusi,
        satuan_kerja: satuanKerja,
        mode: 'kota',
        q,
        limit: '50',
      })
      const res = await fetch(`/api/companies/by-klpd?${params}`, {
        cache: 'no-store',
      })
      const data = res.ok ? await res.json().catch(() => ({})) : {}
      patchItem(itemId, {
        kotaSugs: (data?.items ?? []) as string[],
        loadingKotaSug: false,
      })
    } catch {
      patchItem(itemId, { kotaSugs: [], loadingKotaSug: false })
    }
  }

  // --- Step 3b (RING 4): nama entitas search ---

  async function fetchSuggestion(itemId: string, ring: string, q: string) {
    if (!ring) return

    try {
      patchItem(itemId, { loadingSug: true, showSug: true })

      const qs = new URLSearchParams({
        ring,
        q: q || '',
        limit: '10',
      })

      const res = await fetch(`/api/companies/suggest?${qs.toString()}`, {
        cache: 'no-store',
      })

      if (!res.ok) {
        patchItem(itemId, { sugs: [], loadingSug: false })
        return
      }

      const data = await res.json().catch(() => ({}))
      patchItem(itemId, {
        sugs: (data?.items ?? []) as Company[],
        loadingSug: false,
      })
    } catch {
      patchItem(itemId, { sugs: [], loadingSug: false })
    }
  }

  function pickEntity(itemId: string, company: Company) {
    patchItem(itemId, {
      selectedCompany: company,
      namaEntitas: company.namaEntitas || company.institusiKerja || '',
      jenisEntitas: company.jenisEntitas || company.jenis || '',
      kota: company.kota || '',
      pic_default: toPic(company.pic_default),
      sugs: [],
      showSug: false,
      loadingSug: false,
    })
  }

  const canSubmit = useMemo(() => {
    if (!tanggal) return false
    if (!items.length) return false
    return items.every((it) => {
      if (!it.klpdSelected || !it.ring) return false
      if (it.ring === 'RING 4') {
        return !!it.namaEntitas.trim() && !!it.jenisEntitas.trim()
      }
      return (
        it.institusiSelected &&
        !!it.selectedSatker &&
        !!it.institusiQuery.trim() &&
        !!it.satuanKerja.trim()
      )
    })
  }, [tanggal, items])

  async function submitAll() {
    if (!canSubmit) {
      alert(
        'Tanggal wajib, dan setiap rencana wajib punya KLPD + Ring + Institusi/Satuan Kerja (atau Nama & Jenis Entitas untuk RING 4).',
      )
      return
    }

    try {
      setSaving(true)

      const payload = {
        tanggal,
        createdBy: user?.userId || null,
        nama_sales: user?.fullName || null,
        items: items.map((it) => ({
          status_ring: it.ring,
          institusi_kerja: it.ring === 'RING 4' ? null : it.institusiQuery,
          namaEntitas: it.ring === 'RING 4' ? it.namaEntitas : null,
          jenisEntitas: it.ring === 'RING 4' ? it.jenisEntitas : null,
          kota_kab: it.kota,
          klpd: it.ring === 'RING 4' ? null : it.klpd,
          satuan_kerja: it.ring === 'RING 4' ? null : it.satuanKerja,
          pic_default: it.pic_default,
          company_id:
            it.selectedCompany?._id ||
            (it.selectedSatker?.source === 'b2g'
              ? it.selectedSatker._id
              : null),
          // If global assignee is set, use it; otherwise backend might default to creator
          targetUserId: canPickAssignee ? assigneeUserId || null : null,
        })),
      }

      const res = await fetch('/api/visits/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json?.error || 'Gagal menyimpan rencana.')
        return
      }

      alert(`Rencana berhasil disimpan (${json?.insertedCount ?? 0} item).`)
      router.push('/plan-activity')
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSaving(false)
    }
  }
  // --- UI ---

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          <main className='w-full max-w-none'>
            {/* BREADCRUMB */}
            <nav className='mb-4 flex' aria-label='Breadcrumb'>
              <ol className='flex items-center space-x-2 text-sm font-medium text-gray-500'>
                <li>
                  <button
                    onClick={() => router.push('/plan-activity')}
                    className='hover:text-blue-600 transition-colors'
                  >
                    Plan Activity
                  </button>
                </li>
                <li>
                  <ChevronRight className='w-4 h-4 text-gray-400' />
                </li>
                <li aria-current='page'>
                  <span className='text-black font-extrabold'>
                    {editId ? 'Edit Plans' : 'Add Plans'}
                  </span>
                </li>
              </ol>
            </nav>

            {/* HEADER */}
            <div className='mb-6 flex items-center justify-between'>
              <div className='flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4 rounded-t-2xl'>
                <button
                  onClick={() => router.push('/plan-activity')}
                  className='flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 transition'
                  aria-label='Back'
                >
                  <ArrowLeft className='w-4 h-4' />
                </button>
                <div className='flex flex-col'>
                  <h1 className='text-2xl font-extrabold tracking-wide text-black uppercase'>
                    {editId ? 'EDIT PLANS' : 'ADD PLANS'}
                  </h1>
                  <p className='text-xs text-black/60 font-medium mt-0.5'>
                    {editId
                      ? 'Ubah detail rencana aktivitas.'
                      : 'Buat rencana aktivitas baru (bulk).'}
                  </p>
                </div>
              </div>

              {user?.role === 'SALES' && (
                <button
                  type='button'
                  onClick={() => router.push('/database-prospek')}
                  className='rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-1 ring-blue-200 hover:bg-blue-600 hover:ring-blue-300 transition-all flex items-center gap-2'
                >
                  <Building className='w-4 h-4' />
                  REGISTER INSTANSI
                </button>
              )}
            </div>

            {/* TANGGAL & GLOBAL ASSIGNEE */}
            <div className='mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200'>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                  <label className='text-xs font-bold tracking-wide text-gray-500 uppercase'>
                    Tanggal{' '}
                    <span className='text-gray-400 lowercase font-normal'>
                      (Berlaku untuk semua)
                    </span>
                  </label>
                  <input
                    type='date'
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker()
                      }
                    }}
                    className='mt-2 block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all cursor-pointer'
                  />
                </div>

                {canPickAssignee && (
                  <div>
                    <label className='text-xs font-bold tracking-wide text-gray-500 uppercase'>
                      Assign To{' '}
                      <span className='text-gray-400 lowercase font-normal'>
                        (Opsional)
                      </span>
                    </label>
                    <SearchableSelect
                      value={assigneeUserId}
                      onChange={(val: string) => setAssigneeUserId(val)}
                      options={[
                        { value: '', label: '(Diri sendiri)' },
                        ...assigneeOptions.map((a) => ({
                          value: a.userId,
                          label: displayAssignee(a),
                        })),
                      ]}
                      placeholder='Pilih Sales/Assignee...'
                      className='mt-2'
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PLAN ITEMS LIST */}
            <div className='space-y-6'>
              {items.map((it, idx) => {
                const isRing4 = it.ring === 'RING 4'
                return (
                  <div
                    key={it.id}
                    className='rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 relative group'
                  >
                    <div className='flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-4 ring-white'>
                          {idx + 1}
                        </div>
                        <h3 className='font-extrabold text-sm text-gray-900 tracking-wide'>
                          DETAIL RENCANA
                        </h3>
                      </div>

                      {items.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeItem(it.id)}
                          className='flex items-center gap-1.5 rounded-lg text-red-500 px-3 py-1.5 text-xs font-bold ring-1 ring-red-200 hover:bg-red-50 hover:ring-red-300 transition-colors'
                        >
                          HAPUS
                        </button>
                      )}
                    </div>

                    <div className='p-6 grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2'>
                      {/* STEP 1: KLPD (entry point) */}
                      <div>
                        <label className={labelCls}>
                          KLPD{' '}
                          <span className='text-gray-400 lowercase font-normal'>
                            (mulai dari sini)
                          </span>
                        </label>
                        <div className='relative mt-2'>
                          <input
                            value={it.klpd}
                            onChange={(e) => {
                              const val = e.target.value
                              patchItem(it.id, {
                                ...clearedTarget(),
                                klpd: val,
                                klpdSelected: false,
                                ring: '',
                              })
                              fetchKlpdSuggestion(it.id, val)
                            }}
                            onFocus={() => fetchKlpdSuggestion(it.id, it.klpd)}
                            placeholder='Ketik untuk mencari KLPD...'
                            className={inputCls(true)}
                          />
                          {it.showKlpdSug && (
                            <SuggestList
                              loading={it.loadingKlpdSug}
                              items={it.klpdSugs}
                              getKey={(k) => k}
                              onPick={(k) => pickKlpd(it.id, k)}
                              onClose={() =>
                                patchItem(it.id, { showKlpdSug: false })
                              }
                              renderItem={(k) => (
                                <div className='font-bold text-sm text-gray-900'>
                                  {k}
                                  {isSwasta(k) && (
                                    <span className='ml-2 text-[10px] font-semibold text-blue-600'>
                                      → RING 4
                                    </span>
                                  )}
                                </div>
                              )}
                            />
                          )}
                        </div>
                      </div>

                      {isRing4 && (
                        <div>
                          <label className={labelCls}>
                            Status Ring{' '}
                            <span className='text-gray-400 lowercase font-normal'>
                              (otomatis)
                            </span>
                          </label>
                          <SearchableSelect
                            value={it.ring}
                            onChange={(val: string) => changeRing(it, val)}
                            options={[{ value: 'RING 4', label: 'RING 4' }]}
                            isDisabled
                            placeholder='RING 4'
                            className='mt-2'
                          />
                        </div>
                      )}

                      {isRing4 ? (
                        <>
                          {/* STEP 3 (RING 4): NAMA ENTITAS */}
                          <div className='md:col-span-2'>
                            <label className={labelCls}>Nama Entitas</label>
                            <div className='relative mt-2'>
                              <input
                                value={it.namaEntitas}
                                onChange={(e) => {
                                  const val = e.target.value
                                  patchItem(it.id, {
                                    namaEntitas: val,
                                    selectedCompany: null,
                                  })
                                  fetchSuggestion(it.id, 'RING 4', val)
                                }}
                                onFocus={() =>
                                  fetchSuggestion(
                                    it.id,
                                    'RING 4',
                                    it.namaEntitas,
                                  )
                                }
                                placeholder='Ketik untuk mencari nama entitas...'
                                className={inputCls(true)}
                              />
                              {it.showSug && (
                                <SuggestList
                                  loading={it.loadingSug}
                                  items={it.sugs}
                                  getKey={(c) => c._id}
                                  onPick={(c) => pickEntity(it.id, c)}
                                  onClose={() =>
                                    patchItem(it.id, { showSug: false })
                                  }
                                  renderItem={(c) => (
                                    <>
                                      <div className='font-bold text-sm text-gray-900'>
                                        {c.namaEntitas || c.institusiKerja}
                                      </div>
                                      <div className='text-[11px] text-gray-500 truncate mt-0.5'>
                                        {[c.jenisEntitas, c.kota]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </div>
                                    </>
                                  )}
                                />
                              )}
                            </div>
                          </div>

                          <ReadonlyField
                            label='Kota/Kabupaten'
                            value={it.kota}
                          />
                          <div>
                            <label className={labelCls}>Jenis Entitas</label>
                            <input
                              value={it.jenisEntitas}
                              onChange={(e) =>
                                patchItem(it.id, {
                                  jenisEntitas: e.target.value,
                                })
                              }
                              placeholder='Masukkan jenis entitas'
                              className={`mt-2 block ${inputCls(true)}`}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Choose institution and satker from KLPD; enter city and ring manually. */}
                          <div>
                            <label className={labelCls}>
                              Institusi Kerja{' '}
                              <span className='text-gray-400 lowercase font-normal'>
                                (sesuai KLPD)
                              </span>
                            </label>
                            <div className='relative mt-2'>
                              <input
                                value={it.institusiQuery}
                                onChange={(e) => {
                                  const val = e.target.value
                                  patchItem(it.id, {
                                    ...clearedTarget(),
                                    institusiQuery: val,
                                  })
                                  fetchInstitusiSuggestion(it.id, it.klpd, val)
                                }}
                                onFocus={() =>
                                  fetchInstitusiSuggestion(
                                    it.id,
                                    it.klpd,
                                    it.institusiQuery,
                                  )
                                }
                                disabled={!it.klpdSelected}
                                placeholder={
                                  it.klpdSelected
                                    ? 'Pilih / cari institusi kerja...'
                                    : 'Pilih KLPD dahulu'
                                }
                                className={inputCls(it.klpdSelected)}
                              />
                              {it.showInstitusiSug && it.klpdSelected && (
                                <SuggestList
                                  loading={it.loadingInstitusiSug}
                                  items={it.institusiSugs}
                                  getKey={(name) => name}
                                  onPick={(name) =>
                                    pickInstitusi(it.id, it.klpd, name)
                                  }
                                  onClose={() =>
                                    patchItem(it.id, { showInstitusiSug: false })
                                  }
                                  renderItem={(name) => (
                                    <div className='font-bold text-sm text-gray-900'>
                                      {name}
                                    </div>
                                  )}
                                />
                              )}
                            </div>
                          </div>

                          <div className='md:col-span-2'>
                            <label className={labelCls}>
                              Satuan Kerja{' '}
                              <span className='text-gray-400 lowercase font-normal'>
                                (sesuai KLPD dan institusi)
                              </span>
                            </label>
                            <div className='relative mt-2'>
                              <input
                                value={it.satuanKerja}
                                onChange={(e) => {
                                  const val = e.target.value
                                  patchItem(it.id, {
                                    satuanKerja: val,
                                    selectedSatker: null,
                                    kota: '',
                                    pic_default: toPic(),
                                    kotaSugs: [],
                                    showKotaSug: false,
                                  })
                                  fetchKlpdTargets(
                                    it.id,
                                    it.klpd,
                                    it.institusiQuery,
                                    val,
                                  )
                                }}
                                onFocus={() =>
                                  fetchKlpdTargets(
                                    it.id,
                                    it.klpd,
                                    it.institusiQuery,
                                    it.selectedSatker ? '' : it.satuanKerja,
                                  )
                                }
                                disabled={!it.klpdSelected || !it.institusiSelected}
                                placeholder={
                                  !it.institusiSelected
                                    ? 'Pilih institusi dahulu'
                                    : 'Pilih dari daftar / ketik untuk memfilter...'
                                }
                                className={inputCls(
                                  it.klpdSelected && it.institusiSelected,
                                )}
                              />
                              {it.showSatkerSug &&
                                it.klpdSelected &&
                              it.institusiSelected && (
                                <SuggestList
                                  loading={it.loadingSatkerSug}
                                  items={it.satkerSugs}
                                  getKey={(c) => c._id}
                                  onPick={(c) => pickTarget(it.id, c)}
                                  onClose={() =>
                                    patchItem(it.id, { showSatkerSug: false })
                                  }
                                  renderItem={(c) => (
                                    <>
                                      <div className='font-bold text-sm text-gray-900'>
                                        {c.satuanKerja}
                                      </div>
                                      <div className='text-[11px] text-gray-500 truncate mt-0.5'>
                                        {[c.institusiKerja, c.kota, c.ring]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </div>
                                    </>
                                  )}
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <label className={labelCls}>Kota/Kabupaten</label>
                            <div className='relative mt-2'>
                              <input
                                value={it.kota}
                                onChange={(e) => {
                                  const val = e.target.value
                                  patchItem(it.id, { kota: val })
                                  fetchKotaSuggestion(
                                    it.id,
                                    it.klpd,
                                    it.institusiQuery,
                                    it.satuanKerja,
                                    val,
                                  )
                                }}
                                onFocus={() =>
                                  fetchKotaSuggestion(
                                    it.id,
                                    it.klpd,
                                    it.institusiQuery,
                                    it.satuanKerja,
                                    it.kota,
                                  )
                                }
                                disabled={!it.selectedSatker}
                                placeholder='Ketik kota/kabupaten...'
                                className={inputCls(
                                  !!it.selectedSatker,
                                )}
                              />
                              {it.showKotaSug &&
                                (it.loadingKotaSug || it.kotaSugs.length > 0) && (
                                <SuggestList
                                  loading={it.loadingKotaSug}
                                  items={it.kotaSugs}
                                  getKey={(city) => city}
                                  onPick={(city) =>
                                    patchItem(it.id, {
                                      kota: city,
                                      showKotaSug: false,
                                    })
                                  }
                                  onClose={() =>
                                    patchItem(it.id, { showKotaSug: false })
                                  }
                                  renderItem={(city) => (
                                    <div className='font-bold text-sm text-gray-900'>
                                      {city}
                                    </div>
                                  )}
                                />
                              )}
                            </div>
                            <p className='mt-1 text-[11px] text-gray-500'>
                              Saran berdasarkan KLPD, institusi, dan satuan kerja.
                            </p>
                          </div>

                          <div>
                            <label className={labelCls}>Status Ring</label>
                            <SearchableSelect
                              value={it.ring}
                              onChange={(val: string) => changeRing(it, val)}
                              options={RING_B2G.map((r) => ({
                                value: r,
                                label: r,
                              }))}
                              isDisabled={!it.klpdSelected}
                              placeholder={
                                it.klpdSelected
                                  ? 'Pilih Status Ring...'
                                  : 'Pilih KLPD dahulu'
                              }
                              className='mt-2'
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ACTION BUTTONS */}
            <div className='mt-8 flex flex-col md:flex-row items-center justify-between gap-4 pb-12 border-t border-gray-200 pt-8'>
              <button
                type='button'
                onClick={addItem}
                className='w-full md:w-auto flex items-center justify-center gap-2 h-11 rounded-xl bg-white px-6 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 transition-all active:scale-95'
              >
                + TAMBAH RENCANA LAIN
              </button>

              <button
                type='button'
                onClick={submitAll}
                disabled={!canSubmit || saving}
                className={`w-full md:w-56 flex items-center justify-center gap-2 h-11 rounded-xl px-8 text-sm font-extrabold text-white shadow-md transition-all active:scale-95
                  ${!canSubmit || saving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
              >
                {saving ? 'MENYIMPAN...' : 'SIMPAN SEMUA RENCANA'}
              </button>
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title='Konfirmasi Hapus'
        message='Apakah Anda yakin ingin menghapus baris rencana ini?'
        confirmText='HAPUS'
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            removeItem(confirmDeleteId)
            setConfirmDeleteId(null)
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// --- Page Wrapper with Suspense ---

export default function AddPlansPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen grid place-items-center bg-blue-50'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
            <p className='text-sm font-bold text-blue-900 animate-pulse text-center uppercase tracking-widest'>
              Loading Page...
            </p>
          </div>
        </div>
      }
    >
      <AddPlansContent />
    </Suspense>
  )
}
