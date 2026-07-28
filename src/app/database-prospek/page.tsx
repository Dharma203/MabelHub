'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/session/SessionProvider'
import { DatabaseBackupIcon, DatabaseZap } from 'lucide-react'

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
            <h1 className='text-2xl font-extrabold text-black p-10'> Silahkan Pilih Database</h1>
          </div>
          <div className='mb-1 p-4 grid grid-cols-1 gap-10 md:grid-cols-2'>
            <div className='p-1'>
              <Link href='/database-prospek/form-b2g' className='block'>
                <StatCard
                  title='DATABASE B2G'
                  value=''
                  icon={<DatabaseBackupIcon className='h-6 w-6 text-blue-500' />}
                />
              </Link>
            </div>
            <div className='p-1'>
              <Link href='/database-prospek/form-b2b' className='block'>
                <StatCard
                  title='DATABASE B2B'
                  value=''
                  icon={<DatabaseZap className='h-6 w-6 text-blue-500' />}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: CardItemProps) {
  return (
    <div className='rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 flex flex-col items-center justify-center min-h-[12rem] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200'>
      {icon && <div className='mb-4 rounded-lg p-3 text-xl text-blue-500'>{icon}</div>}
      <p className='text-xl font-medium text-gray-700 text-center'>{title}</p>
      {value && (
        <p className='mt-2 text-2xl font-semibold text-center'>{value}</p>
      )}
    </div>
  )
}
