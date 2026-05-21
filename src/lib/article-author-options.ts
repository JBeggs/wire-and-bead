export type AuthorSelectOption = { id: string; label: string }

export type ArticleAuthorFields = {
  author?: unknown
  author_id?: unknown
  author_name?: string
  author_first_name?: string
  author_last_name?: string
}

/** Resolve Django User pk whether API returns a number, string, or nested `{ id }`. */
export function resolveArticleAuthorId(authorOrId: unknown): string | null {
  if (authorOrId == null) return null
  if (typeof authorOrId === 'number' || typeof authorOrId === 'string') {
    const s = String(authorOrId).trim()
    return s ? s : null
  }
  if (typeof authorOrId === 'object' && authorOrId !== null && 'id' in authorOrId) {
    const id = (authorOrId as { id: unknown }).id
    if (id != null) return String(id)
  }
  return null
}

export function resolveArticleAuthorIdFromArticle(article: ArticleAuthorFields): string | null {
  return (
    resolveArticleAuthorId(article.author) ?? resolveArticleAuthorId(article.author_id)
  )
}

export function resolveArticleAuthorLabel(article: ArticleAuthorFields): string {
  const flat = article.author_name?.trim()
  if (flat) return flat

  const author = article.author
  if (author && typeof author === 'object') {
    const nested = author as {
      full_name?: string
      first_name?: string
      last_name?: string
    }
    const full = nested.full_name?.trim()
    if (full) return full
    const combined = [nested.first_name, nested.last_name].filter(Boolean).join(' ').trim()
    if (combined) return combined
  }

  const combined = [article.author_first_name, article.author_last_name]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (combined) return combined

  const id = resolveArticleAuthorIdFromArticle(article)
  if (id) return `Author ${id}`

  return 'Staff Writer'
}

/** Build sorted author options for admin multi-select from article list payloads. */
export function buildAuthorOptionsFromArticles(
  articles: ArticleAuthorFields[],
): AuthorSelectOption[] {
  const authorMap = new Map<string, string>()
  for (const article of articles) {
    const id = resolveArticleAuthorIdFromArticle(article)
    if (!id || authorMap.has(id)) continue
    const label = resolveArticleAuthorLabel(article) ?? `Author ${id}`
    authorMap.set(id, label)
  }
  return [...authorMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
