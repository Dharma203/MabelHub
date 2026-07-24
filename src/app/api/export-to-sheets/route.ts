import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_SHEETS_WEBAPP_URL
    if (!webAppUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SHEETS_WEBAPP_URL belum dikonfigurasi di .env.local' },
        { status: 500 },
      )
    }

    const body = await req.json()
    const { title, headers, rows } = body

    if (!title || !headers || !rows) {
      return NextResponse.json(
        { error: 'Missing title, headers, or rows' },
        { status: 400 },
      )
    }

    // POST ke Google Apps Script Web App (server-to-server, no CORS)
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ title, headers, rows }),
      redirect: 'follow',
    })

    const text = await response.text()

    // Apps Script selalu return 200 via ContentService,
    // tapi redirect bisa menghasilkan HTML jika ada masalah
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Apps Script returned HTML instead of JSON:', text.slice(0, 500))
      return NextResponse.json(
        {
          error:
            'Google Apps Script mengembalikan halaman HTML. Pastikan Web App di-deploy dengan akses "Anyone" (bukan "Anyone with Google Account").',
        },
        { status: 502 },
      )
    }

    let result: { url?: string; error?: string }
    try {
      result = JSON.parse(text)
    } catch {
      console.error('Apps Script returned non-JSON:', text.slice(0, 500))
      return NextResponse.json(
        { error: 'Response dari Apps Script bukan JSON: ' + text.slice(0, 200) },
        { status: 502 },
      )
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Sheet export error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal export ke Google Sheets',
      },
      { status: 500 },
    )
  }
}
