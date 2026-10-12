'use client'

import SearchableSelect from "@/components/ui/SearchableSelect"
import {useState, useMemo, useEffect, useRef, Suspense} from 'react'
import { useSession } from "@/components/session/SessionProvider"
import { useSearchParams, useRouter } from "next/navigation"


type ReportItem = {
    id: string
    created_at: string
    code_submit: string
    period: string
    period_of: string
    month: string
    year: string
    leader_name: string
    total_active_sales: string
    visit_target: string
    demo_target: string
    sph_target: string
    sph_deal_target: string
    revenue: string
    note: string
}

function PlanTimContent() {
    const [codeSubmit, setCodeSubmit] = useState('')
    const [period, setPeriod] = useState('')
    const [periodOf, setPeriodOf] = useState('')
    const [month, setMonth] = useState('')
    const [year, setYear] = useState('')
    const [leaderName, setLeaderName] = useState('')
    const [activeSales, setActiveSales] = useState('')
    const [visitTarget, setVisitTarget] = useState('')
    const [demoTarget, setDemoTarget] = useState('')
    const [sphTarget, setSphTarget] = useState('')
    const [sphDealTarget, setSphDealTarget] = useState('')
    const [revenue, setRevenue] = useState('')
    

    return (

    )
}



export default function PlanTimPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <PlanTimContent />
        </Suspense>
    )
}