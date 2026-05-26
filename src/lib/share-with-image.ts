/** Share text plus optional image(s) via Web Share API; returns true when handled. */
export async function shareTextWithOptionalImage(
  message: string,
  imageUrl: string | string[],
  filename = 'share.jpg',
): Promise<boolean> {
  const urls = (Array.isArray(imageUrl) ? imageUrl : [imageUrl]).filter(Boolean)
  if (!urls.length || typeof navigator === 'undefined' || !('share' in navigator)) {
    return false
  }

  try {
    const files: File[] = []
    for (let i = 0; i < urls.length; i++) {
      const res = await fetch(urls[i], { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.size) continue
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      files.push(
        new File([blob], urls.length > 1 ? `share-${i + 1}.${ext}` : filename, {
          type: blob.type || 'image/jpeg',
        }),
      )
    }
    if (!files.length) return false

    const tryShare = async (shareFiles: File[], withText: boolean) => {
      const shareData: ShareData = withText
        ? { text: message, files: shareFiles }
        : { files: shareFiles }
      if (navigator.canShare && !navigator.canShare(shareData)) return false
      await navigator.share(shareData)
      return true
    }

    // WhatsApp on Android often drops images when text+files are shared together.
    if (files.length === 1) {
      if (await tryShare([files[0]], false)) return true
      if (await tryShare([files[0]], true)) return true
    } else {
      if (await tryShare(files, false)) return true
      if (await tryShare(files, true)) return true
      if (await tryShare([files[0]], false)) return true
    }
    return false
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return true
    return false
  }
}

export function openWhatsAppWithText(message: string): void {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer',
  )
}

/** Resolve a server-provided media path against the current browser origin. */
export function resolveShareImageFetchUrl(mediaPath: string): string {
  if (!mediaPath) return ''
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    try {
      const parsed = new URL(mediaPath)
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`
      }
    } catch {
      return mediaPath
    }
  }
  if (typeof window !== 'undefined' && mediaPath.startsWith('/')) {
    return `${window.location.origin}${mediaPath}`
  }
  return mediaPath
}
