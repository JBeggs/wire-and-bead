'use client'

import { useTheme, THEMES, THEME_META, type Theme } from '@/contexts/ThemeContext'
import { Brush, Gem, Palette } from 'lucide-react'

const ICONS: Record<Theme, React.ComponentType<{ className?: string }>> = {
  artisan: Brush,
  boutique: Gem,
  bohemian: Palette,
}

interface ThemeToggleProps {
  /** `icon` fits in the header; `full` shows labels beside icons. */
  variant?: 'icon' | 'full'
  className?: string
  /** Optional heading for screen readers. Defaults to "Theme". */
  label?: string
}

/**
 * Accessible segmented radio for picking the active site theme. Renders as
 * a pill with three equal-width cells; the selected cell has elevated
 * contrast. Keyboard users can tab to a cell and press space/enter.
 */
export default function ThemeToggle({
  variant = 'icon',
  className,
  label = 'Theme',
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[
        'inline-flex items-center gap-1 rounded-full border p-1',
        'bg-surface border-border-default',
        className ?? '',
      ].join(' ')}
    >
      {THEMES.map((id) => {
        const Icon = ICONS[id]
        const meta = THEME_META[id]
        const active = id === theme
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={meta.label}
            title={`${meta.label} — ${meta.description}`}
            onClick={() => setTheme(id)}
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              'transition-colors duration-150 focus:outline-none focus-visible:ring-2',
              active
                ? 'bg-primary text-[rgb(var(--color-text-inverse))] shadow-sm'
                : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {variant === 'full' && <span>{meta.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
