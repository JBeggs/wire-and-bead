import 'server-only'
import { resolveArticleAuthorIdFromArticle } from '@/lib/article-author-options'
import { getSiteSettingsMap } from '@/lib/site-settings'
import type { ArticleDisplaySettings, ArticleDisplayScope } from '@/lib/article-display-settings-keys'
import { ARTICLE_DISPLAY_SETTING_KEYS } from '@/lib/article-display-settings-keys'

export {
  resolveArticleAuthorId,
  resolveArticleAuthorIdFromArticle,
  resolveArticleAuthorLabel,
  buildAuthorOptionsFromArticles,
  type AuthorSelectOption,
  type ArticleAuthorFields,
} from '@/lib/article-author-options'

export {
  NEWS_CONTENT_COMPANY_SLUG,
  ARTICLE_DISPLAY_SETTING_KEYS,
  type ArticleDisplayScope,
  type ArticleDisplaySettings,
} from '@/lib/article-display-settings-keys'

function parseIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean)
    } catch {
      return value.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return defaultValue
}

function parseLimit(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 3
  return Math.min(n, 24)
}

export function parseArticleDisplaySettings(
  map: Record<string, unknown>,
): ArticleDisplaySettings {
  const k = ARTICLE_DISPLAY_SETTING_KEYS
  return {
    articlesPageCategoryIds: parseIdList(map[k.articlesPageCategoryIds]),
    articlesPageAuthorIds: parseIdList(map[k.articlesPageAuthorIds]),
    homeCategoryIds: parseIdList(map[k.homeCategoryIds]),
    homeAuthorIds: parseIdList(map[k.homeAuthorIds]),
    homeEnabled: parseBoolean(map[k.homeEnabled], true),
    homeLimit: parseLimit(map[k.homeLimit]),
  }
}

export const getArticleDisplaySettings = async (): Promise<ArticleDisplaySettings> => {
  const map = await getSiteSettingsMap()
  return parseArticleDisplaySettings(map)
}

export function resolveArticleCategoryId(article: {
  category?: { id?: unknown } | null
  category_id?: unknown
}): string | null {
  if (article.category?.id != null) return String(article.category.id)
  if (article.category_id != null) return String(article.category_id)
  return null
}

/** Filter published articles for articles page or home shelf. Empty ID lists = no filter (show all). */
export function filterArticlesByDisplaySettings<
  T extends {
    author?: unknown
    author_id?: unknown
    category?: { id?: unknown } | null
    category_id?: unknown
  },
>(articles: T[], settings: ArticleDisplaySettings, scope: ArticleDisplayScope): T[] {
  const categoryIds =
    scope === 'home' ? settings.homeCategoryIds : settings.articlesPageCategoryIds
  const authorIds =
    scope === 'home' ? settings.homeAuthorIds : settings.articlesPageAuthorIds

  let result = articles

  if (categoryIds.length > 0) {
    const allowed = new Set(categoryIds)
    const applicable = new Set(
      result
        .map((a) => resolveArticleCategoryId(a))
        .filter((id): id is string => id !== null && allowed.has(id)),
    )
    if (applicable.size > 0) {
      result = result.filter((a) => {
        const cid = resolveArticleCategoryId(a)
        return cid !== null && applicable.has(cid)
      })
    }
  }

  if (authorIds.length > 0) {
    const allowed = new Set(authorIds)
    const applicable = new Set(
      result
        .map((a) => resolveArticleAuthorIdFromArticle(a))
        .filter((id): id is string => id !== null && allowed.has(id)),
    )
    if (applicable.size > 0) {
      result = result.filter((a) => {
        const aid = resolveArticleAuthorIdFromArticle(a)
        return aid !== null && applicable.has(aid)
      })
    }
  }

  if (scope === 'home') {
    return result.slice(0, settings.homeLimit)
  }

  return result
}
