'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

interface ContactFormProps {
  contact: { email: string; phone: string; address: string }
  businessHours: Record<string, string>
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export default function ContactForm({ contact, businessHours }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const { showSuccess } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    showSuccess('Thank you for your message! We\'ll get back to you soon.')
    setFormData({ name: '', email: '', subject: '', message: '' })
    setLoading(false)
  }

  const formatAddress = (addr: string) => {
    if (!addr) return null
    return addr.split(',').map((line) => line.trim()).filter(Boolean)
  }

  const addrLines = formatAddress(contact.address)

  return (
    <div className="grid lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1">
        <h2 className="text-xl font-semibold font-playfair text-text mb-6">Get in Touch</h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-vintage-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-vintage-primary" />
            </div>
            <div>
              <h3 className="font-medium text-text">Email</h3>
              <p className="text-text-muted">{contact.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-vintage-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-vintage-primary" />
            </div>
            <div>
              <h3 className="font-medium text-text">Phone</h3>
              <p className="text-text-muted">{contact.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-vintage-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-vintage-primary" />
            </div>
            <div>
              <h3 className="font-medium text-text">Address</h3>
              <p className="text-text-muted">
                {addrLines && addrLines.length > 0 ? (
                  <>
                    {addrLines.map((line, i) => (
                      <span key={i}>{line}{i < addrLines.length - 1 ? <br /> : null}</span>
                    ))}
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 p-6 bg-vintage-background rounded-lg border border-vintage-primary/20">
          <h3 className="font-semibold text-text mb-2">Business Hours</h3>
          <div className="text-sm text-text-muted space-y-1">
            {Object.keys(businessHours).length > 0 ? (
              Object.entries(businessHours).map(([day, time]) => (
                <p key={day}>{DAY_LABELS[day] || day}: {time || '—'}</p>
              ))
            ) : (
              <p className="text-text">Business hours are not published yet. Please reach out using the contact details above.</p>
            )}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="card p-8">
          <h2 className="text-xl font-semibold font-playfair text-text mb-6">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="form-label">Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="form-label">Subject</label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div>
              <label htmlFor="message" className="form-label">Message</label>
              <textarea
                id="message"
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="form-input resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary py-3 px-8"
            >
              {loading ? 'Sending...' : 'Send Message'}
              {!loading && <Send className="w-4 h-4 ml-2" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
