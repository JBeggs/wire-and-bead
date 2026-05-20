/** Riverside Herald owns article content; categories are listed under this slug. */
export const NEWS_CONTENT_COMPANY_SLUG =
  process.env.NEXT_PUBLIC_NEWS_COMPANY_SLUG || 'riverside-herald'

export const ARTICLE_DISPLAY_SETTING_KEYS = {
  articlesPageCategoryIds: 'articles_page_category_ids',
  articlesPageAuthorIds: 'articles_page_author_ids',
  homeCategoryIds: 'home_articles_category_ids',
  homeAuthorIds: 'home_articles_author_ids',
  homeEnabled: 'home_articles_enabled',
  homeLimit: 'home_articles_limit',
} as const

export type ArticleDisplayScope = 'articles' | 'home'

export type ArticleDisplaySettings = {
  articlesPageCategoryIds: string[]
  articlesPageAuthorIds: string[]
  homeCategoryIds: string[]
  homeAuthorIds: string[]
  homeEnabled: boolean
  homeLimit: number
}
