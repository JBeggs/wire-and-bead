import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serverNewsApi } from '@/lib/api-server'
import { Article } from '@/lib/types'
import { Calendar, User, ArrowLeft, Clock } from 'lucide-react'
import { getCompany } from '@/lib/company'
import { resolveLocale } from '@/lib/locale'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const articlesData = await serverNewsApi.articles.getBySlug(slug)
    const articles = Array.isArray(articlesData) ? articlesData : (articlesData as any)?.results || []
    return articles[0] || null
  } catch (error) {
    console.error('Error fetching article:', error)
    return null
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const [article, company] = await Promise.all([getArticle(slug), getCompany()])
  const locale = resolveLocale(company)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-vintage-background">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-wide py-4">
          <Link href="/articles" className="flex items-center text-text-muted hover:text-vintage-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article>
        {article.featured_media?.file_url && (
          <div className="w-full h-64 md:h-96 relative">
            <img
              src={article.featured_media.file_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="container-narrow py-12">
          {/* Category */}
          {article.category && (
            <span className="tag tag-vintage mb-4">{article.category.name}</span>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-playfair text-text mb-4">
            {article.title}
          </h1>

          {/* Subtitle */}
          {article.subtitle && (
            <p className="text-xl text-text-light mb-6">{article.subtitle}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-text-muted mb-8 pb-8 border-b border-gray-200">
            {article.author?.full_name && (
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {article.author.full_name}
              </span>
            )}
            {article.published_at && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(article.published_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            )}
            {article.read_time_minutes && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {article.read_time_minutes} min read
              </span>
            )}
          </div>

          {/* Content */}
          <div 
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-text-muted mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span key={tag.id} className="tag tag-vintage">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* CTA */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container-narrow text-center">
          <h2 className="text-2xl font-bold font-playfair text-text mb-4">
            Discover Our Collection
          </h2>
          <p className="text-text-muted mb-6">
            Find unique vintage treasures and modern essentials in our shop.
          </p>
          <Link href="/products" className="btn btn-primary">
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  )
}
