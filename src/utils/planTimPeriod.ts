export function getPlanTimPeriodConfig(period: string) {
  const isWeekly = period === 'Mingguan'
  const isQuarterly = period === 'Triwulan' || period === 'Kuartal'

  return {
    periodOfOptions: isWeekly
      ? [
          { value: '', label: '-- Pilih --' },
          ...Array.from({ length: 5 }, (_, index) => {
            const value = String(index + 1)
            return { value, label: value }
          }),
        ]
      : [
          { value: '', label: '-- Pilih --' },
          { value: 'X', label: 'X' },
        ],
    periodOfDisabled: period === 'Bulanan',
    monthDisabled: isQuarterly,
    periodOfValue: period ? (isWeekly ? '' : 'X') : '',
    monthValue: isQuarterly ? 'X' : '',
  }
}
