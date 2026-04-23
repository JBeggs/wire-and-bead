import { getCompany } from '@/lib/company'
import FooterClient from './FooterClient'

const MENU_ITEMS = [
  { title: 'Products', href: '/products' },
  { title: 'Articles', href: '/articles' },
  { title: 'About', href: '/about' },
]

export async function Footer() {
  const company = await getCompany()
  return <FooterClient company={company} menuItems={MENU_ITEMS} />
}
