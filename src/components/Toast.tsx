'use client'

import { useState, useEffect } from 'react'

type ToastProps = {
  message: string
  duration?: number
  onDone?: () => void
}

export function Toast({ message, duration = 2500, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone?.(), 300) // tunggu animasi fade selesai
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl
        bg-green-600 text-white text-sm font-semibold
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <span className='text-lg'>✓</span>
      {message}
    </div>
  )
}
