'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Phone, FileText, ShoppingBag } from 'lucide-react'
import { formatMoney } from '@/lib/money'

export interface CheckoutSuccessClientProps {
  highValueThreshold: number | null
  currency: string
  locale: string
}

export function CheckoutSuccessClient({
  highValueThreshold,
  currency,
  locale,
}: CheckoutSuccessClientProps) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const isHighValue = searchParams.get('highValue') === 'true'
  const thresholdText =
    highValueThreshold != null && highValueThreshold > 0
      ? formatMoney(highValueThreshold, currency, locale)
      : null

  return (
    <div className="min-h-screen bg-vintage-background py-20">
      <div className="container-narrow">
        <div className="card p-8 md:p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold font-playfair text-text">Order Successfully Placed!</h1>
            <p className="text-text-muted">
              Order Number: <span className="font-mono font-bold text-text">{orderId || '---'}</span>
            </p>
          </div>

          {isHighValue ? (
            <div className="bg-vintage-primary/5 border border-vintage-primary/10 rounded-2xl p-6 md:p-8 space-y-6 text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <Phone className="w-5 h-5 text-vintage-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text">What happens next?</h3>
                  <p className="text-sm text-text-light leading-relaxed">
                    {thresholdText ? (
                      <>
                        Since your order is over {thresholdText}, we follow a personalized process. A representative
                        will contact you shortly via email or phone to finalize the paperwork and payment details.
                      </>
                    ) : (
                      <>
                        This order may require additional verification. A representative will contact you shortly via
                        email or phone to finalize next steps.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileText className="w-5 h-5 text-vintage-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text">No payment required yet</h3>
                  <p className="text-sm text-text-light leading-relaxed">
                    Your items have been reserved. No money will be deposited until the necessary paperwork is
                    completed and you&apos;ve spoken with our team.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text-light max-w-md mx-auto">
              Thank you for your purchase! We&apos;ve received your order and are getting it ready for shipment.
              You&apos;ll receive a confirmation email shortly.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/products" className="btn btn-primary px-8 py-3 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
            </Link>
            <Link href="/" className="btn btn-secondary px-8 py-3">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
