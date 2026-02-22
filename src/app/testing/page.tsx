'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TEST_FLOW_STEPS = [
  {
    id: 'unit',
    title: 'Unit Tests',
    tool: 'Vitest + React Testing Library',
    description: 'Individual components and functions are tested in isolation. Mocks replace external dependencies.',
    details: [
      'Components render correctly with given props',
      'User interactions trigger expected handlers',
      'Conditional rendering based on state',
    ],
  },
  {
    id: 'coverage',
    title: 'Coverage Report',
    tool: 'Vitest + v8',
    description: 'Code coverage measures which lines, branches, and functions are exercised by tests.',
    details: [
      'Statements: % of executable statements run',
      'Branches: % of conditional paths taken',
      'Functions: % of functions called',
      'Lines: % of lines executed',
    ],
  },
  {
    id: 'e2e',
    title: 'End-to-End (E2E)',
    tool: 'Cypress',
    description: 'Real browser tests against a running app. Tests full user journeys.',
    details: [
      'Login, register, checkout flows',
      'Product browsing and cart',
      'Form submissions and API round-trips',
    ],
  },
]

function CoverageDisplay({ data }: { data: Record<string, unknown> | null }) {
  const total = (data?.total ?? null) as Record<string, { pct?: number; covered?: number; total?: number }> | null
  const summary = (data?.summary ?? null) as Record<string, number> | null
  const hasData = total || summary

  if (!hasData) {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-6 text-amber-800">
        <p className="font-medium mb-2">No coverage data available</p>
        <p className="text-sm opacity-90 mb-2">
          From the <code className="bg-black/10 px-2 py-1 rounded">past-and-present</code> directory, run:
        </p>
        <p className="font-mono text-sm bg-black/10 px-3 py-2 rounded">npm run test:coverage:public</p>
        <p className="text-xs opacity-80 mt-2">Then refresh this page.</p>
      </div>
    )
  }

  const getMetric = (key: string) => {
    const t = total?.[key]
    const s = summary?.[key]
    if (t && typeof t === 'object') return { pct: t.pct ?? 0, covered: t.covered ?? 0, total: t.total ?? 0 }
    if (typeof s === 'number') return { pct: s, covered: 0, total: 0 }
    return { pct: 0, covered: 0, total: 0 }
  }

  const metrics = [
    { label: 'Lines', data: getMetric('lines'), color: 'emerald' as const },
    { label: 'Statements', data: getMetric('statements'), color: 'blue' as const },
    { label: 'Functions', data: getMetric('functions'), color: 'violet' as const },
    { label: 'Branches', data: getMetric('branches'), color: 'amber' as const },
  ]

  const colorMap = { emerald: '#10b981', blue: '#3b82f6', violet: '#8b5cf6', amber: '#f59e0b' }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(({ label, data: d, color }) => {
        const pct = d.pct ?? 0
        const covered = d?.covered ?? 0
        const total = d?.total ?? 0
        return (
          <div
            key={label}
            className="rounded-xl bg-white/50 border border-gray-200 p-4 backdrop-blur-sm"
          >
            <p className="text-sm text-text-light mb-1">{label}</p>
            <p className="text-2xl font-bold text-text">{pct.toFixed(1)}%</p>
            <p className="text-xs text-text-light mt-1">
              {covered > 0 || total > 0 ? `${covered} / ${total}` : '—'}
            </p>
            <div className="mt-2 h-2 bg-vintage-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: colorMap[color],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TestingPage() {
  const [coverage, setCoverage] = useState<Record<string, unknown> | null>(null)
  const [coverageLoading, setCoverageLoading] = useState(true)

  useEffect(() => {
    fetch('/coverage-summary.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCoverage(data)
        setCoverageLoading(false)
      })
      .catch(() => {
        setCoverage(null)
        setCoverageLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-vintage-background">
      <main className="container mx-auto px-4 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-text mb-2">Testing</h1>
          <p className="text-text-light mb-10">
            How we ensure quality and reliability across the Past and Present codebase.
          </p>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Coverage (Last Run)
            </h2>
            {coverageLoading ? (
              <div className="rounded-xl bg-white/50 border border-gray-200 p-6 text-text-light">
                Loading coverage…
              </div>
            ) : (
              <CoverageDisplay data={coverage} />
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-6 flex items-center gap-2">
              <span className="text-2xl">🔄</span> What Happens During Testing
            </h2>
            <div className="space-y-6">
              {TEST_FLOW_STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className="rounded-2xl bg-white/50 border border-gray-200 p-6 backdrop-blur-sm hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-vintage-primary/20 flex items-center justify-center text-text font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-text mb-1">{step.title}</h3>
                      <p className="text-sm text-text-light mb-2">{step.tool}</p>
                      <p className="text-text/90 mb-4">{step.description}</p>
                      <ul className="space-y-1 text-sm text-text-light">
                        {step.details.map((d, j) => (
                          <li key={j} className="flex items-center gap-2">
                            <span className="text-emerald-600">•</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-2xl bg-white/50 border border-gray-200 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-text mb-4">Commands</h2>
            <div className="space-y-2 font-mono text-sm">
              <p className="text-text">
                <span className="text-text-light">$</span> npm run test
                <span className="text-text-light ml-2">— Single run</span>
              </p>
              <p className="text-text">
                <span className="text-text-light">$</span> npm run test:watch
                <span className="text-text-light ml-2">— Watch mode</span>
              </p>
              <p className="text-text">
                <span className="text-text-light">$</span> npm run test:coverage:public
                <span className="text-text-light ml-2">— Generate coverage and copy to Testing page</span>
              </p>
              <p className="text-text">
                <span className="text-text-light">$</span> npm run test:e2e
                <span className="text-text-light ml-2">— Run Cypress E2E (headless)</span>
              </p>
              <p className="text-text">
                <span className="text-text-light">$</span> npm run test:e2e:open
                <span className="text-text-light ml-2">— Open Cypress UI for interactive E2E testing</span>
              </p>
            </div>
          </section>

          <footer className="mt-12 text-center">
            <Link
              href="/"
              className="text-text-light hover:text-text transition-colors text-sm"
            >
              ← Back to home
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
