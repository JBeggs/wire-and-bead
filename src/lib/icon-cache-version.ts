import 'server-only'
import { statSync } from 'fs'
import path from 'path'

/** Cache-bust query from file mtime so browsers pick up replaced icons in public/. */
function versionForPublicFile(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', filename)
    return String(Math.floor(statSync(filePath).mtimeMs))
  } catch {
    return '0'
  }
}

/** e.g. iconUrl('/icon.png') → '/icon.png?v=1715952000000' */
export function iconUrl(publicPath: string): string {
  const normalized = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
  const v = versionForPublicFile(normalized)
  return `${publicPath.startsWith('/') ? publicPath : `/${publicPath}`}?v=${v}`
}
