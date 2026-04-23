import { getCompany } from '@/lib/company'
import { getSiteSetting, coerceSiteString } from '@/lib/site-settings'
import { resolveLocale } from '@/lib/locale'

function formatPolicyDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function PrivacyPage() {
  const company = await getCompany()
  const locale = resolveLocale(company)
  const [privacyEmailRaw, privacyDateRaw, paymentLabelRaw] = await Promise.all([
    getSiteSetting('privacy_email'),
    getSiteSetting('privacy_last_updated'),
    getSiteSetting('payment_provider_display_name'),
  ])
  const privacyEmail = coerceSiteString(privacyEmailRaw) || company.contact.email
  const privacyUpdated = coerceSiteString(privacyDateRaw)
  const paymentLabel = coerceSiteString(paymentLabelRaw) || 'our payment provider'

  return (
    <div className="min-h-screen bg-vintage-background">
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">Privacy Policy</h1>
          {privacyUpdated ? (
            <p className="text-lg text-green-100">Last updated: {formatPolicyDate(privacyUpdated, locale)}</p>
          ) : null}
        </div>
      </section>

      <section className="py-12">
        <div className="container-narrow">
          <div className="prose prose-lg max-w-none">
            <p className="text-text-light">
              At {company.name}, we are committed to protecting your privacy. This policy explains how we collect, use,
              and safeguard your personal information.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Information We Collect</h2>
            <p className="text-text-light">We collect information you provide directly to us, including:</p>
            <ul className="text-text-light">
              <li>Name and contact information</li>
              <li>Billing and shipping addresses</li>
              <li>Payment information (processed securely by {paymentLabel})</li>
              <li>Order history and preferences</li>
              <li>Communications with our team</li>
            </ul>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">How We Use Your Information</h2>
            <p className="text-text-light">We use your information to:</p>
            <ul className="text-text-light">
              <li>Process and fulfill your orders</li>
              <li>Communicate about your orders and account</li>
              <li>Send promotional emails (with your consent)</li>
              <li>Improve our products and services</li>
              <li>Prevent fraud and ensure security</li>
            </ul>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Information Sharing</h2>
            <p className="text-text-light">We do not sell your personal information. We may share your information with:</p>
            <ul className="text-text-light">
              <li>Payment processors ({paymentLabel}) to complete transactions</li>
              <li>Shipping partners to deliver your orders</li>
              <li>Service providers who assist our operations</li>
              <li>Law enforcement when required by law</li>
            </ul>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Data Security</h2>
            <p className="text-text-light">
              We implement appropriate security measures to protect your personal information. Payment transactions are
              encrypted and handled by {paymentLabel}.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Your Rights</h2>
            <p className="text-text-light">You have the right to:</p>
            <ul className="text-text-light">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Cookies</h2>
            <p className="text-text-light">
              We use cookies to improve your browsing experience, analyze site traffic, and personalize content. You can
              control cookies through your browser settings.
            </p>

            <h2 className="text-2xl font-bold font-playfair text-text mt-8">Contact Us</h2>
            <p className="text-text-light">
              If you have questions about this privacy policy, please contact us
              {privacyEmail ? (
                <>
                  {' '}
                  at{' '}
                  <a className="text-vintage-primary" href={`mailto:${privacyEmail}`}>
                    {privacyEmail}
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
