// app/dashboard/page.tsx
type DataSheet = {
  [key: string]: string
}

async function fetchSheet(sheetName: string): Promise<DataSheet[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SHEETDB_URL
  console.log('DEBUG Url:', baseUrl)

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

function DataTable({ title, data }: { title: string; data: DataSheet[] }) {
  if (data.length === 0) {
    return (
      <section style={{ marginTop: '2rem' }}>
        <h2>{title}</h2>
        <p>Belum ada data.</p>
      </section>
    )
  }

  const columns = Object.keys(data[0])

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2>{title}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            marginTop: '1rem',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    border: '1px solid #999',
                    padding: '6px 10px',
                    background: '#f0f0f0',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      border: '1px solid #ccc',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function Page() {
  const [revenueData, visitData, planTimData] = await Promise.all([
    fetchSheet('TARGET_REALISASI_REVENUE_2026'),
    fetchSheet('Copy of TARGET_REALISASI_VISIT_2026'),
    fetchSheet('PLAN_TIM'),
  ])
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Google Sheets</h1>

      <DataTable title='Target & Realisasi Revenue 2026' data={revenueData} />
      <DataTable title='Target & Realisasi Visit 2026' data={visitData} />
      <DataTable title='Plan TIM' data={planTimData} />
    </main>
  )
}
