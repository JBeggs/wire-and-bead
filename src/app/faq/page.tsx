import { ChevronDown, ChevronUp } from 'lucide-react'
import { getCompany } from '@/lib/company'

function buildFaqs(companyName: string) {
  return [
  {
    question: 'What is the condition of vintage items?',
    answer: 'All vintage items are carefully inspected and honestly described. We use a grading system: "Like New" (minimal wear), "Good" (light wear, fully functional), "Fair" (visible wear but functional), and "Vintage" (shows age but has character). Each listing includes detailed photos and condition notes.'
  },
  {
    question: 'How do I know if a vintage item is authentic?',
    answer: 'We research and verify the authenticity of all vintage items. Our descriptions include information about the era, maker (when known), and any identifying marks. If you have questions about a specific item, please contact us before purchasing.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through our secure Yoco payment gateway. This includes Visa, Mastercard, and American Express. All transactions are encrypted and secure.'
  },
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping within South Africa takes 3-5 business days. Express shipping (1-2 business days) is available for an additional fee. You\'ll receive a tracking number once your order ships.'
  },
  {
    question: 'Can I return an item?',
    answer: 'Yes! We offer a 14-day return policy for items in their original condition. Vintage items can be returned if they don\'t match the description. Please see our Returns page for full details.'
  },
  {
    question: 'Do you ship internationally?',
    answer: 'Currently, we only ship within South Africa. We\'re working on expanding our shipping options. Sign up for our newsletter to be notified when international shipping becomes available.'
  },
  {
    question: 'How do I care for vintage items?',
    answer: 'Care instructions vary by item type. Generally, vintage items should be handled gently and stored properly. We include care tips with each vintage purchase. Feel free to contact us for specific advice.'
  },
  {
    question: `Can I sell my vintage items through ${companyName}?`,
    answer: 'We\'re always looking for quality vintage pieces! If you have items you\'d like to sell, please contact us with photos and descriptions. We\'ll review them and get back to you within 48 hours.'
  },
  ]
}

export default async function FAQPage() {
  const company = await getCompany()
  const faqs = buildFaqs(company.name)
  return (
    <div className="min-h-screen bg-vintage-background">
      {/* Header */}
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-green-100">
            Find answers to common questions about shopping with us
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-12">
        <div className="container-narrow">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="card group">
                <summary className="p-6 cursor-pointer list-none flex items-center justify-between">
                  <h3 className="font-semibold text-text pr-4">{faq.question}</h3>
                  <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0 group-open:hidden" />
                  <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0 hidden group-open:block" />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-text-light">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center p-8 bg-white rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold font-playfair text-text mb-2">
              Still have questions?
            </h2>
            <p className="text-text-muted mb-4">
              We&apos;re here to help! Reach out to our friendly team.
            </p>
            <a href="/contact" className="btn btn-primary">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
