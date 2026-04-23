/**
 * Theme-aware SVG placeholders used by `<SafeImage>` when no uploaded media
 * is available. They inherit the active theme via `currentColor`.
 *
 * Icons come from `lucide-react` (already a dependency) so we stay consistent
 * with the rest of the template and benefit from tree-shaking.
 */

import {
  Circle,
  Image as ImageIcon,
  Images,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
} from 'lucide-react'

export type PlaceholderKind =
  | 'logo'
  | 'hero'
  | 'gallery'
  | 'avatar'
  | 'category'
  | 'product-square'
  | 'product-landscape'

interface PlaceholderProps {
  /** Accessible label when a meaningful alt isn't available. */
  label?: string
  /** Display monogram (e.g. company initials) for the logo placeholder. */
  monogram?: string
  className?: string
}

function Base({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label?: string
}) {
  return (
    <div
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      className={[
        'absolute inset-0 flex items-center justify-center text-center',
        'bg-surface-raised text-text-muted',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function LogoPlaceholder({ monogram = 'S', label, className }: PlaceholderProps) {
  const letters = (monogram || 'S').slice(0, 2).toUpperCase()
  return (
    <Base label={label} className={className}>
      <div
        aria-hidden
        className="flex h-full w-full items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-accent)) 100%)',
          color: 'rgb(var(--color-text-inverse))',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 'clamp(1rem, 3vw, 2.5rem)',
          letterSpacing: '0.02em',
        }}
      >
        {letters}
      </div>
    </Base>
  )
}

export function HeroPlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Hero image placeholder'} className={className}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--color-primary) / 0.85) 0%, rgb(var(--color-accent) / 0.85) 100%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-2 text-[rgb(var(--color-text-inverse))]">
        <Sparkles className="h-10 w-10" strokeWidth={1.5} />
        <span className="font-heading text-sm uppercase tracking-[0.2em]">
          Your hero image
        </span>
      </div>
    </Base>
  )
}

export function GalleryPlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Gallery image placeholder'} className={className}>
      <Images className="h-10 w-10 opacity-60" strokeWidth={1.25} />
    </Base>
  )
}

export function AvatarPlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Avatar placeholder'} className={className}>
      <Circle className="h-full w-full opacity-20" strokeWidth={1} />
      <User className="absolute h-1/2 w-1/2 opacity-70" strokeWidth={1.5} />
    </Base>
  )
}

export function CategoryPlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Category image placeholder'} className={className}>
      <Tag className="h-10 w-10 opacity-60" strokeWidth={1.25} />
    </Base>
  )
}

export function ProductSquarePlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Product image placeholder'} className={className}>
      <ShoppingBag className="h-10 w-10 opacity-60" strokeWidth={1.25} />
    </Base>
  )
}

export function ProductLandscapePlaceholder({ label, className }: PlaceholderProps) {
  return (
    <Base label={label ?? 'Product image placeholder'} className={className}>
      <ImageIcon className="h-10 w-10 opacity-60" strokeWidth={1.25} />
    </Base>
  )
}

interface RenderPlaceholderProps extends PlaceholderProps {
  kind: PlaceholderKind
}

/** Dispatch by kind so SafeImage can stay simple. */
export function Placeholder({ kind, ...rest }: RenderPlaceholderProps) {
  switch (kind) {
    case 'logo':
      return <LogoPlaceholder {...rest} />
    case 'hero':
      return <HeroPlaceholder {...rest} />
    case 'gallery':
      return <GalleryPlaceholder {...rest} />
    case 'avatar':
      return <AvatarPlaceholder {...rest} />
    case 'category':
      return <CategoryPlaceholder {...rest} />
    case 'product-landscape':
      return <ProductLandscapePlaceholder {...rest} />
    case 'product-square':
    default:
      return <ProductSquarePlaceholder {...rest} />
  }
}
