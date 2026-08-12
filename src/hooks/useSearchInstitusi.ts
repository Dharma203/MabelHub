import { useState, useEffect } from 'react'

export type Institusi = {
  id: string | number
  nama: string
  // tambah field lain sesuai struktur database kamu
}

export function useSearchInstitusi(query: string = '') {
  const [results, setResults] = useState<Institusi[]>([])
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
        let res = await fetch(
          `/api/perusahaan?search=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        )
        let data = await res.json()

        if (!data?.length) {
          res = await fetch(
            `/api/institusiKerja?search=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          )
          data = await res.json()
        }

        if (!data?.length) {
          res = await fetch (
            `/api/namaEntitas?search=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          )
          data = await res.json()
        }

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
