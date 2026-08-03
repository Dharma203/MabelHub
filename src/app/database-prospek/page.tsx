'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/session/SessionProvider'
import { DatabaseBackupIcon, DatabaseZap } from 'lucide-react'
import Card from '@/components/ui/Card'
interface CardItemProps {
  title: string
  value?: string
  icon?: React.ReactNode
}

export default function DatabaseProspekPage() {
  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          <div className='bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100'>
            <div className='flex justify-center items-center'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Database Prospek
              </h1>
            </div>
          </div>
          <div className='flex justify-center items-center'>
            <h1 className='text-2xl font-extrabold text-black p-10'>
              {' '}
              Silahkan Pilih Database
            </h1>
          </div>
          <div className='flex justify-center items-center'>
            <div className=''>
            <Card />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
