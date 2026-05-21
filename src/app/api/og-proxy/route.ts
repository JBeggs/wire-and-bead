import { NextRequest } from 'next/server'
import { GET_fromSrcParam } from '@/lib/fetch-proxied-media'
import { OG_PROXY_CACHE_PAGE } from '@/lib/media-proxy'

/**
 * Serves product images under the storefront domain for OG / WhatsApp previews.
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')
  return GET_fromSrcParam(src, OG_PROXY_CACHE_PAGE)
}
