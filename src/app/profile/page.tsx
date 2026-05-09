'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ecommerceApi, newsApi } from '@/lib/api'
import { Order, IntegrationSettings, IntegrationSettingsUpdatePayload } from '@/lib/types'
import { useToast } from '@/contexts/ToastContext'
import { Package, User, Calendar, MapPin, ChevronRight, Loader2, Save, Building2, Clock, Settings, CreditCard, Truck, Eye, EyeOff, UserCircle, ShoppingBag, Globe, Zap } from 'lucide-react'
import Link from 'next/link'

const MASK_PREFIX = '•'

const PROVINCES = [
  { value: 'EC', label: 'Eastern Cape' },
  { value: 'FS', label: 'Free State' },
  { value: 'GP', label: 'Gauteng' },
  { value: 'KZN', label: 'KwaZulu-Natal' },
  { value: 'LP', label: 'Limpopo' },
  { value: 'MP', label: 'Mpumalanga' },
  { value: 'NC', label: 'Northern Cape' },
  { value: 'NW', label: 'North West' },
  { value: 'WC', label: 'Western Cape' },
]

// Map country name (from API) to ISO code (backend expects 2-char)
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'South Africa': 'ZA',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Australia': 'AU',
  'Canada': 'CA',
  'Germany': 'DE',
  'France': 'FR',
  'Netherlands': 'NL',
  'Namibia': 'NA',
  'Botswana': 'BW',
  'Zimbabwe': 'ZW',
  'Mozambique': 'MZ',
  'Lesotho': 'LS',
  'Eswatini': 'SZ',
}

function parseFullName(full: string): { first: string; last: string } {
  const parts = (full || '').trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export default function ProfilePage() {
  const { user, profile, companyId, refreshProfile, loading: authLoading } = useAuth()
  const isBusinessOwner = profile?.role === 'business_owner' && !!companyId
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [company, setCompany] = useState<Record<string, any> | null>(null)
  const [companyForm, setCompanyForm] = useState({
    logo: '',
    name: '',
    email: '',
    phone: '',
    website: '',
    address_street: '',
    address_city: '',
    address_province: '',
    address_postal_code: '',
    address_country: 'ZA',
    description: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    google_analytics_id: '',
    facebook_pixel_id: '',
    legal_name: '',
    registration_number: '',
    tax_number: '',
    business_hours: {} as Record<string, string>,
  })
  const [updatingCompany, setUpdatingCompany] = useState(false)
  const [siteSettings, setSiteSettings] = useState<Record<string, { id: string; value: string; type: string }>>({})
  const [siteSettingsValues, setSiteSettingsValues] = useState<Record<string, string>>({})
  const [updatingSiteSettings, setUpdatingSiteSettings] = useState(false)
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings | null>(null)
  const [integrationForm, setIntegrationForm] = useState<IntegrationSettingsUpdatePayload & Record<string, unknown>>({})
  const [updatingIntegration, setUpdatingIntegration] = useState(false)
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({})
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    ecommerceApi.countries.list().then((res: any) => {
      const list = res?.data ?? (Array.isArray(res) ? res : [])
      setCountries((list as any[]).filter((c: any) => c?.name).map((c: any) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    avatar_url: '',
    social_links: { twitter: '', linkedin: '', instagram: '', website: '' } as Record<string, string>,
    preferences: { newsletter: false, order_updates: false } as Record<string, boolean>,
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  type TabId = 'personal' | 'orders' | 'business' | 'site' | 'integrations'
  const [activeTab, setActiveTab] = useState<TabId>('personal')

  const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'personal' as TabId, label: 'Personal', icon: <UserCircle className="w-4 h-4" />, show: true },
    { id: 'orders' as TabId, label: 'Orders', icon: <ShoppingBag className="w-4 h-4" />, show: !isBusinessOwner },
    { id: 'business' as TabId, label: 'Business Profile', icon: <Building2 className="w-4 h-4" />, show: isBusinessOwner },
    { id: 'site' as TabId, label: 'Site Settings', icon: <Globe className="w-4 h-4" />, show: isBusinessOwner },
    { id: 'integrations' as TabId, label: 'Integrations', icon: <Zap className="w-4 h-4" />, show: isBusinessOwner },
  ].filter((t) => t.show)

  useEffect(() => {
    if (activeTab === 'orders' && isBusinessOwner) {
      setActiveTab('personal')
    }
  }, [isBusinessOwner, activeTab])

  useEffect(() => {
    if (user && !profile) {
      refreshProfile()
    }
  }, [user, profile, refreshProfile])

  useEffect(() => {
    if (user) {
      const fullName = profile?.full_name || (user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`.trim()
        : user?.first_name || user?.last_name || '')
      const { first, last } = parseFullName(fullName)
      const social = profile?.social_links || {}
      const prefs = profile?.preferences || {}
      setFormData({
        email: ((profile as any)?.email ?? user?.email ?? '') as string,
        first_name: (profile as any)?.first_name || first,
        last_name: (profile as any)?.last_name || last,
        phone: (profile as any)?.phone || '',
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || '',
        social_links: {
          twitter: social.twitter || '',
          linkedin: social.linkedin || '',
          instagram: social.instagram || '',
          website: social.website || '',
        },
        preferences: {
          newsletter: !!prefs.newsletter,
          order_updates: !!prefs.order_updates,
        },
      })
      fetchOrders()
    }
  }, [profile, user])

  useEffect(() => {
    if (isBusinessOwner) {
      ecommerceApi.integrationSettings.getMe()
        .then((res: any) => {
          const data = res?.data ?? res
          if (data?.id) {
            setIntegrationSettings(data)
            setIntegrationForm({
              yoco_public_key: data.yoco_public_key ?? '',
              yoco_secret_key: data.yoco_secret_key ?? '',
              yoco_webhook_secret: data.yoco_webhook_secret ?? '',
              yoco_sandbox_mode: data.yoco_sandbox_mode ?? false,
              courier_guy_api_key: data.courier_guy_api_key ?? '',
              courier_guy_api_secret: data.courier_guy_api_secret ?? '',
              courier_guy_account_number: data.courier_guy_account_number ?? '',
              courier_guy_sandbox_mode: data.courier_guy_sandbox_mode ?? false,
            })
          }
        })
        .catch(() => {})
    }
  }, [isBusinessOwner])

  useEffect(() => {
    if (companyId) {
      newsApi.siteSettings.list().then((data: any) => {
        const arr = Array.isArray(data) ? data : (data?.results || [])
        const byKey: Record<string, { id: string; value: string; type: string }> = {}
        const vals: Record<string, string> = {}
        arr.forEach((s: any) => {
          byKey[s.key] = { id: s.id, value: s.value ?? '', type: s.type || 'string' }
          vals[s.key] = s.value ?? ''
        })
        setSiteSettings(byKey)
        setSiteSettingsValues(vals)
      }).catch(() => {})
    }
  }, [companyId])

  useEffect(() => {
    if (companyId) {
      ecommerceApi.companies.get(companyId).then((c: any) => {
        setCompany(c)
        setCompanyForm({
          logo: c?.logo?.file_url || c?.logo_url || '',
          name: c?.name || '',
          email: c?.email || '',
          phone: c?.phone || '',
          website: c?.website || '',
          address_street: c?.address_street || '',
          address_city: c?.address_city || '',
          address_province: c?.address_province || '',
          address_postal_code: c?.address_postal_code || '',
          address_country: c?.address_country || 'ZA',
          description: c?.description || '',
          seo_title: c?.seo_title || '',
          seo_description: c?.seo_description || '',
          seo_keywords: c?.seo_keywords || '',
          google_analytics_id: c?.google_analytics_id || '',
          facebook_pixel_id: c?.facebook_pixel_id || '',
          legal_name: c?.legal_name || '',
          registration_number: c?.registration_number || '',
          tax_number: c?.tax_number || '',
          business_hours: (() => {
            const h = c?.business_hours
            if (!h || typeof h !== 'object') return {}
            const out: Record<string, string> = {}
            for (const [day, val] of Object.entries(h)) {
              if (typeof val === 'string') out[day] = val
              else if (val && typeof val === 'object' && !Array.isArray(val)) {
                const o = val as { open?: string; close?: string; closed?: boolean }
                if (o.closed) out[day] = 'Closed'
                else if (o.open && o.close) out[day] = `${o.open} - ${o.close}`
                else out[day] = ''
              } else out[day] = ''
            }
            return out
          })(),
        })
      }).catch(() => {})
    }
  }, [companyId])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response: any = await ecommerceApi.orders.myOrders()
      const orderData = response?.data ?? (Array.isArray(response) ? response : [])
      setOrders(orderData)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ')
      await newsApi.profile.patch({
        full_name: fullName || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        avatar_url: formData.avatar_url || undefined,
        social_links: formData.social_links,
        preferences: formData.preferences,
      })
      await refreshProfile()
      showSuccess('Profile updated successfully')
    } catch (error: any) {
      showError(error.message || 'Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setUpdatingCompany(true)
    try {
      const updated = await ecommerceApi.companies.update(companyId, {
        name: companyForm.name.trim(),
        email: companyForm.email.trim(),
        phone: companyForm.phone || '',
        website: companyForm.website || '',
        address_street: companyForm.address_street || '',
        address_city: companyForm.address_city || '',
        address_province: companyForm.address_province || '',
        address_postal_code: companyForm.address_postal_code || '',
        address_country: companyForm.address_country || 'ZA',
        description: companyForm.description || '',
        seo_title: companyForm.seo_title || undefined,
        seo_description: companyForm.seo_description || undefined,
        seo_keywords: companyForm.seo_keywords || undefined,
        google_analytics_id: companyForm.google_analytics_id || undefined,
        facebook_pixel_id: companyForm.facebook_pixel_id || undefined,
        legal_name: companyForm.legal_name || '',
        registration_number: companyForm.registration_number || '',
        tax_number: companyForm.tax_number || '',
        business_hours: (() => {
          const parsed: Record<string, any> = {}
          for (const [day, timeString] of Object.entries(companyForm.business_hours || {})) {
            if (!timeString || timeString.toLowerCase() === 'closed') parsed[day] = { closed: true }
            else if (timeString.includes(' - ')) {
              const [open, close] = timeString.split(' - ')
              parsed[day] = { open: open.trim(), close: close.trim() }
            } else parsed[day] = timeString
          }
          return parsed
        })(),
      })
      const data = (updated as any)?.data ?? updated
      setCompany(data)
      if (data && typeof (data as any).name === 'string') {
        setCompanyForm((f) => ({ ...f, name: (data as any).name }))
      }
      showSuccess('Business profile updated')
    } catch (error: any) {
      showError(error.message || 'Failed to update business profile')
    } finally {
      setUpdatingCompany(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select an image file')
      return
    }
    setUploadingAvatar(true)
    try {
      const uploaded: any = await newsApi.media.upload(file, { media_type: 'image' })
      const url = uploaded?.file_url
      if (url) {
        const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ')
        setFormData((f) => ({ ...f, avatar_url: url }))
        await newsApi.profile.patch({
          full_name: fullName || undefined,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          email: formData.email.trim(),
          phone: formData.phone || undefined,
          bio: formData.bio || undefined,
          avatar_url: url,
          social_links: formData.social_links,
          preferences: formData.preferences,
        })
        await refreshProfile()
        showSuccess('Profile picture updated')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to upload profile picture')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const handleUpdateIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!integrationSettings?.id) return
    setUpdatingIntegration(true)
    try {
      const payload: Record<string, unknown> = { ...integrationForm }
      if (typeof payload.yoco_secret_key === 'string' && payload.yoco_secret_key.startsWith(MASK_PREFIX)) delete payload.yoco_secret_key
      if (typeof payload.yoco_webhook_secret === 'string' && payload.yoco_webhook_secret.startsWith(MASK_PREFIX)) delete payload.yoco_webhook_secret
      if (typeof payload.courier_guy_api_secret === 'string' && payload.courier_guy_api_secret.startsWith(MASK_PREFIX)) delete payload.courier_guy_api_secret
      await ecommerceApi.integrationSettings.update(integrationSettings.id, payload)
      const res: any = await ecommerceApi.integrationSettings.getMe()
      const data = res?.data ?? res
      if (data?.id) {
        setIntegrationSettings(data)
        setIntegrationForm({
          yoco_public_key: data.yoco_public_key ?? '',
          yoco_secret_key: data.yoco_secret_key ?? '',
          yoco_webhook_secret: data.yoco_webhook_secret ?? '',
          yoco_sandbox_mode: data.yoco_sandbox_mode ?? false,
          courier_guy_api_key: data.courier_guy_api_key ?? '',
          courier_guy_api_secret: data.courier_guy_api_secret ?? '',
          courier_guy_account_number: data.courier_guy_account_number ?? '',
          courier_guy_sandbox_mode: data.courier_guy_sandbox_mode ?? false,
        })
      }
      showSuccess('Integration settings saved')
    } catch (error: any) {
      showError(error.message || 'Failed to save integration settings')
    } finally {
      setUpdatingIntegration(false)
    }
  }

  const toggleSecretVisibility = (key: string) => {
    setSecretVisible((v) => ({ ...v, [key]: !v[key] }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select an image file')
      return
    }
    if (!companyId) return
    setUploadingLogo(true)
    try {
      const uploaded: any = await newsApi.media.upload(file, { media_type: 'image' })
      const url = uploaded?.file_url
      const id = uploaded?.id
      if (id) {
        await ecommerceApi.companies.update(companyId, { logo_id: id })
        setCompanyForm((f) => ({ ...f, logo: url || '' }))
        setCompany((c) => (c ? { ...c, logo: url ? { id, file_url: url } : null, logo_url: url || '' } : null))
        showSuccess('Logo updated')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleLogoRemove = async () => {
    if (!companyId || !companyForm.logo) return
    if (
      !window.confirm(
        'Remove the company logo? Header and footer will show the gradient monogram instead.',
      )
    ) {
      return
    }
    setRemovingLogo(true)
    try {
      await ecommerceApi.companies.update(companyId, { logo_id: null })
      setCompanyForm((f) => ({ ...f, logo: '' }))
      setCompany((c) => (c ? { ...c, logo: null, logo_url: '' } : null))
      showSuccess('Logo removed')
    } catch (error: any) {
      showError(error.message || 'Failed to remove logo')
    } finally {
      setRemovingLogo(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-vintage-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-vintage-background flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md w-full space-y-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-text-muted" />
          </div>
          <h1 className="text-2xl font-bold font-playfair">Please Sign In</h1>
          <p className="text-text-muted">You need to be logged in to view your profile and orders.</p>
          <Link href="/login" className="btn btn-primary w-full py-3">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vintage-background py-12">
      <div className="container-wide">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <label className="relative cursor-pointer group">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-vintage-primary/10 flex items-center justify-center text-vintage-primary font-bold text-xl border-2 border-transparent group-hover:border-vintage-primary/50 transition-colors">
              {(formData.avatar_url || profile?.avatar_url) ? (
                <img src={formData.avatar_url || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                ([formData.first_name, formData.last_name].filter(Boolean).join(' ') || profile?.full_name || user.email).charAt(0).toUpperCase()
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </label>
          <div>
            <h1 className="text-xl font-bold text-text">
              {[formData.first_name, formData.last_name].filter(Boolean).join(' ') || profile?.full_name || user.email?.split('@')[0] || 'User'}
            </h1>
            <p className="text-sm text-text-muted">{formData.email || user.email}</p>
            <p className="text-xs text-text-muted mt-0.5">Click photo to upload</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-vintage-primary text-vintage-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {activeTab === 'personal' && (
            <div className="card p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="profile-form-grid">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="form-input"
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="form-input"
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Cellphone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="+27 82 123 4567"
                      required
                    />
                    <p className="text-xs text-text-muted">Required for delivery</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Account email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="you@example.com"
                      required
                    />
                    <p className="text-xs text-text-muted">Login and notifications — separate from storefront business email</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="form-input min-h-[100px] resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="profile-section-divider">
                  <h3 className="profile-section-subtitle">Social Links</h3>
                  <div className="profile-form-grid">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Twitter / X</label>
                      <input
                        type="url"
                        value={formData.social_links.twitter}
                        onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, twitter: e.target.value } })}
                        className="form-input"
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-muted">LinkedIn</label>
                      <input
                        type="url"
                        value={formData.social_links.linkedin}
                        onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, linkedin: e.target.value } })}
                        className="form-input"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Instagram</label>
                      <input
                        type="url"
                        value={formData.social_links.instagram}
                        onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, instagram: e.target.value } })}
                        className="form-input"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Website</label>
                      <input
                        type="url"
                        value={formData.social_links.website}
                        onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, website: e.target.value } })}
                        className="form-input"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
                <div className="profile-section-divider">
                  <h3 className="profile-section-subtitle">Preferences</h3>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferences.newsletter}
                        onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, newsletter: e.target.checked } })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-text">Newsletter – receive updates and offers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferences.order_updates}
                        onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, order_updates: e.target.checked } })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-text">Order updates – emails about order progress</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-3 text-sm text-text-light">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="card p-6">
              <h2 className="text-xl font-bold font-playfair text-text mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-vintage-primary" />
                Order History
              </h2>

              {loadingOrders ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-vintage-primary opacity-50" />
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/profile/orders/${order.id}`}
                      className="block border border-gray-100 rounded-xl p-4 hover:border-vintage-primary/30 transition-all group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-vintage-primary uppercase tracking-widest">Order #{order.order_number}</p>
                          <p className="text-sm text-text-muted">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase text-text-muted">Total</p>
                            <p className="font-bold text-text">R{Number(order.total).toFixed(2)}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-vintage-primary/10 text-vintage-primary'
                          }`}>
                            {order.status}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-vintage-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                    <Package className="w-8 h-8" />
                  </div>
                  <p className="text-text-muted">You haven&apos;t placed any orders yet.</p>
                  <Link href="/products" className="btn btn-secondary btn-sm">
                    Start Shopping
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'business' && isBusinessOwner && company && (
            <div className="card p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Profile
              </h3>
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Company Name</label>
                        <input
                          type="text"
                          value={companyForm.name}
                          onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                          className="form-input"
                          placeholder="Your store name"
                          required
                        />
                        <p className="text-xs text-text-muted">Shown in the website header, footer, browser metadata, and fallback logo monogram.</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Company Logo</label>
                        <div className="flex flex-wrap items-center gap-4">
                          {companyForm.logo && (
                            <img src={companyForm.logo} alt="Logo" className="w-16 h-16 rounded object-contain border border-gray-200" />
                          )}
                          <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
                            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo || removingLogo} />
                          </label>
                          {companyForm.logo && (
                            <button
                              type="button"
                              onClick={handleLogoRemove}
                              disabled={uploadingLogo || removingLogo}
                              className="text-sm text-text-muted hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              {removingLogo ? 'Removing…' : 'Remove logo'}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-1">Click to upload an image</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Contact email</label>
                        <input
                          type="email"
                          autoComplete="email"
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          className="form-input"
                          placeholder="hello@yourstore.com"
                          required
                        />
                        <p className="text-xs text-text-muted">Public storefront contact — separate from your account/login email</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Phone</label>
                        <input
                          type="tel"
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          className="form-input"
                          placeholder="+27 11 123 4567"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Website</label>
                        <input
                          type="url"
                          value={companyForm.website}
                          onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                          className="form-input"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-1"><MapPin className="w-3 h-3" />Address</label>
                        <textarea
                          value={companyForm.address_street}
                          onChange={(e) => setCompanyForm({ ...companyForm, address_street: e.target.value })}
                          className="form-input min-h-[60px] resize-none"
                          placeholder="Street address"
                        />
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <input
                            type="text"
                            value={companyForm.address_city}
                            onChange={(e) => setCompanyForm({ ...companyForm, address_city: e.target.value })}
                            className="form-input"
                            placeholder="City"
                          />
                          <select
                            value={companyForm.address_province}
                            onChange={(e) => setCompanyForm({ ...companyForm, address_province: e.target.value })}
                            className="form-input"
                          >
                            <option value="">Select province...</option>
                            {PROVINCES.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <input
                            type="text"
                            value={companyForm.address_postal_code}
                            onChange={(e) => setCompanyForm({ ...companyForm, address_postal_code: e.target.value })}
                            className="form-input"
                            placeholder="Postal code"
                          />
                          <select
                            value={companyForm.address_country}
                            onChange={(e) => setCompanyForm({ ...companyForm, address_country: e.target.value })}
                            className="form-input"
                          >
                            <option value="">Select country...</option>
                            {countries.map((c) => {
                              const iso = COUNTRY_NAME_TO_ISO[c.name] || c.name
                              return (
                                <option key={c.id} value={iso}>{c.name}</option>
                              )
                            })}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Description</label>
                        <textarea
                          value={companyForm.description}
                          onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                          className="form-input min-h-[60px] resize-none"
                          placeholder="About your business..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Legal name</label>
                        <input
                          type="text"
                          value={companyForm.legal_name}
                          onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                          className="form-input"
                          placeholder="Registered business name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Reg. number</label>
                          <input
                            type="text"
                            value={companyForm.registration_number}
                            onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })}
                            className="form-input"
                            placeholder="Registration no."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Tax number</label>
                          <input
                            type="text"
                            value={companyForm.tax_number}
                            onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })}
                            className="form-input"
                            placeholder="Tax/VAT no."
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" />Business Hours</label>
                        <p className="text-xs text-text-muted mb-2">e.g. 9am - 5pm or Closed</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-text-muted w-24 capitalize">{day}</span>
                              <input
                                type="text"
                                value={companyForm.business_hours?.[day] || ''}
                                onChange={(e) => setCompanyForm({
                                  ...companyForm,
                                  business_hours: { ...companyForm.business_hours, [day]: e.target.value },
                                })}
                                className="form-input flex-1"
                                placeholder="9am - 5pm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">SEO</h4>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">SEO Title</label>
                          <input
                            type="text"
                            value={companyForm.seo_title}
                            onChange={(e) => setCompanyForm({ ...companyForm, seo_title: e.target.value })}
                            className="form-input"
                            placeholder="Page title for search engines"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">SEO Description</label>
                          <textarea
                            value={companyForm.seo_description}
                            onChange={(e) => setCompanyForm({ ...companyForm, seo_description: e.target.value })}
                            className="form-input min-h-[60px] resize-none"
                            placeholder="Meta description for search results"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">SEO Keywords</label>
                          <input
                            type="text"
                            value={companyForm.seo_keywords}
                            onChange={(e) => setCompanyForm({ ...companyForm, seo_keywords: e.target.value })}
                            className="form-input"
                            placeholder="keyword1, keyword2, keyword3"
                          />
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">Analytics</h4>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Google Analytics ID</label>
                          <input
                            type="text"
                            value={companyForm.google_analytics_id}
                            onChange={(e) => setCompanyForm({ ...companyForm, google_analytics_id: e.target.value })}
                            className="form-input"
                            placeholder="G-XXXXXXXXXX"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Facebook Pixel ID</label>
                          <input
                            type="text"
                            value={companyForm.facebook_pixel_id}
                            onChange={(e) => setCompanyForm({ ...companyForm, facebook_pixel_id: e.target.value })}
                            className="form-input"
                            placeholder="Facebook Pixel ID"
                          />
                        </div>
                      </div>
              <button
                type="submit"
                disabled={updatingCompany}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                {updatingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Business Profile
              </button>
            </form>
            </div>
          )}

          {activeTab === 'site' && isBusinessOwner && (
            <div className="card p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Site Settings
              </h3>
              <p className="text-xs text-text-muted mb-4">Social links shown in footer. Contact info comes from Business Profile.</p>
              <form onSubmit={async (e) => {
                      e.preventDefault()
                      setUpdatingSiteSettings(true)
                      try {
                        const keys = ['social_facebook', 'social_twitter', 'social_instagram']
                        for (const key of keys) {
                          const val = siteSettingsValues[key] ?? ''
                          const existing = siteSettings[key]
                          if (existing) {
                            if (existing.value !== val) {
                              await newsApi.siteSettings.update(existing.id, { key, value: val, type: 'string', is_public: true })
                            }
                          } else if (val) {
                            await newsApi.siteSettings.create({ key, value: val, type: 'string', is_public: true })
                          }
                        }
                        const data: any = await newsApi.siteSettings.list()
                        const arr = Array.isArray(data) ? data : (data?.results || [])
                        const byKey: Record<string, { id: string; value: string; type: string }> = {}
                        const vals: Record<string, string> = {}
                        arr.forEach((s: any) => {
                          byKey[s.key] = { id: s.id, value: s.value ?? '', type: s.type || 'string' }
                          vals[s.key] = s.value ?? ''
                        })
                        setSiteSettings(byKey)
                        setSiteSettingsValues(vals)
                        showSuccess('Site settings updated')
                      } catch (err: any) {
                        showError(err?.message || 'Failed to update site settings')
                      } finally {
                        setUpdatingSiteSettings(false)
                      }
                    }} className="space-y-4">
                      {[
                        { key: 'social_facebook', label: 'Facebook URL' },
                        { key: 'social_twitter', label: 'Twitter/X URL' },
                        { key: 'social_instagram', label: 'Instagram URL' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</label>
                          <input
                            type="url"
                            value={siteSettingsValues[key] ?? ''}
                            onChange={(e) => setSiteSettingsValues((v) => ({ ...v, [key]: e.target.value }))}
                            className="form-input"
                            placeholder={`https://${key.replace('social_', '')}.com/...`}
                          />
                        </div>
                      ))}
                <button type="submit" disabled={updatingSiteSettings} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                  {updatingSiteSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Site Settings
                </button>
              </form>
            </div>
          )}

          {activeTab === 'integrations' && isBusinessOwner && (
            <div className="card p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Integration Settings
              </h3>
              <p className="text-xs text-text-muted mb-4">Configure Yoco payments and Courier Guy shipping.</p>
              <form onSubmit={handleUpdateIntegrationSettings} className="space-y-6">
                      <div className="profile-integration-section">
                        <h4 className="profile-section-subtitle flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Yoco Payment Gateway
                        </h4>
                        <div className="profile-form-grid space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Yoco Public Key</label>
                            <input
                              type="text"
                              value={String(integrationForm.yoco_public_key ?? '')}
                              onChange={(e) => setIntegrationForm({ ...integrationForm, yoco_public_key: e.target.value })}
                              className="form-input"
                              placeholder="pk_test_ or pk_live_"
                            />
                          </div>
                          <div className="space-y-1 profile-secret-field">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Yoco Secret Key</label>
                            <div className="profile-secret-input-wrap">
                              <input
                                type={secretVisible.yoco_secret_key ? 'text' : 'password'}
                                value={String(integrationForm.yoco_secret_key ?? '')}
                                onChange={(e) => setIntegrationForm({ ...integrationForm, yoco_secret_key: e.target.value })}
                                className="form-input profile-secret-input"
                                placeholder="sk_test_ or sk_live_"
                              />
                              <button type="button" className="profile-toggle-secret" onClick={() => toggleSecretVisibility('yoco_secret_key')}>
                                {secretVisible.yoco_secret_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {secretVisible.yoco_secret_key ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <p className="text-xs text-text-muted mt-1">Leave masked value unchanged if not updating.</p>
                          </div>
                          <div className="space-y-1 profile-secret-field">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Yoco Webhook Secret</label>
                            <div className="profile-secret-input-wrap">
                              <input
                                type={secretVisible.yoco_webhook_secret ? 'text' : 'password'}
                                value={String(integrationForm.yoco_webhook_secret ?? '')}
                                onChange={(e) => setIntegrationForm({ ...integrationForm, yoco_webhook_secret: e.target.value })}
                                className="form-input profile-secret-input"
                                placeholder="whsec_..."
                              />
                              <button type="button" className="profile-toggle-secret" onClick={() => toggleSecretVisibility('yoco_webhook_secret')}>
                                {secretVisible.yoco_webhook_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {secretVisible.yoco_webhook_secret ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!integrationForm.yoco_sandbox_mode}
                                onChange={(e) => setIntegrationForm({ ...integrationForm, yoco_sandbox_mode: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-text">Use Sandbox/Test Mode</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="profile-integration-section">
                        <h4 className="profile-section-subtitle flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Courier Guy Shipping
                        </h4>
                        <div className="profile-form-grid space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Courier Guy API Key</label>
                            <input
                              type="text"
                              value={String(integrationForm.courier_guy_api_key ?? '')}
                              onChange={(e) => setIntegrationForm({ ...integrationForm, courier_guy_api_key: e.target.value })}
                              className="form-input"
                              placeholder="API key"
                            />
                          </div>
                          <div className="space-y-1 profile-secret-field">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Courier Guy API Secret</label>
                            <div className="profile-secret-input-wrap">
                              <input
                                type={secretVisible.courier_guy_api_secret ? 'text' : 'password'}
                                value={String(integrationForm.courier_guy_api_secret ?? '')}
                                onChange={(e) => setIntegrationForm({ ...integrationForm, courier_guy_api_secret: e.target.value })}
                                className="form-input profile-secret-input"
                                placeholder="API secret"
                              />
                              <button type="button" className="profile-toggle-secret" onClick={() => toggleSecretVisibility('courier_guy_api_secret')}>
                                {secretVisible.courier_guy_api_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {secretVisible.courier_guy_api_secret ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <p className="text-xs text-text-muted mt-1">Leave masked value unchanged if not updating.</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Courier Guy Account Number</label>
                            <input
                              type="text"
                              value={String(integrationForm.courier_guy_account_number ?? '')}
                              onChange={(e) => setIntegrationForm({ ...integrationForm, courier_guy_account_number: e.target.value })}
                              className="form-input"
                              placeholder="Account number"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!integrationForm.courier_guy_sandbox_mode}
                                onChange={(e) => setIntegrationForm({ ...integrationForm, courier_guy_sandbox_mode: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <span className="text-sm text-text">Use Sandbox/Test Mode</span>
                            </label>
                          </div>
                        </div>
                      </div>
                <button
                  type="submit"
                  disabled={updatingIntegration}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {updatingIntegration ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Integration Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
