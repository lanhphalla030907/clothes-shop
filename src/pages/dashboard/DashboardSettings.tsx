import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { Panel, Section } from '@/components/dashboard/Panel'
import { Badge, StatGrid } from '@/components/dashboard/Badge'
import { Button, FormField, SelectField, Switch } from '@/components/dashboard/Controls'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Reveal } from '@/components/ui/Reveal'
import { defaultSettings, formatDayLong, team, TODAY } from '@/data/dashboard'
import type { StoreSettings } from '@/data/dashboard'
import { formatPrice } from '@/lib/format'

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'team', label: 'Team' },
] as const

export default function DashboardSettings() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
  const [dirty, setDirty] = useState(false)

  /** Every control funnels through here so "unsaved" can never drift from state. */
  const patch = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
  }

  const revert = () => {
    setSettings(defaultSettings)
    setDirty(false)
  }

  const tiles = [
    { label: 'Free shipping over', value: formatPrice(settings.freeShippingThreshold) },
    { label: 'Flat rate', value: formatPrice(settings.flatShippingRate) },
    { label: 'Low stock alert', value: `${settings.lowStockThreshold} units` },
    { label: 'Team seats', value: `${team.filter((member) => member.active).length} active` },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <PageHeader
          kicker="Configuration"
          title="Settings"
          lede="Store defaults. Changes live in this browser tab only — reload to start over."
          actions={
            <>
              <Button variant="secondary" onClick={revert}>
                Revert
              </Button>
              <Button variant="primary" onClick={() => setDirty(false)}>
                {dirty ? 'Save changes' : 'Saved'}
              </Button>
            </>
          }
          facts={[
            { label: 'Store', value: settings.storeName },
            { label: 'Currency', value: settings.currency },
            { label: 'Snapshot', value: formatDayLong(TODAY) },
          ]}
        />
      </Reveal>

      <Reveal>
        <StatGrid metrics={tiles} />
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
        {/* Section index. Hidden on mobile — the page is short enough to scroll. */}
        <nav
          aria-label="Settings sections"
          className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash">Sections</p>
          <ul className="mt-4 flex flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block border-b border-line-soft py-2.5 text-[13px] text-graphite transition-colors duration-200 hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-8">
          <div id="general">
            <Section title="Store details" meta="Shown on invoices and in customer emails">
              <Panel>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    label="Store name"
                    value={settings.storeName}
                    onChange={(value) => patch('storeName', value)}
                  />
                  <FormField
                    label="Contact email"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(value) => patch('contactEmail', value)}
                  />
                  <FormField
                    label="Reply-to email"
                    type="email"
                    value={settings.replyEmail}
                    onChange={(value) => patch('replyEmail', value)}
                    hint="Where order replies are routed."
                  />
                  <FormField
                    label="Phone"
                    type="tel"
                    mono
                    value={settings.phone}
                    onChange={(value) => patch('phone', value)}
                  />
                  <FormField
                    label="Registered address"
                    value={settings.address}
                    onChange={(value) => patch('address', value)}
                  />
                  <SelectField
                    label="Currency"
                    value={settings.currency}
                    options={['USD', 'EUR', 'GBP', 'JPY'] as const}
                    onChange={(value) => patch('currency', value)}
                  />
                  <SelectField
                    label="Timezone"
                    value={settings.timezone}
                    options={[
                      'America/New_York',
                      'Europe/London',
                      'Europe/Paris',
                      'Asia/Tokyo',
                    ] as const}
                    onChange={(value) => patch('timezone', value)}
                  />
                  <SelectField
                    label="Weight unit"
                    value={settings.weightUnit}
                    options={['g', 'kg', 'oz', 'lb'] as const}
                    onChange={(value) => patch('weightUnit', value)}
                  />
                </div>
              </Panel>
            </Section>
          </div>

          <div id="checkout">
            <Section title="Checkout" meta="What a customer sees before paying">
              <Panel>
                <Switch
                  label="Guest checkout"
                  description="Let people buy without creating an account."
                  checked={settings.guestCheckout}
                  onChange={(value) => patch('guestCheckout', value)}
                />
                <Switch
                  label="Require a shipping address"
                  description="Turn this off only if everything is digital."
                  checked={settings.requireAddress}
                  onChange={(value) => patch('requireAddress', value)}
                />
                <Switch
                  label="Prices include tax"
                  description="Show tax inside the item price rather than adding it at the end."
                  checked={settings.taxInclusive}
                  onChange={(value) => patch('taxInclusive', value)}
                />
              </Panel>
            </Section>
          </div>

          <div id="shipping">
            <Section title="Shipping" meta="Flat-rate domestic">
              <Panel>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    label="Free shipping threshold"
                    type="number"
                    mono
                    suffix={settings.currency}
                    value={String(settings.freeShippingThreshold)}
                    onChange={(value) => patch('freeShippingThreshold', Number(value) || 0)}
                    hint="Order value at which shipping is free."
                  />
                  <FormField
                    label="Flat shipping rate"
                    type="number"
                    mono
                    suffix={settings.currency}
                    value={String(settings.flatShippingRate)}
                    onChange={(value) => patch('flatShippingRate', Number(value) || 0)}
                  />
                </div>
                <p className="mt-6 border-t border-line-soft pt-4 text-[13px] leading-relaxed text-graphite">
                  A {formatPrice(settings.freeShippingThreshold)} order ships free. Below that,{' '}
                  {formatPrice(settings.flatShippingRate)} is added at checkout. International
                  shipping is quoted separately and is not configured here.
                </p>
              </Panel>
            </Section>
          </div>

          <div id="inventory">
            <Section title="Inventory" meta="Reorder behaviour">
              <Panel>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    label="Low stock threshold"
                    type="number"
                    mono
                    suffix="units"
                    value={String(settings.lowStockThreshold)}
                    onChange={(value) => patch('lowStockThreshold', Number(value) || 0)}
                    hint="At or below this, a style is flagged on the overview."
                  />
                </div>
                <Switch
                  label="Auto-fulfil paid orders"
                  description="Send fulfilment tasks out as soon as payment clears."
                  checked={settings.autoFulfil}
                  onChange={(value) => patch('autoFulfil', value)}
                />
              </Panel>
            </Section>
          </div>

          <div id="notifications">
            <Section title="Notifications" meta="Where the alerts go">
              <Panel>
                <Switch
                  label="New order"
                  checked={settings.notifyNewOrder}
                  onChange={(value) => patch('notifyNewOrder', value)}
                />
                <Switch
                  label="Low stock"
                  description="Fires the moment a style crosses the threshold above."
                  checked={settings.notifyLowStock}
                  onChange={(value) => patch('notifyLowStock', value)}
                />
                <Switch
                  label="Failed payment"
                  checked={settings.notifyFailedPayment}
                  onChange={(value) => patch('notifyFailedPayment', value)}
                  divided={false}
                />
              </Panel>
            </Section>
          </div>

          <div id="team">
            <Section
              title="Team"
              meta={`${team.filter((member) => member.active).length} of ${team.length} seats active`}
              action={
                <Button variant="secondary">
                  <UserPlus size={14} strokeWidth={1.6} />
                  Invite
                </Button>
              }
            >
              <Panel flush>
                <ul className="divide-y divide-line-soft">
                  {team.map((member) => (
                    <li
                      key={member.email}
                      className="flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-bone/50"
                    >
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center bg-ink font-mono text-[11px] text-paper"
                      >
                        {member.name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{member.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-graphite">
                          {member.email}
                        </span>
                      </span>
                      <Badge tone="muted">{member.role}</Badge>
                      <Badge tone={member.active ? 'strong' : 'muted'} dot={member.active}>
                        {member.active ? 'Active' : 'Invited'}
                      </Badge>
                      <button
                        type="button"
                        aria-label={`Remove ${member.name}`}
                        className="grid size-11 shrink-0 place-items-center text-ash transition-colors duration-200 hover:bg-signal-soft hover:text-signal"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </Section>
          </div>

          <p className="text-xs leading-relaxed text-ash">
            Static prototype — there is no backend, so nothing here persists past a reload.
          </p>
        </div>
      </div>
    </div>
  )
}