import { Suspense } from 'react'
import { getCompany } from '@/lib/company'
import { getSiteSetting, coerceSiteNumber } from '@/lib/site-settings'
import { CheckoutSuccessClient } from './CheckoutSuccessClient'

export default async function CheckoutSuccessPage() {
  const company = await getCompany()
  const highValueThreshold = coerceSiteNumber(await getSiteSetting('high_value_order_threshold'))

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-vintage-background flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="h-8 bg-gray-200 rounded w-48" />
          </div>
        </div>
      }
    >
      <CheckoutSuccessClient
        highValueThreshold={highValueThreshold}
        currency={company.currency}
        locale={company.localeTag}
      />
    </Suspense>
  )
}
