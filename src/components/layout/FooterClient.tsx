'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react'
import { companyMonogram, type Company } from '@/lib/company-shared'
import SafeImage from '@/components/media/SafeImage'
import ThemeToggle from '@/components/theme/ThemeToggle'

interface FooterClientProps {
  company: Company
  menuItems: Array<{ title: string; href: string }>
}

export default function FooterClient({ company, menuItems }: FooterClientProps) {
  const monogram = companyMonogram(company.name)
  const { contact, social } = company

  return (
    <footer className="bg-primary text-[rgb(var(--color-text-inverse))]">
      <div className="container-wide">
        {/* Main footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <SafeImage
                src={company.logoUrl}
                alt=""
                kind="logo"
                monogram={monogram}
                enforceAspect
                className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0"
              />
              <span className="font-bold font-heading text-lg">{company.name}</span>
            </div>
            <p className="opacity-90 mb-4">{company.description}</p>
            <div className="flex space-x-4">
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:text-accent transition"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:text-accent transition"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:text-accent transition"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold font-heading text-lg mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  All Products
                </Link>
              </li>
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="opacity-90 hover:opacity-100 hover:text-accent transition"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold font-heading text-lg mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/shipping" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  Returns &amp; Exchanges
                </Link>
              </li>
              <li>
                <Link href="/faq" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="opacity-90 hover:opacity-100 hover:text-accent transition">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold font-heading text-lg mb-4">Contact</h3>
            <div className="space-y-3">
              {contact.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 opacity-80 mt-0.5" />
                  <span className="opacity-90 text-sm">{contact.address}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 opacity-80" />
                  <span className="opacity-90">{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 opacity-80" />
                  <span className="opacity-90">{contact.email}</span>
                </div>
              )}
            </div>
            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-2">Secure Payments</h4>
              <p className="opacity-80 text-sm">
                {company.paymentProviderDisplayName
                  ? `Payments processed with ${company.paymentProviderDisplayName}`
                  : 'Secure checkout via your configured payment provider'}
              </p>
            </div>
          </div>
        </div>

        {/* Theme row */}
        <div className="py-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] opacity-70 mr-3">Theme</span>
            <ThemeToggle variant="full" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="opacity-80 text-sm">
              © {new Date().getFullYear()} {company.name}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="opacity-80 hover:opacity-100 hover:text-accent text-sm transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="opacity-80 hover:opacity-100 hover:text-accent text-sm transition">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
