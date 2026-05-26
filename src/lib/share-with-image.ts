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
      const res = await fetch(urls[i], { cache: 'no-store' })
      if (!res.ok) continue
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      files.push(
        new File([blob], urls.length > 1 ? `share-${i + 1}.${ext}` : filename, {
          type: blob.type || 'image/jpeg',
        }),
      )
    }
    if (!files.length) return false

    const tryShare = async (shareFiles: File[]) => {
      const shareData: ShareData = { text: message, files: shareFiles }
      if (navigator.canShare && !navigator.canShare(shareData)) return false
      await navigator.share(shareData)
      return true
    }

    if (files.length > 1 && (await tryShare(files))) return true
    if (await tryShare([files[0]])) return true
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
