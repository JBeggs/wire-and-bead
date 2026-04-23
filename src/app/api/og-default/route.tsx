/**
 * Dynamic Open Graph image — renders a branded 1200x630 PNG using the
 * active company's name and the logo monogram as a fallback. Used by
 * pages that haven't uploaded a bespoke OG image.
 */

import { ImageResponse } from 'next/og'
import { getCompany, companyMonogram } from '@/lib/company'

export const runtime = 'edge'

const OG_SIZE = { width: 1200, height: 630 }

export async function GET() {
  const company = await getCompany()
  const monogram = companyMonogram(company.name)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #B87333 0%, #D4A574 100%)',
          color: '#fff',
          fontFamily: 'Georgia, serif',
          padding: 80,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -4,
            textShadow: '0 6px 20px rgba(0,0,0,0.2)',
          }}
        >
          {monogram}
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: -1,
          }}
        >
          {company.name}
        </div>
        {company.tagline ? (
          <div
            style={{
              marginTop: 16,
              fontSize: 28,
              opacity: 0.9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {company.tagline}
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE },
  )
}
