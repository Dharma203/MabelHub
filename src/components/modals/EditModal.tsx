'use client'

import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  rowId: string
  pic: string
  onSave: (rowId: string, newPic: string) => void
}

export default function EditModal({
  isOpen,
  onClose,
  rowId,
  pic,
  onSave,
}: ModalProps) {
  const [formData, setFormData] = React.useState<string>(pic ?? '')

  // Sinkronkan formData setiap kali pic prop berubah (saat buka modal baris berbeda)
  React.useEffect(() => {
    setFormData(pic ?? '')
  }, [pic, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(rowId, formData.trim())
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-2xl'>
        <div className='flex items-center justify-between border-b pb-3 mb-4'>
          <h3 className='text-base font-bold text-gray-800'>Edit Nama PIC</h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-700 text-xl leading-none'
            aria-label='Tutup modal'
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nama PIC
            </label>
            <input
              type='text'
              value={formData}
              autoFocus
              onChange={(e) => setFormData(e.target.value)}
              placeholder='Masukkan nama PIC...'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
            />
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
            >
              Batal
            </button>
            <button
              type='submit'
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors'
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
