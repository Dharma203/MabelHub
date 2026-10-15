import { useState, useEffect } from 'react'

export type Perusahaan = {
  id: string | number
  nama: string
  // tambah field lain sesuai struktur database kamu
}

export function useSearchPerusahaan(query: string = '') {
  const [results, setResults] = useState<Perusahaan[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Jangan fetch jika query kurang dari 2 karakter
    if (!query || query.trim().length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()

    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Ganti URL ini dengan endpoint API kamu
        const res = await fetch(`/api/perusahaan?search=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        // Sesuaikan dengan struktur response API kamu
        // Contoh jika response: { data: [...] }
        setResults(data)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce 300ms — tidak fetch setiap ketukan
    const timer = setTimeout(fetchData, 300)

    return () => {
      clearTimeout(timer)
      controller.abort() // batalkan request lama jika user masih mengetik
    }
  }, [query])

  return { results, isLoading }
}
