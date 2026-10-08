'use client'

import CardPlan from '@/components/ui/CardPlan'

export default function SalesReportPage() {
  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex min-w-0'>
        <div className='min-w-0 w-full flex-1 p-6'>
          <div className='bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100'>
            <div className='flex justify-center items-center'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Sales Report Page
              </h1>
            </div>
          </div>
          <div className='flex min-w-0 w-full justify-center items-center'>
            <h1 className='text-2xl font-extrabold text-black p-10'>
              {' '}
              Silahkan Pilih Page
            </h1>
          </div>
          <div className='flex justify-center items-center'>
            <div className='min-w-0'>
              <CardPlan />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
