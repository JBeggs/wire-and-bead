import { RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getCompany } from '@/lib/company'
import { getSiteSetting, coerceSiteString, coerceSiteNumber } from '@/lib/site-settings'

export default async function ReturnsPage() {
  const company = await getCompany()
  const [
    returnsEmailRaw,
    windowDaysRaw,
    authHoursRaw,
    refundMinRaw,
    refundMaxRaw,
    vintageNoteRaw,
    subtitleRaw,
  ] = await Promise.all([
    getSiteSetting('returns_email'),
    getSiteSetting('returns_window_days'),
    getSiteSetting('returns_authorization_hours'),
    getSiteSetting('refund_processing_days_min'),
    getSiteSetting('refund_processing_days_max'),
    getSiteSetting('returns_vintage_exception_text'),
    getSiteSetting('returns_hero_subtitle'),
  ])
  const returnsEmail = coerceSiteString(returnsEmailRaw) || company.contact.email
  const returnWindowDays = coerceSiteNumber(windowDaysRaw)
  const authHours = coerceSiteNumber(authHoursRaw)
  const refundMin = coerceSiteNumber(refundMinRaw)
  const refundMax = coerceSiteNumber(refundMaxRaw)
  const vintageNote = coerceSiteString(vintageNoteRaw)
  const heroSubtitle = coerceSiteString(subtitleRaw) || 'Our return policy'

  const refundRange =
    refundMin != null && refundMax != null
      ? `${refundMin}–${refundMax} business days`
      : refundMin != null
        ? `${refundMin}+ business days`
        : refundMax != null
          ? `up to ${refundMax} business days`
          : null

  return (
    <div className="min-h-screen bg-vintage-background">
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">Returns & Exchanges</h1>
          <p className="text-lg text-green-100">{heroSubtitle}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-narrow">
          <div className="card p-8 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-vintage-primary/10 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-vintage-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text">
                  {returnWindowDays != null ? `${returnWindowDays}-Day Return Policy` : 'Return Policy'}
                </h2>
                <p className="text-text-muted">Shop with confidence</p>
              </div>
            </div>
            <p className="text-text-light">
              {returnWindowDays != null ? (
                <>
                  We want you to love your purchase. If you&apos;re not completely satisfied, you can return most items
                  within {returnWindowDays} days of delivery for a full refund or exchange, subject to the eligibility
                  rules below.
                </>
              ) : (
                <>
                  Return eligibility and time windows are set by {company.name}. Please contact us for details specific
                  to your order.
                </>
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-text">Eligible for Return</h3>
              </div>
              <ul className="text-sm text-text-light space-y-2">
                <li>Items in original condition</li>
                <li>Unworn/unused items with tags</li>
                <li>Items that don&apos;t match description</li>
                <li>Damaged items (report promptly with photos)</li>
              </ul>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-vintage-accent" />
                <h3 className="font-semibold text-text">Not Eligible</h3>
              </div>
              <ul className="text-sm text-text-light space-y-2">
                <li>Items worn or used</li>
                <li>Items without original tags (where applicable)</li>
                <li>Items damaged by customer</li>
                <li>Sale items marked &quot;Final Sale&quot;</li>
                {returnWindowDays != null ? <li>Items returned after {returnWindowDays} days</li> : null}
              </ul>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold font-playfair text-text">How to Return</h2>

            <ol className="text-text-light">
              <li>
                <strong>Contact Us:</strong>{' '}
                {returnsEmail ? (
                  <>
                    Email us at{' '}
                    <a href={`mailto:${returnsEmail}`} className="text-vintage-primary">
                      {returnsEmail}
                    </a>{' '}
                    with your order number and reason for return.
                  </>
                ) : (
                  <>Use our Contact page with your order number and reason for return.</>
                )}
              </li>
              <li>
                <strong>Get Approval:</strong> We&apos;ll review your request
                {authHours != null ? (
                  <> and aim to send a return authorization within {authHours} hours.</>
                ) : (
                  <> and send return instructions if your return is approved.</>
                )}
              </li>
              <li>
                <strong>Ship It Back:</strong> Pack the item securely and ship it to the return address we provide.
                Keep your tracking number.
              </li>
              <li>
                <strong>Receive Refund:</strong> Once we receive and inspect the item, we&apos;ll process your refund
                {refundRange ? <> within {refundRange}</> : <> as soon as practicable</>}.
              </li>
            </ol>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Refund Information</h2>
            <p className="text-text-light">
              Refunds are issued to the original payment method when possible.
              {refundRange ? ` Please allow ${refundRange} for the refund to appear after we process it.` : null}
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Exchanges</h2>
            <p className="text-text-light">
              Want a different size or variant? Contact us to arrange an exchange. We&apos;ll confirm availability
              before you ship the original item back.
            </p>
          </div>

          {vintageNote ? (
            <div className="mt-8 p-6 bg-modern-accent/10 rounded-lg border border-modern-accent/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-modern-accent-dark flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text mb-1">Vintage & unique items</h3>
                  <p className="text-sm text-text-light">{vintageNote}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold text-text mb-2">Need help with a return?</h3>
            <p className="text-text-muted mb-4">Our team is here to make the process easy.</p>
            <a href="/contact" className="btn btn-primary">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
