import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Article } from '@/lib/types'
import {
  resolveArticleAuthorLabel,
  type ArticleAuthorFields,
} from '@/lib/article-author-options'
import { getArticleImageUrl } from '@/lib/image-utils'

export default function HomeArticlesSection({
  articles,
  title = 'Stories & Inspiration',
  subtitle = 'Tips, guides, and behind-the-scenes from our journal',
}: {
  articles: Article[]
  title?: string
  subtitle?: string
}) {
  if (articles.length === 0) return null

  return (
    <section className="py-16 bg-bg">
      <div className="container-wide">
        <div className="section-header">
          <div>
            <h2 className="section-title">{title}</h2>
            <p className="text-text-muted mt-1">{subtitle}</p>
          </div>
          <Link href="/articles" className="btn btn-secondary">
            Read More <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        <div className="article-grid">
          {articles.map((article) => {
            const authorLabel = resolveArticleAuthorLabel(article as ArticleAuthorFields)
            return (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="card group overflow-hidden"
              >
                <img
                  src={getArticleImageUrl(article)}
                  alt={article.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-5">
                  {article.category && (
                    <span className="tag tag-vintage mb-2">{article.category.name}</span>
                  )}
                  <h3 className="text-lg font-semibold text-text group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-sm text-text-muted mt-2 line-clamp-3">{article.excerpt}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-text-muted">
                    {article.published_at && (
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                    )}
                    <span>{authorLabel}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
