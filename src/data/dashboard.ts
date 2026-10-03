import type { ProductCategory } from '@/types'

/* -------------------------------------------------------------------------
 * Static admin data.
 *
 * Everything the dashboard renders is hard-coded here — there is no API, no
 * store and no persistence. This module is the single place to edit when you
 * want to change what the admin sees, and it is deliberately shaped like a real
 * response layer (typed records, ISO dates, absolute money values) so swapping
 * these literals for fetches later is a one-file change.
 * ---------------------------------------------------------------------- */

/* ---------------------------------- dates ------------------------------- */

/** The dashboard's "today". Frozen so the mock never drifts between renders. */
export const TODAY = '2026-10-01'

export const formatDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

export const formatDayLong = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/* --------------------------------- money -------------------------------- */

export interface Metric {
  label: string
  value: number
  /** How the value should be rendered in a tile. */
  format: 'currency' | 'percent' | 'number'
  /** Percentage change against the preceding period. */
  delta: number
  /** Direction the change is *good*, which is not always the sign of the delta. */
  favourable: boolean
  footnote: string
  /** Fourteen-point trend drawn as the tile's sparkline. */
  spark: number[]
}

/* --------------------------------- revenue ------------------------------ */

export interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

/** Last 30 days, oldest first. */
export const revenueSeries: RevenuePoint[] = [
  { date: '2026-09-02', revenue: 2140, orders: 6 },
  { date: '2026-09-03', revenue: 1780, orders: 5 },
  { date: '2026-09-04', revenue: 2960, orders: 8 },
  { date: '2026-09-05', revenue: 3210, orders: 9 },
  { date: '2026-09-06', revenue: 4480, orders: 12 },
  { date: '2026-09-07', revenue: 5120, orders: 14 },
  { date: '2026-09-08', revenue: 3860, orders: 10 },
  { date: '2026-09-09', revenue: 2640, orders: 7 },
  { date: '2026-09-10', revenue: 2310, orders: 6 },
  { date: '2026-09-11', revenue: 3020, orders: 8 },
  { date: '2026-09-12', revenue: 3470, orders: 9 },
  { date: '2026-09-13', revenue: 5280, orders: 15 },
  { date: '2026-09-14', revenue: 4940, orders: 13 },
  { date: '2026-09-15', revenue: 3610, orders: 10 },
  { date: '2026-09-16', revenue: 2890, orders: 8 },
  { date: '2026-09-17', revenue: 2450, orders: 7 },
  { date: '2026-09-18', revenue: 3980, orders: 11 },
  { date: '2026-09-19', revenue: 4360, orders: 12 },
  { date: '2026-09-20', revenue: 3820, orders: 10 },
  { date: '2026-09-21', revenue: 2940, orders: 8 },
  { date: '2026-09-22', revenue: 3260, orders: 9 },
  { date: '2026-09-23', revenue: 5640, orders: 16 },
  { date: '2026-09-24', revenue: 6180, orders: 17 },
  { date: '2026-09-25', revenue: 4720, orders: 13 },
  { date: '2026-09-26', revenue: 3540, orders: 9 },
  { date: '2026-09-27', revenue: 2980, orders: 8 },
  { date: '2026-09-28', revenue: 4120, orders: 11 },
  { date: '2026-09-29', revenue: 5460, orders: 15 },
  { date: '2026-09-30', revenue: 6890, orders: 19 },
  { date: '2026-10-01', revenue: 7340, orders: 21 },
]

/** Same window, one week earlier — drives the comparison delta on the chart. */
export const revenueSeriesPrevious: RevenuePoint[] = [
  { date: '2026-08-26', revenue: 1980, orders: 5 },
  { date: '2026-08-27', revenue: 1640, orders: 4 },
  { date: '2026-08-28', revenue: 2210, orders: 6 },
  { date: '2026-08-29', revenue: 2480, orders: 7 },
  { date: '2026-08-30', revenue: 3120, orders: 8 },
  { date: '2026-08-31', revenue: 3760, orders: 10 },
  { date: '2026-09-01', revenue: 2940, orders: 8 },
  { date: '2026-09-02', revenue: 2010, orders: 5 },
  { date: '2026-09-03', revenue: 1880, orders: 5 },
  { date: '2026-09-04', revenue: 2420, orders: 6 },
  { date: '2026-09-05', revenue: 2810, orders: 7 },
  { date: '2026-09-06', revenue: 3960, orders: 11 },
  { date: '2026-09-07', revenue: 4220, orders: 12 },
  { date: '2026-09-08', revenue: 3080, orders: 8 },
  { date: '2026-09-09', revenue: 2340, orders: 6 },
  { date: '2026-09-10', revenue: 2080, orders: 5 },
  { date: '2026-09-11', revenue: 2760, orders: 7 },
  { date: '2026-09-12', revenue: 3140, orders: 8 },
  { date: '2026-09-13', revenue: 4280, orders: 12 },
  { date: '2026-09-14', revenue: 3960, orders: 11 },
  { date: '2026-09-15', revenue: 2640, orders: 7 },
  { date: '2026-09-16', revenue: 2180, orders: 6 },
  { date: '2026-09-17', revenue: 2440, orders: 6 },
  { date: '2026-09-18', revenue: 3260, orders: 9 },
  { date: '2026-09-19', revenue: 3480, orders: 9 },
  { date: '2026-09-20', revenue: 2870, orders: 7 },
  { date: '2026-09-21', revenue: 2540, orders: 6 },
  { date: '2026-09-22', revenue: 3120, orders: 8 },
  { date: '2026-09-23', revenue: 4480, orders: 12 },
  { date: '2026-09-24', revenue: 4620, orders: 13 },
  { date: '2026-09-25', revenue: 3380, orders: 9 },
  { date: '2026-09-26', revenue: 2620, orders: 7 },
  { date: '2026-09-27', revenue: 2960, orders: 8 },
]

export const channels: { label: string; share: number; sessions: number }[] = [
  { label: 'Direct', share: 42, sessions: 18420 },
  { label: 'Organic search', share: 27, sessions: 11850 },
  { label: 'Instagram', share: 18, sessions: 7890 },
  { label: 'Referral', share: 8, sessions: 3510 },
  { label: 'Email', share: 5, sessions: 2190 },
]

/* ---------------------------------- orders ------------------------------ */

export type OrderStatus = 'Paid' | 'Processing' | 'Shipped' | 'Delivered' | 'Refunded' | 'Failed'
export type FulfilmentState = 'Fulfilled' | 'In stock' | 'Low stock' | 'Out of stock' | 'Pre-order'

export interface DashboardOrder {
  id: string
  customer: string
  email: string
  items: number
  total: number
  status: OrderStatus
  fulfilment: FulfilmentState
  channel: 'Online' | 'Retail' | 'Instagram'
  region: string
  date: string
}

export const orders: DashboardOrder[] = [
  {
    id: 'CTRL-4182',
    customer: 'Alex Mercer',
    email: 'alex.mercer@studio.co',
    items: 3,
    total: 1076,
    status: 'Processing',
    fulfilment: 'In stock',
    channel: 'Online',
    region: 'New York, US',
    date: '2026-10-01',
  },
  {
    id: 'CTRL-4181',
    customer: 'Noor Haddad',
    email: 'noor.haddad@mail.com',
    items: 1,
    total: 640,
    status: 'Paid',
    fulfilment: 'In stock',
    channel: 'Instagram',
    region: 'Beirut, LB',
    date: '2026-10-01',
  },
  {
    id: 'CTRL-4180',
    customer: 'Iris Vandermeer',
    email: 'iris.v@post.nl',
    items: 2,
    total: 812,
    status: 'Shipped',
    fulfilment: 'Fulfilled',
    channel: 'Online',
    region: 'Amsterdam, NL',
    date: '2026-09-30',
  },
  {
    id: 'CTRL-4179',
    customer: 'Jonah Reyes',
    email: 'jreyes@atelier.mx',
    items: 4,
    total: 1484,
    status: 'Delivered',
    fulfilment: 'Fulfilled',
    channel: 'Online',
    region: 'Mexico City, MX',
    date: '2026-09-30',
  },
  {
    id: 'CTRL-4178',
    customer: 'Marta Kowalski',
    email: 'm.kowalski@gmx.de',
    items: 1,
    total: 248,
    status: 'Refunded',
    fulfilment: 'In stock',
    channel: 'Retail',
    region: 'Berlin, DE',
    date: '2026-09-29',
  },
  {
    id: 'CTRL-4177',
    customer: 'Dane Okafor',
    email: 'dane@okaf.co',
    items: 2,
    total: 596,
    status: 'Processing',
    fulfilment: 'Low stock',
    channel: 'Online',
    region: 'London, UK',
    date: '2026-09-29',
  },
  {
    id: 'CTRL-4176',
    customer: 'Elena Rossi',
    email: 'elena.rossi@posta.it',
    items: 1,
    total: 198,
    status: 'Failed',
    fulfilment: 'In stock',
    channel: 'Online',
    region: 'Milan, IT',
    date: '2026-09-28',
  },
  {
    id: 'CTRL-4175',
    customer: 'Theo Lindqvist',
    email: 't.lindqvist@posteo.se',
    items: 3,
    total: 1096,
    status: 'Delivered',
    fulfilment: 'Fulfilled',
    channel: 'Online',
    region: 'Stockholm, SE',
    date: '2026-09-28',
  },
  {
    id: 'CTRL-4174',
    customer: 'Priya Raman',
    email: 'priya@raman.in',
    items: 2,
    total: 704,
    status: 'Shipped',
    fulfilment: 'Fulfilled',
    channel: 'Instagram',
    region: 'Bengaluru, IN',
    date: '2026-09-27',
  },
  {
    id: 'CTRL-4173',
    customer: 'Sam Whitfield',
    email: 'sam@whitfield.co',
    items: 1,
    total: 148,
    status: 'Delivered',
    fulfilment: 'In stock',
    channel: 'Online',
    region: 'Austin, US',
    date: '2026-09-27',
  },
  {
    id: 'CTRL-4172',
    customer: 'Yuki Tanabe',
    email: 'y.tanabe@mail.jp',
    items: 2,
    total: 524,
    status: 'Paid',
    fulfilment: 'Pre-order',
    channel: 'Online',
    region: 'Osaka, JP',
    date: '2026-09-26',
  },
  {
    id: 'CTRL-4171',
    customer: 'Amara Diallo',
    email: 'amara.diallo@sn.com',
    items: 3,
    total: 1332,
    status: 'Delivered',
    fulfilment: 'Fulfilled',
    channel: 'Retail',
    region: 'Dakar, SN',
    date: '2026-09-26',
  },
  {
    id: 'CTRL-4170',
    customer: 'Luca Ferraro',
    email: 'l.ferraro@posta.it',
    items: 1,
    total: 420,
    status: 'Shipped',
    fulfilment: 'Fulfilled',
    channel: 'Online',
    region: 'Turin, IT',
    date: '2026-09-25',
  },
  {
    id: 'CTRL-4169',
    customer: 'Ines Ferreira',
    email: 'ines.f@mail.pt',
    items: 2,
    total: 486,
    status: 'Delivered',
    fulfilment: 'In stock',
    channel: 'Instagram',
    region: 'Lisbon, PT',
    date: '2026-09-25',
  },
]

export const orderStatuses: OrderStatus[] = [
  'Paid',
  'Processing',
  'Shipped',
  'Delivered',
  'Refunded',
  'Failed',
]

/* ---------------------------------- tones -------------------------------- */

/** Badge tone per order state. Filled ink is reserved for the finished state. */
export const orderStatusTone = {
  Paid: 'outline',
  Processing: 'muted',
  Shipped: 'outline',
  Delivered: 'strong',
  Refunded: 'signal',
  Failed: 'signal',
} as const satisfies Record<OrderStatus, 'neutral' | 'outline' | 'strong' | 'muted' | 'signal'>

export const fulfilmentTone = {
  Fulfilled: 'strong',
  'In stock': 'outline',
  'Low stock': 'signal',
  'Out of stock': 'signal',
  'Pre-order': 'muted',
} as const satisfies Record<FulfilmentState, 'neutral' | 'outline' | 'strong' | 'muted' | 'signal'>

export const segmentTone = {
  VIP: 'strong',
  Returning: 'outline',
  New: 'neutral',
  'At risk': 'signal',
} as const satisfies Record<Customer['segment'], 'neutral' | 'outline' | 'strong' | 'muted' | 'signal'>

export const orderSummary = {
  awaitingFulfilment: 9,
  awaitingPayment: 3,
  returnsOpen: 2,
  averageOrderValue: 612,
}

/* --------------------------------- products ----------------------------- */

export interface InventoryRow {
  id: string
  name: string
  category: ProductCategory
  price: number
  onHand: number
  reserved: number
  /** Units moved in the last 30 days. */
  sold: number
  state: FulfilmentState
  image: string
}

export const inventory: InventoryRow[] = [
  {
    id: 'ctrl-wide-denim',
    name: 'CTRL Wide Denim',
    category: 'Bottoms',
    price: 198,
    onHand: 142,
    reserved: 18,
    sold: 96,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/1235692/pexels-photo-1235692.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-double-breasted-blazer',
    name: 'CTRL Double Breasted Blazer',
    category: 'Outerwear',
    price: 640,
    onHand: 24,
    reserved: 11,
    sold: 41,
    state: 'Low stock',
    image: 'https://images.pexels.com/photos/35564328/pexels-photo-35564328.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-merino-crew',
    name: 'CTRL Merino Crew',
    category: 'Tops',
    price: 248,
    onHand: 0,
    reserved: 0,
    sold: 138,
    state: 'Out of stock',
    image: 'https://images.pexels.com/photos/35564328/pexels-photo-35564328.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-oversized-shirt',
    name: 'CTRL Oversized Shirt',
    category: 'Tops',
    price: 196,
    onHand: 86,
    reserved: 9,
    sold: 112,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/1082528/pexels-photo-1082528.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-pleated-trouser',
    name: 'CTRL Pleated Trouser',
    category: 'Bottoms',
    price: 264,
    onHand: 58,
    reserved: 6,
    sold: 74,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/1082526/pexels-photo-1082526.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-cropped-bomber',
    name: 'CTRL Cropped Bomber',
    category: 'Outerwear',
    price: 520,
    onHand: 12,
    reserved: 8,
    sold: 33,
    state: 'Low stock',
    image: 'https://images.pexels.com/photos/6764954/pexels-photo-6764954.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-cashmere-tee',
    name: 'CTRL Cashmere Tee',
    category: 'Tops',
    price: 148,
    onHand: 210,
    reserved: 24,
    sold: 184,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/31280402/pexels-photo-31280402.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-leather-belt',
    name: 'CTRL Leather Belt',
    category: 'Accessories',
    price: 120,
    onHand: 164,
    reserved: 12,
    sold: 121,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/20428090/pexels-photo-20428090.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-studio-cap',
    name: 'CTRL Studio Cap',
    category: 'Accessories',
    price: 64,
    onHand: 41,
    reserved: 4,
    sold: 89,
    state: 'In stock',
    image: 'https://images.pexels.com/photos/16390576/pexels-photo-16390576.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
  {
    id: 'ctrl-wool-overcoat',
    name: 'CTRL Wool Overcoat',
    category: 'Outerwear',
    price: 780,
    onHand: 0,
    reserved: 6,
    sold: 27,
    state: 'Pre-order',
    image: 'https://images.pexels.com/photos/1235692/pexels-photo-1235692.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=240',
  },
]

/* -------------------------------- customers ----------------------------- */

export interface Customer {
  id: string
  name: string
  email: string
  region: string
  orders: number
  spend: number
  /** Days since the last order. */
  lastOrderDays: number
  segment: 'Returning' | 'New' | 'At risk' | 'VIP'
}

export const customers: Customer[] = [
  {
    id: 'CUS-1041',
    name: 'Noor Haddad',
    email: 'noor.haddad@mail.com',
    region: 'Beirut, LB',
    orders: 9,
    spend: 4286,
    lastOrderDays: 0,
    segment: 'VIP',
  },
  {
    id: 'CUS-1040',
    name: 'Jonah Reyes',
    email: 'jreyes@atelier.mx',
    region: 'Mexico City, MX',
    orders: 7,
    spend: 3104,
    lastOrderDays: 1,
    segment: 'Returning',
  },
  {
    id: 'CUS-1039',
    name: 'Amara Diallo',
    email: 'amara.diallo@sn.com',
    region: 'Dakar, SN',
    orders: 12,
    spend: 5890,
    lastOrderDays: 5,
    segment: 'VIP',
  },
  {
    id: 'CUS-1038',
    name: 'Theo Lindqvist',
    email: 't.lindqvist@posteo.se',
    region: 'Stockholm, SE',
    orders: 4,
    spend: 1596,
    lastOrderDays: 3,
    segment: 'Returning',
  },
  {
    id: 'CUS-1037',
    name: 'Priya Raman',
    email: 'priya@raman.in',
    region: 'Bengaluru, IN',
    orders: 3,
    spend: 1108,
    lastOrderDays: 4,
    segment: 'Returning',
  },
  {
    id: 'CUS-1036',
    name: 'Iris Vandermeer',
    email: 'iris.v@post.nl',
    region: 'Amsterdam, NL',
    orders: 2,
    spend: 812,
    lastOrderDays: 1,
    segment: 'New',
  },
  {
    id: 'CUS-1035',
    name: 'Dane Okafor',
    email: 'dane@okaf.co',
    region: 'London, UK',
    orders: 6,
    spend: 2418,
    lastOrderDays: 2,
    segment: 'Returning',
  },
  {
    id: 'CUS-1034',
    name: 'Yuki Tanabe',
    email: 'y.tanabe@mail.jp',
    region: 'Osaka, JP',
    orders: 1,
    spend: 524,
    lastOrderDays: 5,
    segment: 'New',
  },
  {
    id: 'CUS-1033',
    name: 'Sam Whitfield',
    email: 'sam@whitfield.co',
    region: 'Austin, US',
    orders: 2,
    spend: 346,
    lastOrderDays: 4,
    segment: 'At risk',
  },
  {
    id: 'CUS-1032',
    name: 'Luca Ferraro',
    email: 'l.ferraro@posta.it',
    region: 'Turin, IT',
    orders: 5,
    spend: 1922,
    lastOrderDays: 6,
    segment: 'Returning',
  },
]

export const customerSummary = {
  total: 1284,
  newThisMonth: 96,
  returningRate: 0.38,
  lifetimeValue: 612,
}

/** Top markets by customer count and lifetime spend. */
export const regions: { country: string; customers: number; revenue: number }[] = [
  { country: 'United States', customers: 412, revenue: 96840 },
  { country: 'United Kingdom', customers: 188, revenue: 44120 },
  { country: 'Germany', customers: 146, revenue: 34260 },
  { country: 'Japan', customers: 121, revenue: 28400 },
  { country: 'Netherlands', customers: 88, revenue: 20660 },
  { country: 'Mexico', customers: 74, revenue: 17380 },
]

/** Cohort shape — new versus returning accounts over eight months. */
export const cohort: { month: string; newCustomers: number; returning: number }[] = [
  { month: 'Mar', newCustomers: 52, returning: 38 },
  { month: 'Apr', newCustomers: 61, returning: 44 },
  { month: 'May', newCustomers: 48, returning: 51 },
  { month: 'Jun', newCustomers: 96, returning: 58 },
  { month: 'Jul', newCustomers: 78, returning: 63 },
  { month: 'Aug', newCustomers: 84, returning: 71 },
  { month: 'Sep', newCustomers: 72, returning: 79 },
  { month: 'Oct', newCustomers: 96, returning: 88 },
]

/* ------------------------------- top sellers ---------------------------- */

export interface TopProduct {
  rank: number
  name: string
  category: ProductCategory
  units: number
  revenue: number
  share: number
}

export const topProducts: TopProduct[] = [
  {
    rank: 1,
    name: 'CTRL Cashmere Tee',
    category: 'Tops',
    units: 184,
    revenue: 27232,
    share: 100,
  },
  {
    rank: 2,
    name: 'CTRL Oversized Shirt',
    category: 'Tops',
    units: 112,
    revenue: 21952,
    share: 81,
  },
  {
    rank: 3,
    name: 'CTRL Leather Belt',
    category: 'Accessories',
    units: 121,
    revenue: 14520,
    share: 66,
  },
  {
    rank: 4,
    name: 'CTRL Wide Denim',
    category: 'Bottoms',
    units: 96,
    revenue: 19008,
    share: 61,
  },
  {
    rank: 5,
    name: 'CTRL Merino Crew',
    category: 'Tops',
    units: 138,
    revenue: 34224,
    share: 58,
  },
  {
    rank: 6,
    name: 'CTRL Double Breasted Blazer',
    category: 'Outerwear',
    units: 41,
    revenue: 26240,
    share: 34,
  },
]

/* -------------------------------- activity ----------------------------- */

export type ActivityKind = 'order' | 'stock' | 'customer' | 'refund' | 'release'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  at: string
}

export const activity: ActivityItem[] = [
  {
    id: 'ACT-1',
    kind: 'order',
    title: 'Order CTRL-4182 placed',
    detail: 'Alex Mercer — 3 items, $1,076',
    at: '4 min ago',
  },
  {
    id: 'ACT-2',
    kind: 'stock',
    title: 'CTRL Merino Crew sold out',
    detail: 'Size M / Ink — last unit allocated',
    at: '38 min ago',
  },
  {
    id: 'ACT-3',
    kind: 'customer',
    title: 'New customer registered',
    detail: 'Iris Vandermeer — Amsterdam, NL',
    at: '1 hr ago',
  },
  {
    id: 'ACT-4',
    kind: 'refund',
    title: 'Refund issued',
    detail: 'CTRL-4178 — Marta Kowalski, $248',
    at: '2 hrs ago',
  },
  {
    id: 'ACT-5',
    kind: 'order',
    title: 'Order CTRL-4180 dispatched',
    detail: 'Iris Vandermeer — DHL Express',
    at: '3 hrs ago',
  },
  {
    id: 'ACT-6',
    kind: 'release',
    title: 'Release 02 scheduled',
    detail: 'Goes live 15 October 2026, 09:00 UTC',
    at: 'Yesterday',
  },
]

/* --------------------------------- metrics ------------------------------ */

const revenueMetric: Metric = {
  label: 'Gross revenue',
  value: 118460,
  format: 'currency',
  delta: 18.4,
  favourable: true,
  footnote: 'vs. $100,040 last period',
  spark: [98, 104, 96, 112, 108, 121, 118, 132, 128, 141, 136, 152, 148, 163],
}

const ordersMetric: Metric = {
  label: 'Orders',
  value: 312,
  format: 'number',
  delta: 9.7,
  favourable: true,
  footnote: 'vs. 284 last period',
  spark: [18, 21, 19, 24, 22, 26, 23, 28, 25, 31, 27, 33, 29, 36],
}

const aovMetric: Metric = {
  label: 'Average order value',
  value: 380,
  format: 'currency',
  delta: 4.1,
  favourable: true,
  footnote: 'vs. $352 last period',
  spark: [344, 351, 348, 356, 349, 361, 358, 366, 362, 371, 368, 376, 373, 380],
}

const returnRateMetric: Metric = {
  label: 'Return rate',
  value: 4.6,
  format: 'percent',
  delta: 1.3,
  favourable: false,
  footnote: 'vs. 3.9% last period',
  spark: [3.6, 3.9, 3.7, 4.0, 3.8, 4.1, 3.9, 4.2, 4.0, 4.4, 4.1, 4.5, 4.2, 4.6],
}

export const kpis: Metric[] = [revenueMetric, ordersMetric, aovMetric, returnRateMetric]

/** Called out again on the overview with its own trend line. */
export const aov = aovMetric

const currency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

/** Pre-rendered tiles, so the value formatting lives next to the numbers. */
export const kpiTiles = kpis.map((metric) => ({
  label: metric.label,
  value:
    metric.format === 'currency'
      ? currency(metric.value)
      : metric.format === 'percent'
        ? `${metric.value}%`
        : metric.value.toLocaleString('en-US'),
  delta: metric.delta,
  favourable: metric.favourable,
  footnote: metric.footnote,
  spark: metric.spark,
  sparkTone: metric.favourable ? ('ink' as const) : ('signal' as const),
}))

/* -------------------------------- settings ----------------------------- */

export interface StoreSettings {
  storeName: string
  contactEmail: string
  replyEmail: string
  phone: string
  address: string
  currency: string
  timezone: string
  weightUnit: 'g' | 'kg' | 'oz' | 'lb'
  freeShippingThreshold: number
  flatShippingRate: number
  lowStockThreshold: number
  autoFulfil: boolean
  notifyLowStock: boolean
  notifyNewOrder: boolean
  notifyFailedPayment: boolean
  requireAddress: boolean
  guestCheckout: boolean
  taxInclusive: boolean
}

export const defaultSettings: StoreSettings = {
  storeName: 'CTRL',
  contactEmail: 'studio@ctrl.example',
  replyEmail: 'orders@ctrl.example',
  phone: '+1 212 555 0148',
  address: '18 Rivington Street, New York, NY 10002',
  currency: 'USD',
  timezone: 'America/New_York',
  weightUnit: 'kg',
  freeShippingThreshold: 500,
  flatShippingRate: 24,
  lowStockThreshold: 24,
  autoFulfil: true,
  notifyLowStock: true,
  notifyNewOrder: true,
  notifyFailedPayment: false,
  requireAddress: true,
  guestCheckout: true,
  taxInclusive: false,
}

export const team = [
  { name: 'Alex Mercer', email: 'alex@ctrl.example', role: 'Owner', active: true },
  { name: 'Rhian Osei', email: 'rhian@ctrl.example', role: 'Merchandising', active: true },
  { name: 'Tomas Brandt', email: 'tomas@ctrl.example', role: 'Fulfilment', active: true },
  { name: 'Mina Farouk', email: 'mina@ctrl.example', role: 'Support', active: false },
]
