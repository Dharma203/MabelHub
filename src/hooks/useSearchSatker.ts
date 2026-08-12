import { useState, useEffect } from 'react'

export type SatuanKerja = {
  id: string | number
  nama: string
  // tambah field lain sesuai struktur database kamu
}

export function useSearchSatker(query: string = '') {
  const [results2, setResults2] = useState<SatuanKerja[]>([])
  const [isLoadingSatker, setIsLoadingSatker] = useState(false)

  useEffect(() => {
    // Jangan fetch jika query kurang dari 2 karakter
    if (!query || query.trim().length < 2) {
      setResults2([])
      return
    }

    const controller = new AbortController()

    const fetchData = async () => {
      setIsLoadingSatker(true)
      try {
        // Ganti URL ini dengan endpoint API kamu
        const res = await fetch(`/api/satuanKerja?search=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        // Sesuaikan dengan struktur response API kamu
        // Contoh jika response: { data: [...] }
        setResults2(data)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults2([])
        }
      } finally {
        setIsLoadingSatker(false)
      }
    }

    // Debounce 300ms — tidak fetch setiap ketukan
    const timer = setTimeout(fetchData, 300)

    return () => {
      clearTimeout(timer)
      controller.abort() // batalkan request lama jika user masih mengetik
    }
  }, [query])

  return { results2, isLoadingSatker }
}