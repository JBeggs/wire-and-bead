/**
 * Theme constants that are safe to import from BOTH server and client modules.
 *
 * `ThemeContext.tsx` is a `'use client'` boundary — importing its named exports
 * from a server component yields a client-reference proxy, not the real value
 * (e.g. `THEMES.includes is not a function`). Keep the plain constants here and
 * re-export them from `ThemeContext.tsx` for backwards-compatible client use.
 */

export const THEMES = ['artisan', 'boutique', 'bohemian'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'artisan'

export const THEME_META: Record<
  Theme,
  { id: Theme; label: string; description: string }
> = {
  artisan: {
    id: 'artisan',
    label: 'Artisan',
    description: 'Warm neutrals, handcrafted feel',
  },
  boutique: {
    id: 'boutique',
    label: 'Boutique',
    description: 'Minimal mono with a gold accent',
  },
  bohemian: {
    id: 'bohemian',
    label: 'Bohemian',
    description: 'Teal, mustard and plum, soft edges',
  },
}

export const THEME_COOKIE_KEY = 'site_theme'
export const THEME_STORAGE_KEY = 'site_theme'

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v)
}

/**
 * Inline script injected in <head> to apply the theme before first paint,
 * preventing a flash of default theme on navigation / reload.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function(){try{
  var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_KEY}=([^;]+)/);
  var t=m?decodeURIComponent(m[1]):null;
  if(!t){try{t=localStorage.getItem('${THEME_STORAGE_KEY}');}catch(e){}}
  var allowed=${JSON.stringify(THEMES)};
  if(!t||allowed.indexOf(t)===-1)t='${DEFAULT_THEME}';
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();
`
