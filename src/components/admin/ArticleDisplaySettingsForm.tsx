'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Newspaper, Save } from 'lucide-react'
import { newsApi, getApiErrorMessage } from '@/lib/api'
import {
  buildAuthorOptionsFromArticles,
  type ArticleAuthorFields,
} from '@/lib/article-author-options'
import {
  ARTICLE_DISPLAY_SETTING_KEYS,
  NEWS_CONTENT_COMPANY_SLUG,
} from '@/lib/article-display-settings-keys'
import { useToast } from '@/contexts/ToastContext'

function newsContentFetchHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'X-Company-Slug': NEWS_CONTENT_COMPANY_SLUG,
    'Content-Type': 'application/json',
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

type SelectOption = { id: string; label: string }

type SettingRow = { id: string; value: string; type: string }

function parseIdListFromSetting(value: string, type: string): string[] {
  if (!value.trim()) return []
  try {
    const parsed = type === 'json' ? JSON.parse(value) : JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean)
  } catch {
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function MultiSelectGroup({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string
  hint: string
  options: SelectOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  if (options.length === 0) {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">{label}</p>
        <p className="text-sm text-text-muted">No options available yet.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className="text-sm text-text-muted mb-2">{hint}</p>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border-default bg-surface-raised p-3 space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2 text-sm text-text cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              className="rounded border-border-default"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 text-xs font-semibold underline"
        >
          Clear selection (show all)
        </button>
      )}
    </div>
  )
}

export default function ArticleDisplaySettingsForm() {
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<SelectOption[]>([])
  const [authors, setAuthors] = useState<SelectOption[]>([])
  const [settingsByKey, setSettingsByKey] = useState<Record<string, SettingRow>>({})

  const [articlesPageCategoryIds, setArticlesPageCategoryIds] = useState<string[]>([])
  const [articlesPageAuthorIds, setArticlesPageAuthorIds] = useState<string[]>([])
  const [homeCategoryIds, setHomeCategoryIds] = useState<string[]>([])
  const [homeAuthorIds, setHomeAuthorIds] = useState<string[]>([])
  const [homeEnabled, setHomeEnabled] = useState(true)
  const [homeLimit, setHomeLimit] = useState(3)

  const loadOptions = useCallback(async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://3pillars.pythonanywhere.com/api'

    const [catRes, articlesRes, settingsRaw] = await Promise.all([
      fetch(`${baseUrl}/news/categories/`, {
        headers: newsContentFetchHeaders(),
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/news/articles/?status=published`, {
        headers: newsContentFetchHeaders(),
        cache: 'no-store',
      }),
      newsApi.siteSettings.list(),
    ])

    if (catRes.ok) {
      const catData: unknown = await catRes.json()
      const catArr = Array.isArray(catData)
        ? catData
        : (catData as { results?: unknown[] })?.results || []
      setCategories(
        (catArr as { id: string; name?: string }[]).map((c) => ({
          id: String(c.id),
          label: c.name || 'Uncategorized',
        })),
      )
    }

    let articles: unknown[] = []
    if (articlesRes.ok) {
      const articlesData: unknown = await articlesRes.json()
      articles = Array.isArray(articlesData)
        ? articlesData
        : (articlesData as { results?: unknown[] })?.results || []
    }
    setAuthors(buildAuthorOptionsFromArticles(articles as ArticleAuthorFields[]))

    const settingsArr = Array.isArray(settingsRaw)
      ? settingsRaw
      : (settingsRaw as { results?: unknown[] })?.results || []
    const byKey: Record<string, SettingRow> = {}
    for (const row of settingsArr as { key: string; id: string; value?: string; type?: string }[]) {
      byKey[row.key] = { id: row.id, value: row.value ?? '', type: row.type || 'string' }
    }
    setSettingsByKey(byKey)

    const k = ARTICLE_DISPLAY_SETTING_KEYS
    setArticlesPageCategoryIds(
      parseIdListFromSetting(
        byKey[k.articlesPageCategoryIds]?.value ?? '',
        byKey[k.articlesPageCategoryIds]?.type ?? 'json',
      ),
    )
    setArticlesPageAuthorIds(
      parseIdListFromSetting(
        byKey[k.articlesPageAuthorIds]?.value ?? '',
        byKey[k.articlesPageAuthorIds]?.type ?? 'json',
      ),
    )
    setHomeCategoryIds(
      parseIdListFromSetting(
        byKey[k.homeCategoryIds]?.value ?? '',
        byKey[k.homeCategoryIds]?.type ?? 'json',
      ),
    )
    setHomeAuthorIds(
      parseIdListFromSetting(
        byKey[k.homeAuthorIds]?.value ?? '',
        byKey[k.homeAuthorIds]?.type ?? 'json',
      ),
    )
    const homeOn = byKey[k.homeEnabled]?.value
    setHomeEnabled(homeOn !== 'false' && homeOn !== '0')
    const limit = parseInt(byKey[k.homeLimit]?.value ?? '3', 10)
    setHomeLimit(Number.isFinite(limit) && limit > 0 ? Math.min(limit, 24) : 3)
  }, [])

  useEffect(() => {
    setLoading(true)
    loadOptions()
      .catch((err) => {
        console.error(err)
        showError('Failed to load article display options')
      })
      .finally(() => setLoading(false))
  }, [loadOptions, showError])

  const upsertJsonSetting = async (key: string, value: unknown) => {
    const json = JSON.stringify(value)
    const existing = settingsByKey[key]
    if (existing) {
      await newsApi.siteSettings.update(existing.id, {
        key,
        value: json,
        type: 'json',
        is_public: true,
      })
    } else {
      await newsApi.siteSettings.create({ key, value: json, type: 'json', is_public: true })
    }
  }

  const upsertStringSetting = async (key: string, value: string) => {
    const existing = settingsByKey[key]
    if (existing) {
      await newsApi.siteSettings.update(existing.id, {
        key,
        value,
        type: 'string',
        is_public: true,
      })
    } else {
      await newsApi.siteSettings.create({ key, value, type: 'string', is_public: true })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const k = ARTICLE_DISPLAY_SETTING_KEYS
      await Promise.all([
        upsertJsonSetting(k.articlesPageCategoryIds, articlesPageCategoryIds),
        upsertJsonSetting(k.articlesPageAuthorIds, articlesPageAuthorIds),
        upsertJsonSetting(k.homeCategoryIds, homeCategoryIds),
        upsertJsonSetting(k.homeAuthorIds, homeAuthorIds),
        upsertStringSetting(k.homeEnabled, homeEnabled ? 'true' : 'false'),
        upsertStringSetting(k.homeLimit, String(homeLimit)),
      ])
      await loadOptions()
      showSuccess('Article display settings saved')
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to save article display settings'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center gap-2 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading article filters…
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold font-heading text-text flex items-center gap-2">
          <Newspaper className="w-5 h-5 opacity-70" />
          Article display
        </h2>
        <p className="text-sm text-text-muted mt-1 max-w-2xl">
          Choose which categories and authors appear on your articles page and home page. Leave all
          unchecked to show every published article.
        </p>
      </div>

      <div className="space-y-4 border-t border-border-default pt-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text">Articles page</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <MultiSelectGroup
            label="Categories"
            hint="Only articles in these categories appear on /articles"
            options={categories}
            selected={articlesPageCategoryIds}
            onChange={setArticlesPageCategoryIds}
          />
          <MultiSelectGroup
            label="Authors"
            hint="Only articles by these authors appear on /articles"
            options={authors}
            selected={articlesPageAuthorIds}
            onChange={setArticlesPageAuthorIds}
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-border-default pt-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text">Home page</h3>
        <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
          <input
            type="checkbox"
            checked={homeEnabled}
            onChange={(e) => setHomeEnabled(e.target.checked)}
            className="rounded border-border-default text-primary focus:ring-primary/30"
          />
          <span>Show article section on the home page</span>
        </label>
        <div className="grid md:grid-cols-2 gap-6">
          <MultiSelectGroup
            label="Categories"
            hint="Filters the home article shelf (when enabled)"
            options={categories}
            selected={homeCategoryIds}
            onChange={setHomeCategoryIds}
          />
          <MultiSelectGroup
            label="Authors"
            hint="Filters the home article shelf (when enabled)"
            options={authors}
            selected={homeAuthorIds}
            onChange={setHomeAuthorIds}
          />
        </div>
        <div className="max-w-xs">
          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Maximum articles on home
          </label>
          <input
            type="number"
            min={1}
            max={24}
            value={homeLimit}
            onChange={(e) => setHomeLimit(Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 3)))}
            className="form-input mt-1 w-full"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save article display
      </button>
    </form>
  )
}
