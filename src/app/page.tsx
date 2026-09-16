// ✅ Tidak ada "use client" — ini Server Component
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'

function getRedirectPath(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN'
    ? '/dashboard-response'
    : '/dashboard-request'
}

export default async function LoginPage() {
  // Session check jalan di server — tidak ada useEffect, tidak ada bounce
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  if (session) {
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const res = await fetch(`${base}/api/auth/me`, {
        headers: { Cookie: `session=${session}` },
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (json?.user?.role) redirect(getRedirectPath(json.user.role))
    } catch {
      // Session tidak valid — tampilkan login
    }
  }

  // User tidak login → langsung render form tanpa delay
  return <LoginForm />
}
