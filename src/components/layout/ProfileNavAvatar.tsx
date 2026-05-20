'use client'

import { User } from 'lucide-react'

type ProfileLike = {
  first_name?: string
  last_name?: string
  full_name?: string
  avatar_url?: string
} | null | undefined

type UserLike = { email?: string } | null | undefined

export function getProfileDisplayName(profile: ProfileLike, user: UserLike): string {
  const fn = profile?.first_name?.trim()
  const ln = profile?.last_name?.trim()
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  if (profile?.full_name?.trim()) return profile.full_name.trim()
  return user?.email?.split('@')[0] || 'Account'
}

type ProfileNavAvatarProps = {
  profile?: ProfileLike
  user?: UserLike
  avatarUrl?: string | null
  displayName?: string
  size?: 'sm' | 'md'
  className?: string
}

export function ProfileNavAvatar({
  profile,
  user,
  avatarUrl,
  displayName,
  size = 'sm',
  className = '',
}: ProfileNavAvatarProps) {
  const url = (avatarUrl ?? profile?.avatar_url)?.trim() || ''
  const name = displayName ?? getProfileDisplayName(profile, user)
  const sizeClass = size === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden
        className={`${sizeClass} rounded-full object-cover border border-border-default shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} bg-primary rounded-full flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      <User className={`${iconClass} text-[rgb(var(--color-on-accent))]`} />
      <span className="sr-only">{name}</span>
    </div>
  )
}
