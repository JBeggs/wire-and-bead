import { serverNewsApi } from '@/lib/api-server'
import ContactForm from './ContactForm'

async function getContactData() {
  try {
    const settingsData: any = await serverNewsApi.siteSettings.list()
    const settingsArray = Array.isArray(settingsData) ? settingsData : (settingsData?.results || [])
    const settingsMap: Record<string, any> = {}
    settingsArray.forEach((setting: any) => {
      try {
        settingsMap[setting.key] = setting.type === 'json'
          ? JSON.parse(setting.value)
          : setting.value
      } catch {
        settingsMap[setting.key] = setting.value
      }
    })
    const businessHours = (typeof settingsMap.business_hours === 'object' && settingsMap.business_hours)
      ? settingsMap.business_hours
      : {}
    const hoursFormatted: Record<string, string> = {}
    for (const [day, val] of Object.entries(businessHours)) {
      if (typeof val === 'string') hoursFormatted[day] = val
      else if (val && typeof val === 'object' && !Array.isArray(val)) {
        const o = val as { open?: string; close?: string; closed?: boolean }
        if (o.closed) hoursFormatted[day] = 'Closed'
        else if (o.open && o.close) hoursFormatted[day] = `${o.open} - ${o.close}`
        else hoursFormatted[day] = ''
      }
    }
    return {
      contact: {
        email: settingsMap.contact_email || '',
        phone: settingsMap.contact_phone || '',
        address: settingsMap.contact_address || '',
      },
      businessHours: hoursFormatted,
    }
  } catch (error) {
    console.error('Error fetching contact data:', error)
    return {
      contact: { email: '', phone: '', address: '' },
      businessHours: {},
    }
  }
}

export default async function ContactPage() {
  const { contact, businessHours } = await getContactData()

  return (
    <div className="min-h-screen bg-vintage-background">
      <section className="py-12 bg-vintage-primary text-white">
        <div className="container-wide">
          <h1 className="text-3xl md:text-4xl font-bold font-playfair mb-2">Contact Us</h1>
          <p className="text-lg text-green-100">We&apos;d love to hear from you</p>
        </div>
      </section>
      <section className="py-12">
        <div className="container-wide">
          <ContactForm contact={contact} businessHours={businessHours} />
        </div>
      </section>
    </div>
  )
}
