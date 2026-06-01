export function formatOwnerName(first?: string | null, last?: string | null): string | null {
  const name = [first, last]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
  return name || null
}
