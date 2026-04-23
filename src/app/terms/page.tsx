import { getCompany } from '@/lib/company'
import { getSiteSetting, coerceSiteString } from '@/lib/site-settings'
import { resolveLocale } from '@/lib/locale'

function formatPolicyDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function TermsPage() {
  const company = await getCompany()
  const locale = resolveLocale(company)
  const [legalRaw, termsDateRaw, pricingDisc, paymentLabelRaw, vintageNote] = await Promise.all([
    getSiteSetting('legal_email'),
    getSiteSetting('terms_last_updated'),
    getSiteSetting('pricing_disclaimer'),
    getSiteSetting('payment_provider_display_name'),
    getSiteSetting('terms_vintage_note'),
  ])
  const legalEmail = coerceSiteString(legalRaw) || company.contact.email
  const termsUpdated = coerceSiteString(termsDateRaw)
  const pricingDisclaimer = coerceSiteString(pricingDisc)
  const paymentLabel = coerceSiteString(paymentLabelRaw) || 'our payment provider'
  const vintage = coerceSiteString(vintageNote)

  return (
    <div className="min-h-screen bg-vintage-background">
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">Terms of Service</h1>
          {termsUpdated ? (
            <p className="text-lg text-green-100">Last updated: {formatPolicyDate(termsUpdated, locale)}</p>
          ) : null}
        </div>
      </section>

      <section className="py-12">
        <div className="container-narrow">
          <div className="prose prose-lg max-w-none">
            <p className="text-text-light">
              Welcome to {company.name}. By using our website and services, you agree to these terms. Please read them
              carefully.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">1. Acceptance of Terms</h2>
            <p className="text-text-light">
              By accessing or using our website, you agree to be bound by these Terms of Service and our Privacy Policy.
              If you do not agree, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">2. Products and Pricing</h2>
            <p className="text-text-light">
              Prices are shown in {company.currency}
              {pricingDisclaimer ? `. ${pricingDisclaimer}` : '.'} We reserve the right to change prices at any time.
              Prices are confirmed at checkout.
            </p>
            {vintage ? (
              <p className="text-text-light">{vintage}</p>
            ) : null}

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">3. Orders and Payment</h2>
            <p className="text-text-light">
              By placing an order, you are making an offer to purchase. We reserve the right to refuse or cancel orders
              for any reason, including pricing errors or stock issues.
            </p>
            <p className="text-text-light">
              Payment is processed securely through {paymentLabel}. We do not store your full payment credentials on
              this site.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">4. Shipping and Delivery</h2>
            <p className="text-text-light">
              Delivery times are estimates and not guaranteed. We are not responsible for delays caused by shipping
              carriers or circumstances beyond our control.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">5. Returns and Refunds</h2>
            <p className="text-text-light">
              Please refer to our Returns Policy for detailed information about returns, exchanges, and refunds.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">6. Intellectual Property</h2>
            <p className="text-text-light">
              All content on this website, including text, images, and logos, is owned by {company.name} and protected
              by copyright laws. You may not use our content without permission.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">7. User Accounts</h2>
            <p className="text-text-light">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities under your account.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">8. Limitation of Liability</h2>
            <p className="text-text-light">
              To the maximum extent permitted by law, {company.name} shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of our services.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">9. Changes to Terms</h2>
            <p className="text-text-light">
              We may update these terms from time to time. Continued use of our services after changes constitutes
              acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">10. Governing Law</h2>
            <p className="text-text-light">
              These terms are governed by the laws of South Africa. Any disputes shall be resolved in the courts of
              South Africa.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Contact</h2>
            <p className="text-text-light">
              For questions about these terms, please contact us
              {legalEmail ? (
                <>
                  {' '}
                  at{' '}
                  <a className="text-vintage-primary" href={`mailto:${legalEmail}`}>
                    {legalEmail}
                  </a>
                  .
                </>
              ) : (
                <> via our Contact page.</>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
