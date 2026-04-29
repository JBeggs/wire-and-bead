import { redirect } from 'next/navigation'

/** Placeholder until first-login wizard ships; business details live under /profile → Business Profile. */
export default function AdminSetupPage() {
  redirect('/profile')
}
