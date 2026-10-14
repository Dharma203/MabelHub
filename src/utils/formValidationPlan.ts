export type FieldError = {
  field: string
  message: string
} | null

export function validateFormFieldsPlan(data: {
  leaderName: string
  visit_target: string
  demo_target: string
  revenue: string
  sph_target: string

}): FieldError {
  const requiredHeader = [
    { value: data.leaderName, label: 'Leader Name' },
    { value: data.visit_target, label: 'Visit Target'},
    { value: data.demo_target, label: 'Demo Target' },
    { value: data.revenue, label: 'Revenue' },
    { value: data.sph_target, label: 'SPH Target' },
  ]

  for (const field of requiredHeader) {
    if (!field.value.trim()) {
      return { field: field.label, message: `Field "${field.label}" wajib diisi.` }
    }
  }

  return null
}
