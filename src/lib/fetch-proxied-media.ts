import {
  mediaProxyUserAgent,
  parseAllowedMediaSrc,
} from '@/lib/media-proxy'

/** Fetch upstream media bytes for API route handlers. */
export async function fetchProxiedMedia(upstreamUrl: URL): Promise<Response> {
  const upstream = await fetch(upstreamUrl.toString(), {
    next: { revalidate: 86_400 },
    headers: {
      Accept: 'image/*',
      'User-Agent': mediaProxyUserAgent(),
    },
  })

  if (!upstream.ok) {
    return new Response('Not Found', { status: 404 })
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  const buf = await upstream.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: { 'Content-Type': contentType },
  })
}

export async function GET_fromSrcParam(
  src: string | null,
  cacheControl: string,
): Promise<Response> {
  const upstreamUrl = parseAllowedMediaSrc(src)
  if (!upstreamUrl) {
    return new Response('Bad Request', { status: 400 })
  }
  const body = await fetchProxiedMedia(upstreamUrl)
  if (body.status !== 200) return body
  const contentType = body.headers.get('Content-Type') || 'image/jpeg'
  const buf = await body.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  })
}
