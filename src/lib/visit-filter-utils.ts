function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function exactText(value: string) {
  return { $regex: new RegExp(`^${escapeRegex(value.trim())}$`, 'i') }
}

export function statusText(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'notvisited' || normalized === 'notvisit') {
    return {
      $regex: /^(?:not[\s_-]*visit(?:ed)?|belum[\s_-]*visit(?:ed)?)$/i,
    }
  }

  const pattern = escapeRegex(value.trim()).replace(/\s+/g, '[\\s_-]*')
  return { $regex: new RegExp(`^${pattern}$`, 'i') }
}
