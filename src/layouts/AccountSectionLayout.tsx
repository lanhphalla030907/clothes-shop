import { Outlet } from 'react-router-dom'
import { AccountSectionNav } from '@/components/account/AccountSectionNav'

/**
 * The customer account area, hosted inside the public storefront.
 *
 * The storefront navbar, footer and mobile bottom navigation stay in place — the
 * account pages are a section of the shop rather than a separate application —
 * so this shell only contributes the account rail and the content column. Each
 * page keeps its own `PageHeader`, which is the single `h1` for the document.
 */
export function AccountSectionLayout() {
  return (
    <div className="container-editorial pt-24 pb-28 sm:pt-28 lg:pb-20 xl:pt-32">
      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-12">
        <AccountSectionNav />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}