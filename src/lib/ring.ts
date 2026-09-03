export function normalizeRing(value: unknown): string {
  const match = String(value ?? '').match(/(?:^|[^a-z])ring[\s_-]*([1-4])(?!\d)/i)
  return match ? `RING ${match[1]}` : ''
}
