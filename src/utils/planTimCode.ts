export function generatePlanTimCode({
  leaderName,
  period,
  periodOf,
  month,
  year,
}: {
  leaderName: string
  period: string
  periodOf: string
  month: string
  year: string
}): string {
  const firstName = leaderName.trim().split(/\s+/)[0]
  const consonants = period.match(/[bcdfghjklmnpqrstvwxyz]/gi) ?? []
  const periodCode = `${period[0]}${consonants[1] ?? 'X'}`.toUpperCase()
  return `${firstName.slice(0, 3).toUpperCase()}-${periodCode}-${periodOf.trim()}-${month.slice(0, 3).toUpperCase()}-${year.trim()}`
}
