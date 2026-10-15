/**
 * TDD Test Report Progress
 *
 * Scope : DashboardStats, const filterButtons, const data, const dataStatusWa, const dataTren, const dataProvinsi
 * 
 * 
 */

import {
    DashboardStats,
    filterButtons,
    data,
    dataStatusWa,
    dataTren,
    dataProvinsi,
} from '../report-progres/page'

// Test DashboardStats
describe('DashboardStats', () => {
    it('should have the correct initial values', () => {
        const stats: DashboardStats = {
            totalVisits: 0,
            visited: 0,
            stayOffice: 0,
            notVisited: 0,
            salesCount: 0,
            satkerCount: 0,
            cityCount: 0,
            ring: {
                ring1: 0,
                ring2: 0,
                ring3: 0,
                ring4: 0,
            },
            trend: [],
            topSales: [],
            klpd: [],
        }

        expect(stats).toEqual({
            totalVisits: 0,
            visited: 0,
            stayOffice: 0,
            notVisited: 0,
            salesCount: 0,
            satkerCount: 0,
            cityCount: 0,
            ring: {
                ring1: 0,
                ring2: 0,
                ring3: 0,
                ring4: 0,
            },
            trend: [],
            topSales: [],
            klpd: [],
        })
    })
})
