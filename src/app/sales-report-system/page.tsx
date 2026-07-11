// app/sales-report-system/page.tsx

import Link from 'next/link'

/* ───────────────────────── types ───────────────────────── */

type DataSheet = {
  [key: string]: string
}

/* ───────────────────────── data fetching ───────────────── */

async function fetchSheet(sheetName: string): Promise<DataSheet[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SHEETDB_URL

  if (!baseUrl) {
    console.warn(
      'NEXT_PUBLIC_SHEETDB_URL belum di-set. Cek file .env.local, lalu restart dev server.',
    )
    return []
  }

  const res = await fetch(`${baseUrl}?sheet=${sheetName}`, {
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(
      `Gagal mengambil data sheet "${sheetName}" (status: ${res.status})`,
    )
  }

  const json = await res.json()

  if (!Array.isArray(json)) {
    throw new Error(
      `Response sheet "${sheetName}" bukan array: ${JSON.stringify(json)}`,
    )
  }

  return json
}

/* ───────────────────────── helpers ─────────────────────── */

function parseNumber(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return Number(cleaned) || 0
}

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function pct(actual: number, target: number): number {
  if (target === 0) return 0
  return Math.round((actual / target) * 100)
}

/* ───────────────────────── types for parsed data ──────── */

type PlanReferensi = {
  kode: string
  namaLeader: string
  periode: string
  planVisit: number
  planDemo: number
  planSph: number
  planClosing: number
  planRevenue: number
  catatan: string
}

type EmployeeYTD = {
  nama: string
  status: string
  visitActual: number
  visitTarget: number
  visitPct: number
  revenueActual: number
  revenueTarget: number
  revenuePct: number
}

/* ───────────────────────── mapping helpers ─────────────── */

function mapToPlanTim(
  planTimDataRow: DataSheet | undefined,
  namaLeader: string,
  bulan: string,
): PlanReferensi {
  console.log('kode', planTimDataRow?.['KODE SUBMIT'])
  return {
    kode: planTimDataRow?.['KODE SUBMIT'] || '',
    namaLeader: planTimDataRow?.['NAMA LEADER'] || namaLeader,
    periode: bulan,
    planVisit: parseNumber(planTimDataRow?.['TARGET VISIT']),
    planDemo: parseNumber(
      planTimDataRow?.['TARGET DEMO'] ||
        planTimDataRow?.['TARGET DEMO/PRESENTASI'],
    ),
    planSph: parseNumber(planTimDataRow?.['TARGET SPH']),
    planClosing: parseNumber(
      planTimDataRow?.['TARGET CLOSING'] ||
        planTimDataRow?.['TARGET CLOSING SPH'],
    ),
    planRevenue: parseNumber(planTimDataRow?.['TARGET REVENUE TOTAL']),
    catatan: '',
  }
}

function buildEmployeeYTD(
  revenueRows: DataSheet[],
  visitRows: DataSheet[],
): EmployeeYTD[] {
  // Build a map of visits by NAMA SALES / NAMA LEADER
  const visitMap = new Map<string, { actual: number; target: number }>()
  for (const row of visitRows) {
    if (row['STATUS']?.toLowerCase() !== 'active') continue
    const name = row['NAMA SALES'] || row['NAMA LEADER'] || row['NAMA'] || ''
    if (!name) continue
    const existing = visitMap.get(name) || { actual: 0, target: 0 }
    existing.actual += parseNumber(
      row['REALISASI VISIT'] ||
        row['ACTUAL VISIT'] ||
        row['VISIT ACTUAL'] ||
        row['REALISASI'],
    )
    existing.target += parseNumber(row['TARGET VISIT'] || row['TARGET'])
    visitMap.set(name, existing)
  }

  // Build employee list from revenue rows
  const employeeMap = new Map<string, EmployeeYTD>()
  for (const row of revenueRows) {
    if (row['STATUS']?.toLowerCase() !== 'active') continue
    const name = row['NAMA SALES'] || row['NAMA LEADER'] || row['NAMA'] || ''
    if (!name) continue

    const existing = employeeMap.get(name)
    const revActual = parseNumber(
      row['REALISASI REVENUE'] ||
        row['ACTUAL REVENUE'] ||
        row['REVENUE ACTUAL'] ||
        row['REALISASI REVENUE TOTAL'] ||
        row['REALISASI'],
    )
    const revTarget = parseNumber(
      row['TARGET REVENUE'] || row['TARGET REVENUE TOTAL'] || row['TARGET'],
    )

    if (existing) {
      existing.revenueActual += revActual
      existing.revenueTarget += revTarget
    } else {
      const visit = visitMap.get(name) || { actual: 0, target: 0 }
      employeeMap.set(name, {
        nama: name,
        status: row['STATUS'] || 'Active',
        visitActual: visit.actual,
        visitTarget: visit.target,
        visitPct: pct(visit.actual, visit.target),
        revenueActual: revActual,
        revenueTarget: revTarget,
        revenuePct: pct(revActual, revTarget),
      })
    }
  }

  // If no employee-level data was found, try to build from visitRows
  if (employeeMap.size === 0) {
    for (const row of visitRows) {
      if (row['STATUS']?.toLowerCase() !== 'active') continue
      const name = row['NAMA SALES'] || row['NAMA LEADER'] || row['NAMA'] || ''
      if (!name || employeeMap.has(name)) continue
      const visit = visitMap.get(name) || { actual: 0, target: 0 }
      employeeMap.set(name, {
        nama: name,
        status: row['STATUS'] || 'Active',
        visitActual: visit.actual,
        visitTarget: visit.target,
        visitPct: pct(visit.actual, visit.target),
        revenueActual: 0,
        revenueTarget: 0,
        revenuePct: 0,
      })
    }
  }

  // Recalculate percentages
  const result = Array.from(employeeMap.values()).map((e) => ({
    ...e,
    visitPct: pct(e.visitActual, e.visitTarget),
    revenuePct: pct(e.revenueActual, e.revenueTarget),
  }))

  return result
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/* ──────── StatBox (plan referensi metric) ──────── */
function StatBox({
  label,
  value,
  span = 1,
  bold = false,
}: {
  label: string
  value: string | number
  span?: number
  bold?: boolean
}) {
  return (
    <div
      style={{
        gridColumn: `span ${span}`,
        background: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: '10px',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: '6px',
          fontSize: bold ? '22px' : '20px',
          fontWeight: 700,
          color: '#1d4ed8',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function KodeSubmitSelector({
  allKode,
  activeKode,
}: {
  allKode: string[]
  activeKode: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#64748b',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        🗂️ Pilih Kode Submit Plan TIM
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {allKode.map((kode) => {
          const isActive = kode === activeKode
          return (
            <Link
              key={kode}
              href={`?kode=${encodeURIComponent(kode)}`}
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '8px',
                border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: isActive
                  ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                  : '#f8fafc',
                color: isActive ? '#1d4ed8' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
              }}
            >
              {isActive ? '✓ ' : ''}
              {kode}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ──────── PlanReferensiCard ──────── */
function PlanReferensiCard({ data }: { data: PlanReferensi }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'linear-gradient(90deg, #ecfdf5 0%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <span style={{ color: '#fff', fontSize: '18px' }}>📋</span>
          </div>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}
            >
              Data Plan Referensi
            </div>
            <div
              style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}
            >
              Kode: {data.kode} — {data.namaLeader} | {data.periode}
            </div>
          </div>
        </div>

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>✕</span> Ganti Kode
        </button>
      </div>

      {/* stat boxes */}
      <div style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          <StatBox
            label='PLAN VISIT'
            value={data.planVisit.toLocaleString('id-ID')}
          />
          <StatBox
            label='PLAN DEMO'
            value={data.planDemo.toLocaleString('id-ID')}
          />
          <StatBox
            label='PLAN SPH'
            value={data.planSph.toLocaleString('id-ID')}
          />
          <StatBox
            label='PLAN CLOSING'
            value={data.planClosing.toLocaleString('id-ID')}
          />
          <StatBox
            label='PLAN REVENUE'
            value={formatRupiah(data.planRevenue)}
            span={2}
            bold
          />
        </div>

        {/* catatan */}
        {data.catatan && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '13px',
              color: '#475569',
              display: 'flex',
              gap: '8px',
              lineHeight: 1.5,
            }}
          >
            <span>📄</span>
            <span>
              <strong>Catatan Plan:</strong> <em>{data.catatan}</em>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────── YTD Summary Banner ──────── */
function YTDSummary({
  totalVisitActual,
  totalVisitTarget,
  totalRevenueActual,
  totalRevenueTarget,
}: {
  totalVisitActual: number
  totalVisitTarget: number
  totalRevenueActual: number
  totalRevenueTarget: number
}) {
  const visitPctVal = pct(totalVisitActual, totalVisitTarget)
  const revPctVal = pct(totalRevenueActual, totalRevenueTarget)

  return (
    <div
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* header bar */}
      <div
        style={{
          background:
            'linear-gradient(90deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '20px' }}>📊</span>
        <span
          style={{
            fontWeight: 800,
            fontSize: '16px',
            color: '#fff',
            letterSpacing: '-0.01em',
          }}
        >
          Acuan Utama: Akumulasi Tahunan (YTD)
        </span>
        <span
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            marginLeft: '4px',
          }}
        >
          Total target dan realisasi sepanjang tahun 2026 berdasarkan data
          master
        </span>
      </div>

      {/* summary cards */}
      <div
        style={{
          background: '#f8fafc',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {/* total visit */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            }}
          >
            <span style={{ fontSize: '22px' }}>👣</span>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              TOTAL VISIT TIM (YTD)
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#1e293b',
                  lineHeight: 1,
                }}
              >
                {totalVisitActual.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                / {totalVisitTarget.toLocaleString('id-ID')}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                ({visitPctVal}%)
              </span>
            </div>
          </div>
        </div>

        {/* total revenue */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}
          >
            <span style={{ fontSize: '22px' }}>💰</span>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              TOTAL REVENUE TIM (YTD)
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#1e293b',
                  lineHeight: 1,
                }}
              >
                {formatRupiah(totalRevenueActual)}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                ({revPctVal}%)
              </span>
            </div>
            <div
              style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}
            >
              Target: {formatRupiah(totalRevenueTarget)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────── ProgressBar ──────── */
function ProgressBar({
  value,
  max,
  color = '#2563eb',
}: {
  value: number
  max: number
  color?: string
}) {
  const pctVal = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div
      style={{
        width: '100%',
        height: '4px',
        background: '#e2e8f0',
        borderRadius: '2px',
        marginTop: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pctVal}%`,
          height: '100%',
          background: color,
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  )
}

/* ──────── EmployeeCard ──────── */
function EmployeeCard({
  employee,
  index,
}: {
  employee: EmployeeYTD
  index: number
}) {
  const statusColor =
    employee.status === 'Active' || employee.status === 'active'
      ? '#10b981'
      : '#94a3b8'

  // Pick visit bar color based on percentage
  const visitBarColor =
    employee.visitPct >= 50
      ? '#2563eb'
      : employee.visitPct >= 25
        ? '#f59e0b'
        : '#ef4444'

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        background: '#fff',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'default',
      }}
    >
      {/* Name & Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
          {index + 1}. &nbsp;{employee.nama}
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: statusColor,
            background:
              statusColor === '#10b981'
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(148,163,184,0.15)',
            padding: '3px 10px',
            borderRadius: '20px',
            letterSpacing: '0.02em',
          }}
        >
          {employee.status}
        </span>
      </div>

      {/* Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {/* VISIT */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            VISIT
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              marginTop: '4px',
            }}
          >
            <span
              style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}
            >
              {employee.visitActual.toLocaleString('id-ID')}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              / {employee.visitTarget.toLocaleString('id-ID')}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color:
                  employee.visitPct >= 50
                    ? '#10b981'
                    : employee.visitPct >= 25
                      ? '#f59e0b'
                      : '#ef4444',
              }}
            >
              ({employee.visitPct}%)
            </span>
          </div>
          <ProgressBar
            value={employee.visitActual}
            max={employee.visitTarget}
            color={visitBarColor}
          />
        </div>

        {/* REVENUE */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            REVENUE
          </div>
          <div style={{ marginTop: '4px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: employee.revenuePct > 0 ? '#10b981' : '#ef4444',
              }}
            >
              {formatRupiah(employee.revenueActual)}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {' '}
              / {formatRupiah(employee.revenueTarget)}
            </span>
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: employee.revenuePct > 0 ? '#10b981' : '#ef4444',
              marginTop: '2px',
            }}
          >
            ({employee.revenuePct}%)
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE (server component — default export)
   ═══════════════════════════════════════════════════════════ */

export default async function SalesReportSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string; bulan?: string }>
}) {
  const [revenueData, visitData, planTimData] = await Promise.all([
    fetchSheet('TARGET_REALISASI_REVENUE_2026'),
    fetchSheet('Copy of TARGET_REALISASI_VISIT_2026'),
    fetchSheet('PLAN_TIM'),
  ])

  const { kode } = await searchParams

  // ── Ambil semua KODE SUBMIT unik dari Plan TIM ──
  const allKodeSubmit = [
    ...new Set(planTimData.map((row) => row['KODE SUBMIT']).filter(Boolean)),
  ]

  // ── Default ke kode pertama jika belum dipilih ──
  const kodeAktif = kode ?? allKodeSubmit[0] ?? ''

  // ── Cari row Plan TIM berdasarkan KODE SUBMIT yang dipilih ──
  const planTimRow = planTimData.find((row) => row['KODE SUBMIT'] === kodeAktif)

  const namaLeaderAktif = planTimRow?.['NAMA LEADER'] || ''
  const periodeAktif = planTimRow?.['BULAN'] || ''

  const planData = planTimRow
    ? mapToPlanTim(planTimRow, namaLeaderAktif, periodeAktif)
    : null

  // ── YTD Employee data ──
  const employees = buildEmployeeYTD(revenueData, visitData)
  const totalVisitActual = employees.reduce((s, e) => s + e.visitActual, 0)
  const totalVisitTarget = employees.reduce((s, e) => s + e.visitTarget, 0)
  const totalRevenueActual = employees.reduce((s, e) => s + e.revenueActual, 0)
  const totalRevenueTarget = employees.reduce((s, e) => s + e.revenueTarget, 0)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #eff6ff 0%, #f1f5f9 100%)',
        padding: '24px',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '8px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Sales Report System
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
              marginTop: '6px',
              fontWeight: 500,
            }}
          >
            Monitoring target dan realisasi sales berdasarkan data master Google
            Sheets.
          </p>
        </div>

        {/* ─── Section 1: Pilih Kode Submit ─── */}
        {allKodeSubmit.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <KodeSubmitSelector
              allKode={allKodeSubmit}
              activeKode={kodeAktif}
            />
          </div>
        )}

        {/* ─── Section 2: Data Plan Referensi ─── */}
        {planData && (
          <div style={{ marginTop: '16px' }}>
            <PlanReferensiCard data={planData} />
          </div>
        )}

        {/* ─── Section 3: Akumulasi Tahunan (YTD) ─── */}
        <div style={{ marginTop: '32px' }}>
          <YTDSummary
            totalVisitActual={totalVisitActual}
            totalVisitTarget={totalVisitTarget}
            totalRevenueActual={totalRevenueActual}
            totalRevenueTarget={totalRevenueTarget}
          />
        </div>

        {/* ─── Section 4: Employee Cards ─── */}
        {employees.length > 0 && (
          <div
            style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {employees.map((emp, i) => (
              <EmployeeCard key={emp.nama} employee={emp} index={i} />
            ))}
          </div>
        )}

        {employees.length === 0 && (
          <div
            style={{
              marginTop: '32px',
              textAlign: 'center',
              padding: '48px 24px',
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div
              style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}
            >
              Belum ada data karyawan untuk ditampilkan.
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
