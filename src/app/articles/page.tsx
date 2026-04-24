import Link from 'next/link'
import { serverNewsApi } from '@/lib/api-server'
import { Article } from '@/lib/types'
import { Calendar, User, ArrowRight, Search } from 'lucide-react'

interface ArticlesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getArticles(params: { search?: string; category?: string }) {
  try {
    const apiParams: Record<string, string> = { status: 'published' }
    if (params.search?.trim()) apiParams.search = params.search.trim()
    if (params.category) apiParams.category = params.category

    const articlesData = await serverNewsApi.articles.list(apiParams)
    return Array.isArray(articlesData) ? articlesData : (articlesData as any)?.results || []
  } catch (error) {
    console.error('Error fetching articles:', error)
    return []
  }
}

async function getCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'
    const res = await fetch(`${baseUrl}/news/categories/`, {
      headers: { 'X-Company-Slug': 'riverside-herald', 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data: any = await res.json()
    const raw = Array.isArray(data) ? data : data?.results || []
    return raw.map((c: any) => ({ id: String(c.id), name: c.name || 'Uncategorized' }))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

function buildArticlesUrl(overrides: { category?: string; search?: string }) {
  const params = new URLSearchParams()
  if (overrides.category) params.set('category', overrides.category)
  if (overrides.search) params.set('search', overrides.search)
  const qs = params.toString()
  return `/articles${qs ? `?${qs}` : ''}`
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams
  const category = typeof params.category === 'string' ? params.category : undefined
  const search = typeof params.search === 'string' ? params.search : undefined

  const [articles, categories] = await Promise.all([
    getArticles({ search, category }),
    getCategories(),
  ])

  return (
    <div className="min-h-screen bg-vintage-background">
      {/* Page Header */}
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">
            Stories & Inspiration
          </h1>
          <p className="text-lg text-green-100">
            Tips, guides, and behind-the-scenes from the world of vintage and modern treasures
          </p>
        </div>
      </section>

      {/* Category Filter & Search */}
      <section className="border-b border-vintage-primary/10 py-6 bg-white/50">
        <div className="container-wide">
          {/* Search */}
          <form action="/articles" method="GET" className="mb-4">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search articles..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-primary/20 bg-white text-text focus:outline-none focus:ring-2 focus:ring-vintage-primary/30 focus:border-vintage-primary"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-vintage-primary hover:text-vintage-primary/80"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/articles"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !category
                  ? 'bg-vintage-primary text-white'
                  : 'bg-vintage-primary/10 text-vintage-primary hover:bg-vintage-primary/20'
              }`}
            >
              All
            </Link>
            {categories.map((cat: { id: string; name: string }) => (
              <Link
                key={cat.id}
                href={buildArticlesUrl({ category: cat.id, search: search || undefined })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === cat.id
                    ? 'bg-vintage-primary text-white'
                    : 'bg-vintage-primary/10 text-vintage-primary hover:bg-vintage-primary/20'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="container-wide">
          {articles.length > 0 ? (
            <div className="article-grid">
              {articles.map((article: Article) => (
                <Link key={article.id} href={`/articles/${article.slug}`} className="card group overflow-hidden">
                  {article.featured_media?.file_url ? (
                    <img
                      src={article.featured_media.file_url}
                      alt={article.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-vintage-primary/10 flex items-center justify-center">
                      <span className="text-4xl font-playfair text-vintage-primary/30">P&P</span>
                    </div>
                  )}
                  <div className="p-5">
                    {article.category && (
                      <span className="tag tag-vintage mb-2">{article.category.name}</span>
                    )}
                    <h2 className="text-lg font-semibold text-text group-hover:text-vintage-primary transition-colors line-clamp-2">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm text-text-muted mt-2 line-clamp-3">{article.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
                      <div className="flex items-center gap-4">
                        {article.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.published_at).toLocaleDateString()}
                          </span>
                        )}
                        {article.author?.full_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {article.author.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-vintage-primary font-medium text-sm">
                      Read More <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-vintage-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-playfair text-vintage-primary">P&P</span>
              </div>
              <h2 className="text-xl font-semibold text-text mb-2">
                {search || category ? 'No articles match your filters' : 'No articles yet'}
              </h2>
              <p className="text-text-muted mb-6">
                {search || category
                  ? 'Try a different category or search term.'
                  : 'Check back soon for stories and inspiration!'}
              </p>
              <Link href={search || category ? '/articles' : '/'} className="btn btn-primary">
                {search || category ? 'Clear filters' : 'Back to Home'}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
