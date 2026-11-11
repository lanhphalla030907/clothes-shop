import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextAreaField, TextField } from '@/components/account/Field'
import { Action } from '@/components/ui/Action'
import { displayName, useAuth } from '@/features/auth/useAuth'
import {
  collectMyCod,
  fetchMyAssignment,
  fetchMyAssignments,
  fetchMyCodCollections,
  fetchMyCodCollectionsSummary,
  updateMyAssignmentStatus,
} from '@/features/deliveryStaff/api'
import { isApiError, toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import { formatOrderAddressLines } from '@/types/api/orders'
import type {
  CodCollection,
  CodCollectionPage,
  CodCollectionsSummary,
  DeliveryAssignmentStatus,
  DeliveryStaffAssignment,
  DeliveryStaffAssignmentDetail,
} from '@/types/api'

const ASSIGNMENT_STATUSES: DeliveryAssignmentStatus[] = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'RETURNED',
]

const STATUS_TRANSITIONS: Record<DeliveryAssignmentStatus, DeliveryAssignmentStatus[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'FAILED_DELIVERY', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RETURNED'],
  RETURNED: [],
}

const ASSIGNMENT_LIMIT = 10
const COLLECTION_LIMIT = 10

const statusLabel = (status: DeliveryAssignmentStatus): string =>
  status.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())

const formatDate = (value: string | null): string =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))

const getApiError = (error: unknown): string => {
  if (isApiError(error) && error.kind === 'validation' && error.details.length > 0) {
    return error.details.join(' ')
  }
  return toUserMessage(error)
}

const statusBadgeConfig: Record<
  DeliveryAssignmentStatus,
  { bg: string; text: string; dot: string; border: string }
> = {
  PENDING_ASSIGNMENT: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-200/80',
  },
  ASSIGNED: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    border: 'border-blue-200/80',
  },
  OUT_FOR_DELIVERY: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200/80',
  },
  DELIVERED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200/80',
  },
  FAILED_DELIVERY: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    border: 'border-rose-200/80',
  },
  RETURNED: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-800',
    dot: 'bg-zinc-500',
    border: 'border-zinc-200',
  },
}

const PageControls = ({
  page,
  totalPages,
  onChange,
  label,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  label: string
}) => (
  <nav
    aria-label={label}
    className="flex items-center justify-between gap-3 border-t border-line/60 bg-paper px-4 py-3 sm:px-6"
  >
    <p className="text-xs font-mono text-graphite">
      Page <span className="font-semibold text-ink">{page}</span> of{' '}
      <span className="font-semibold text-ink">{Math.max(totalPages, 1)}</span>
    </p>
    <div className="flex gap-1.5">
      <button
        type="button"
        aria-label="Previous page"
        className="grid size-9 place-items-center rounded-lg border border-line bg-paper-pure text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:opacity-30"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next page"
        className="grid size-9 place-items-center rounded-lg border border-line bg-paper-pure text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:opacity-30"
        disabled={totalPages === 0 || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  </nav>
)

export default function DeliveryDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'deliveries' | 'history' | 'profile'>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [statusFilter, setStatusFilter] = useState<DeliveryAssignmentStatus | ''>('')
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [assignmentReload, setAssignmentReload] = useState(0)
  const [assignments, setAssignments] = useState<DeliveryStaffAssignment[]>([])
  const [assignmentTotal, setAssignmentTotal] = useState(0)
  const [assignmentTotalPages, setAssignmentTotalPages] = useState(0)
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)

  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryStaffAssignment | null>(null)
  const [assignmentDetail, setAssignmentDetail] = useState<DeliveryStaffAssignmentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailReload, setDetailReload] = useState(0)

  const [statusChoice, setStatusChoice] = useState<DeliveryAssignmentStatus | ''>('')
  const [statusNotes, setStatusNotes] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

  const [codAmount, setCodAmount] = useState('')
  const [codNotes, setCodNotes] = useState('')
  const [receiptProof, setReceiptProof] = useState<File | null>(null)
  const [codSaving, setCodSaving] = useState(false)
  const [codError, setCodError] = useState<string | null>(null)
  const [codSuccess, setCodSuccess] = useState<string | null>(null)

  const [collectionPage, setCollectionPage] = useState(1)
  const [collectionReload, setCollectionReload] = useState(0)
  const [collections, setCollections] = useState<CodCollection[]>([])
  const [collectionTotalPages, setCollectionTotalPages] = useState(0)
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CodCollectionsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const currentStatus = assignmentDetail?.status ?? selectedAssignment?.status
  const selectedAssignmentId = selectedAssignment?.id
  const availableTransitions = useMemo(
    () => (currentStatus ? STATUS_TRANSITIONS[currentStatus] : []),
    [currentStatus],
  )

  // Real API Statistics Calculations
  const pendingCount = useMemo(
    () => assignments.filter((a) => a.status === 'ASSIGNED' || a.status === 'PENDING_ASSIGNMENT').length,
    [assignments],
  )
  const inTransitCount = useMemo(
    () => assignments.filter((a) => a.status === 'OUT_FOR_DELIVERY').length,
    [assignments],
  )
  const deliveredCount = useMemo(
    () => assignments.filter((a) => a.status === 'DELIVERED').length,
    [assignments],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchMyAssignments(
      { status: statusFilter || undefined, page: assignmentPage, limit: ASSIGNMENT_LIMIT },
      controller.signal,
    ).then(
      (result) => {
        setAssignments(result.items)
        setAssignmentTotal(result.pagination.total)
        setAssignmentTotalPages(result.pagination.totalPages)
        setAssignmentsLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setAssignmentsError(getApiError(error))
        setAssignmentsLoading(false)
      },
    )
    return () => controller.abort()
  }, [statusFilter, assignmentPage, assignmentReload])

  useEffect(() => {
    const controller = new AbortController()
    fetchMyCodCollections(collectionPage, COLLECTION_LIMIT, controller.signal).then(
      (result: CodCollectionPage) => {
        setCollections(result.items)
        setCollectionTotalPages(result.pagination.totalPages)
        setCollectionsLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCollectionsError(getApiError(error))
        setCollectionsLoading(false)
      },
    )
    return () => controller.abort()
  }, [collectionPage, collectionReload])

  useEffect(() => {
    const controller = new AbortController()
    fetchMyCodCollectionsSummary(controller.signal).then(
      (result) => {
        setSummary(result)
        setSummaryLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSummaryError(getApiError(error))
        setSummaryLoading(false)
      },
    )
    return () => controller.abort()
  }, [collectionReload])

  useEffect(() => {
    if (selectedAssignmentId === undefined) return

    const controller = new AbortController()
    fetchMyAssignment(selectedAssignmentId, controller.signal).then(
      (detail) => {
        setAssignmentDetail(detail)
        setStatusChoice(STATUS_TRANSITIONS[detail.status][0] ?? '')
        setDetailLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setDetailError(getApiError(error))
        setDetailLoading(false)
      },
    )
    return () => controller.abort()
  }, [selectedAssignmentId, detailReload])

  const refreshAssignments = () => {
    setAssignmentsLoading(true)
    setAssignmentsError(null)
    setAssignmentReload((value) => value + 1)
  }

  const submitStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedAssignment || !statusChoice) return

    setStatusSaving(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await updateMyAssignmentStatus(
        selectedAssignment.id,
        statusChoice,
        statusNotes.trim() || undefined,
      )
      setSelectedAssignment((current) =>
        current ? { ...current, status: statusChoice } : current,
      )
      setStatusNotes('')
      setStatusSuccess(`Assignment updated to ${statusLabel(statusChoice)}.`)
      setAssignmentsLoading(true)
      setDetailLoading(true)
      setAssignmentReload((value) => value + 1)
      setDetailReload((value) => value + 1)
    } catch (error) {
      setStatusError(getApiError(error))
    } finally {
      setStatusSaving(false)
    }
  }

  const submitCodCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedAssignment) return
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(codAmount) || Number(codAmount) <= 0) {
      setCodError('Enter a positive amount with no more than two decimal places.')
      return
    }

    setCodSaving(true)
    setCodError(null)
    setCodSuccess(null)
    try {
      await collectMyCod(selectedAssignment.id, {
        amount: codAmount,
        currency: selectedAssignment.order.currency,
        notes: codNotes.trim() || undefined,
        receiptProof: receiptProof ?? undefined,
      })
      setCodSuccess('COD collection recorded successfully.')
      setCodAmount(selectedAssignment.order.totalAmount)
      setCodNotes('')
      setReceiptProof(null)
      setCollectionPage(1)
      setCollectionsLoading(true)
      setSummaryLoading(true)
      setAssignmentsLoading(true)
      setDetailLoading(true)
      setCollectionReload((value) => value + 1)
      setAssignmentReload((value) => value + 1)
      setDetailReload((value) => value + 1)
    } catch (error) {
      setCodError(getApiError(error))
    } finally {
      setCodSaving(false)
    }
  }

  const retryAssignments = () => refreshAssignments()

  const canCollectCod =
    selectedAssignment?.order.paymentMethod === 'COD' &&
    (currentStatus === 'DELIVERED' ||
      (currentStatus !== 'RETURNED' && selectedAssignment?.endedAt === null))

  // Filter assignments by text search (order #, customer name, phone, address)
  const displayedAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments
    const q = searchQuery.toLowerCase().trim()
    return assignments.filter((a) => {
      const orderNum = a.order.orderNumber.toLowerCase()
      const customer = `${a.order.user.firstName} ${a.order.user.lastName} ${a.order.shippingRecipientName}`.toLowerCase()
      const phone = (a.order.shippingPhone ?? a.order.user.phone ?? '').toLowerCase()
      const city = (a.order.shippingCity ?? '').toLowerCase()
      const addr = (a.order.shippingAddressLine1 ?? '').toLowerCase()
      return orderNum.includes(q) || customer.includes(q) || phone.includes(q) || city.includes(q) || addr.includes(q)
    })
  }, [assignments, searchQuery])

  const openAssignmentModal = (assignment: DeliveryStaffAssignment) => {
    setDetailLoading(true)
    setDetailError(null)
    setAssignmentDetail(null)
    setStatusChoice(STATUS_TRANSITIONS[assignment.status][0] ?? '')
    setCodAmount(assignment.order.totalAmount)
    setCodNotes('')
    setReceiptProof(null)
    setSelectedAssignment(assignment)
    setStatusError(null)
    setStatusSuccess(null)
    setCodError(null)
    setCodSuccess(null)
  }

  const staffName = displayName(user) || 'Courier Staff'
  const staffInitials = staffName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:flex-row">
      {/* -------------------------------------------------------------
          Desktop Sidebar Navigation
         ------------------------------------------------------------- */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col shrink-0 border-r border-line bg-paper sticky top-0 h-screen">
        {/* Brand & Workspace Name */}
        <div className="flex h-18 items-center gap-3 border-b border-line/70 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-ink text-paper shadow-xs">
            <Truck size={20} strokeWidth={2} />
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight text-ink uppercase">
              Courier Desk
            </span>
            <span className="block text-[11px] font-mono text-graphite">
              Logistics Suite
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Courier navigation">
          <button
            type="button"
            onClick={() => {
              setActiveTab('overview')
              setSelectedAssignment(null)
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'overview'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-graphite hover:bg-bone/80 hover:text-ink'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'deliveries'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-graphite hover:bg-bone/80 hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package size={16} />
              <span>My Deliveries</span>
            </div>
            {assignmentTotal > 0 && (
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'deliveries'
                    ? 'bg-paper text-ink'
                    : 'bg-bone text-graphite'
                }`}
              >
                {assignmentTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'history'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-graphite hover:bg-bone/80 hover:text-ink'
            }`}
          >
            <History size={16} />
            <span>Delivery History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'profile'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-graphite hover:bg-bone/80 hover:text-ink'
            }`}
          >
            <User size={16} />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Sidebar Footer: Staff Card & Logout */}
        <div className="border-t border-line/70 p-4 space-y-3 bg-bone/30">
          <div className="flex items-center gap-3 px-1">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper text-xs font-bold font-mono">
              {staffInitials || 'CS'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{staffName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>On Shift</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper py-2 text-xs font-medium text-graphite hover:border-signal/50 hover:bg-signal-soft hover:text-signal transition-colors"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          Mobile Top Navigation Bar
         ------------------------------------------------------------- */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-line bg-paper px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-ink text-paper shadow-xs">
              <Truck size={16} />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-ink">
                Courier Desk
              </span>
              <span className="block text-[10px] text-emerald-700 font-medium">● Online</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="grid size-9 place-items-center rounded-lg border border-line bg-paper text-ink hover:bg-bone transition-colors"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="mt-3 border-t border-line pt-3 space-y-1" aria-label="Mobile navigation">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview')
                setMobileMenuOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'overview' ? 'bg-ink text-paper' : 'text-graphite'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('deliveries')
                setMobileMenuOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'deliveries' ? 'bg-ink text-paper' : 'text-graphite'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={15} />
                <span>My Deliveries</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-bone px-1.5 py-0.5 rounded">
                {assignmentTotal}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history')
                setMobileMenuOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'history' ? 'bg-ink text-paper' : 'text-graphite'
              }`}
            >
              <History size={15} />
              <span>Delivery History</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile')
                setMobileMenuOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'profile' ? 'bg-ink text-paper' : 'text-graphite'
              }`}
            >
              <User size={15} />
              <span>My Profile</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </nav>
        )}
      </div>

      {/* -------------------------------------------------------------
          Main Content Workspace
         ------------------------------------------------------------- */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="border-b border-line bg-paper px-6 py-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Active Shift · Dispatched
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Welcome, {staffName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-graphite">
                Review your assigned deliveries, update their progress, and record COD collections.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={refreshAssignments}
                title="Sync data"
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-line bg-paper-pure text-xs font-medium text-graphite hover:text-ink hover:border-ink transition-colors shadow-xs"
              >
                <RefreshCw size={13} className={assignmentsLoading ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>

              <div className="inline-flex items-center gap-2 border border-line bg-bone/70 px-3.5 py-2 rounded-lg text-xs text-graphite">
                <ClipboardList size={15} aria-hidden className="text-ink" />
                <span>
                  <strong className="text-ink">{assignmentTotal}</strong> assigned orders
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          {/* =========================================================
              1. 4 Compact Logistics Overview Stat Cards
             ========================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={<Truck size={17} className="text-blue-700" />}
              label="Assigned Deliveries"
              value={String(assignmentTotal)}
              caption="Active queued orders"
              accent="blue"
            />
            <StatCard
              icon={<Clock size={17} className="text-amber-700" />}
              label="Pending Deliveries"
              value={String(pendingCount)}
              caption="Awaiting dispatch"
              accent="amber"
            />
            <StatCard
              icon={<Navigation size={17} className="text-indigo-700" />}
              label="In Transit"
              value={String(inTransitCount)}
              caption="On the road now"
              accent="indigo"
            />
            <StatCard
              icon={<PackageCheck size={17} className="text-emerald-700" />}
              label="Delivered Today"
              value={String(deliveredCount)}
              caption="Completed orders"
              accent="emerald"
            />
          </div>

          {/* =========================================================
              2. COD Collections Summary Cards
             ========================================================= */}
          {(activeTab === 'overview' || activeTab === 'history') && (
            <section aria-label="COD collection summary" className="space-y-4">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={17} aria-hidden className="text-graphite" />
                  <h2 className="text-base font-bold text-ink tracking-tight">
                    COD collections
                  </h2>
                </div>
                {summary && (
                  <span className="text-xs text-graphite font-mono">
                    Total: {summary.totalCollections}
                  </span>
                )}
              </div>

              {summaryError ? (
                <ErrorState
                  message={summaryError}
                  onRetry={() => {
                    setSummaryLoading(true)
                    setSummaryError(null)
                    setCollectionReload((value) => value + 1)
                  }}
                />
              ) : summaryLoading ? (
                <div
                  aria-label="Loading COD summary"
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-xl border border-line bg-paper"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ModernSummaryCard
                    label="Total collections"
                    value={String(summary?.totalCollections ?? 0)}
                  />
                  {(summary?.totalsByCurrency ?? []).length === 0 ? (
                    <ModernSummaryCard label="Collected totals" value="No collections yet" />
                  ) : (
                    summary?.totalsByCurrency.map((total) => (
                      <ModernSummaryCard
                        key={total.currency}
                        label={`${total.currency} collected · ${total.count}`}
                        value={formatMoney(total.totalAmount, total.currency)}
                      />
                    ))
                  )}
                  <ModernSummaryCard
                    label="First collection"
                    value={formatDate(summary?.firstCollectionAt ?? null)}
                  />
                  <ModernSummaryCard
                    label="Last collection"
                    value={formatDate(summary?.lastCollectionAt ?? null)}
                  />
                </div>
              )}
            </section>
          )}

          {/* =========================================================
              3. My Deliveries Section (Main Task List)
             ========================================================= */}
          {(activeTab === 'overview' || activeTab === 'deliveries') && (
            <section aria-label="Assigned orders" className="space-y-4">
              {/* Toolbar & Controls */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Package size={17} className="text-graphite" />
                    <h2 className="text-base font-bold text-ink tracking-tight">
                      Assigned orders
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-graphite">
                    Live delivery tasks assigned to your courier route.
                  </p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-60">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite"
                    />
                    <input
                      type="text"
                      placeholder="Search task or address…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9.5 w-full rounded-lg border border-line bg-paper-pure pl-8.5 pr-7 text-xs text-ink placeholder:text-graphite/60 focus:border-ink focus:outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-graphite hover:text-ink"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="w-full sm:w-48">
                    <SelectField
                      label="Filter by delivery status"
                      name="assignment-status-filter"
                      value={statusFilter}
                      onChange={(event) => {
                        setAssignmentsLoading(true)
                        setAssignmentsError(null)
                        setStatusFilter(event.target.value as DeliveryAssignmentStatus | '')
                        setAssignmentPage(1)
                      }}
                    >
                      <option value="">All statuses</option>
                      {ASSIGNMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>
              </div>

              {/* Assignments List State Machine */}
              {assignmentsError ? (
                <ErrorState message={assignmentsError} onRetry={retryAssignments} />
              ) : assignmentsLoading ? (
                <div aria-label="Loading assignments" className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-xl border border-line bg-paper"
                    />
                  ))}
                </div>
              ) : displayedAssignments.length === 0 ? (
                <EmptyState
                  align="left"
                  eyebrow="No assignments"
                  title={
                    statusFilter
                      ? `No ${statusLabel(statusFilter).toLowerCase()} orders`
                      : searchQuery
                      ? 'No matching tasks'
                      : 'Nothing assigned yet'
                  }
                  description={
                    searchQuery
                      ? 'Try clearing your search query to see all assigned orders.'
                      : 'New delivery assignments will appear here.'
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-xs">
                  {/* Assignments Table View */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                      <thead className="border-b border-line bg-bone/60 font-semibold uppercase tracking-wider text-graphite">
                        <tr>
                          <th className="px-5 py-3">Order #</th>
                          <th className="px-5 py-3">Recipient</th>
                          <th className="px-5 py-3">Destination</th>
                          <th className="px-5 py-3">Payment / COD</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {displayedAssignments.map((assignment) => {
                          const isSelected = selectedAssignment?.id === assignment.id
                          const badge = statusBadgeConfig[assignment.status]
                          const isCod = assignment.order.paymentMethod === 'COD'

                          return (
                            <tr
                              key={assignment.id}
                              className={`transition-colors hover:bg-bone/40 ${
                                isSelected ? 'bg-bone/70' : ''
                              }`}
                            >
                              <td className="px-5 py-4 font-mono font-bold text-ink">
                                <button
                                  type="button"
                                  onClick={() => openAssignmentModal(assignment)}
                                  className="text-left hover:underline text-ink"
                                >
                                  {assignment.order.orderNumber}
                                </button>
                                <span className="block mt-0.5 text-[11px] font-sans font-normal text-graphite">
                                  {formatDate(assignment.assignedAt)}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="block font-semibold text-ink">
                                  {assignment.order.shippingRecipientName}
                                </span>
                                {assignment.order.shippingPhone && (
                                  <a
                                    href={`tel:${assignment.order.shippingPhone}`}
                                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-blue-700 hover:underline"
                                  >
                                    <Phone size={10} />
                                    <span>{assignment.order.shippingPhone}</span>
                                  </a>
                                )}
                              </td>
                              <td className="px-5 py-4 max-w-xs">
                                <div className="flex items-start gap-1.5 text-graphite">
                                  <MapPin size={13} className="shrink-0 mt-0.5 text-ash" />
                                  <span className="truncate">
                                    {assignment.order.shippingAddressLine1 || '—'}
                                    {assignment.order.shippingCity
                                      ? `, ${assignment.order.shippingCity}`
                                      : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                      isCod
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-zinc-100 text-zinc-700'
                                    }`}
                                  >
                                    {isCod ? 'COD (Cash)' : (assignment.order.paymentMethod || 'Prepaid')}
                                  </span>
                                  <span className="font-semibold text-ink font-mono text-xs">
                                    {formatMoney(
                                      assignment.order.totalAmount,
                                      assignment.order.currency,
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                  <span className={`size-1.5 rounded-full ${badge.dot}`} />
                                  <span>{statusLabel(assignment.status)}</span>
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => openAssignmentModal(assignment)}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                                    isSelected
                                      ? 'border-ink bg-ink text-paper'
                                      : 'border-line bg-paper-pure text-ink hover:border-ink hover:bg-bone'
                                  }`}
                                >
                                  <span>Manage</span>
                                  <ArrowRight size={12} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <PageControls
                    label="Assigned order pages"
                    page={assignmentPage}
                    totalPages={assignmentTotalPages}
                    onChange={(page) => {
                      setAssignmentsLoading(true)
                      setAssignmentPage(page)
                    }}
                  />
                </div>
              )}
            </section>
          )}

          {/* =========================================================
              4. Delivery Details Modal / Panel
             ========================================================= */}
          {selectedAssignment && (
            <section
              aria-label="Assignment details"
              className="space-y-5 rounded-2xl border border-line bg-paper p-5 sm:p-7 shadow-sm"
            >
              {/* Details Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <PackageCheck size={20} className="text-ink" />
                  <div>
                    <h2 className="text-lg font-bold text-ink">Delivery details</h2>
                    <p className="text-xs text-graphite font-mono">
                      Order: {selectedAssignment.order.orderNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusBadgeConfig[currentStatus ?? selectedAssignment.status].bg
                    } ${statusBadgeConfig[currentStatus ?? selectedAssignment.status].text} ${
                      statusBadgeConfig[currentStatus ?? selectedAssignment.status].border
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        statusBadgeConfig[currentStatus ?? selectedAssignment.status].dot
                      }`}
                    />
                    <span>{statusLabel(currentStatus ?? selectedAssignment.status)}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedAssignment(null)}
                    aria-label="Close delivery details"
                    className="grid size-8 place-items-center rounded-lg border border-line bg-paper-pure text-graphite hover:text-ink transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Visual Logistics Progress Stepper */}
              <div className="rounded-xl border border-line/70 bg-paper-pure p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-graphite mb-3">
                  Delivery Progress Flow
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Step 1: Assigned */}
                  <div className="flex flex-col items-center">
                    <div className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-800 font-bold mb-1 border border-emerald-300">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-ink">Assigned</span>
                    <span className="text-[10px] text-graphite font-mono">
                      {formatDate(selectedAssignment.assignedAt)}
                    </span>
                  </div>

                  {/* Step 2: In Transit */}
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`grid size-8 place-items-center rounded-full font-bold mb-1 border ${
                        currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : currentStatus === 'FAILED_DELIVERY'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-bone text-graphite border-line'
                      }`}
                    >
                      {currentStatus === 'DELIVERED' ? (
                        <Check size={14} strokeWidth={2.5} />
                      ) : (
                        <Truck size={14} />
                      )}
                    </div>
                    <span className="font-semibold text-ink">In Transit</span>
                    <span className="text-[10px] text-graphite font-mono">
                      {currentStatus === 'OUT_FOR_DELIVERY' ? 'Out for delivery' : 'Pending route'}
                    </span>
                  </div>

                  {/* Step 3: Delivered */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`grid size-8 place-items-center rounded-full font-bold mb-1 border ${
                        currentStatus === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-bone text-graphite border-line'
                      }`}
                    >
                      <PackageCheck size={14} />
                    </div>
                    <span className="font-semibold text-ink">Delivered</span>
                    <span className="text-[10px] text-graphite font-mono">
                      {currentStatus === 'DELIVERED' ? 'Completed' : 'Final stage'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Loading / Error States */}
              {detailError && (
                <ErrorState
                  message={detailError}
                  onRetry={() => {
                    setDetailLoading(true)
                    setDetailError(null)
                    setDetailReload((value) => value + 1)
                  }}
                />
              )}
              {detailLoading && (
                <div
                  role="status"
                  className="rounded-xl border border-line bg-paper-pure px-5 py-4 text-xs font-mono text-graphite"
                >
                  Loading assignment details…
                </div>
              )}

              {/* Main Master-Detail Grid */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
                {/* Left Column: Order, Customer, Items */}
                <article className="space-y-5 rounded-xl border border-line/80 bg-paper-pure p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-graphite">
                        Order
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold text-ink">
                        {selectedAssignment.order.orderNumber}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        statusBadgeConfig[currentStatus ?? selectedAssignment.status].bg
                      } ${statusBadgeConfig[currentStatus ?? selectedAssignment.status].text} ${
                        statusBadgeConfig[currentStatus ?? selectedAssignment.status].border
                      }`}
                    >
                      {statusLabel(currentStatus ?? selectedAssignment.status)}
                    </span>
                  </div>

                  {/* Customer Contact & Address Grid */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <DetailBlock title="Customer">
                      <p className="font-semibold text-ink">
                        {selectedAssignment.order.user.firstName}{' '}
                        {selectedAssignment.order.user.lastName}
                      </p>
                      <p className="text-xs text-graphite">{selectedAssignment.order.user.email}</p>
                      <p className="text-xs font-mono text-ink">
                        {selectedAssignment.order.user.phone ?? selectedAssignment.order.shippingPhone}
                      </p>
                    </DetailBlock>

                    <DetailBlock title="Deliver to">
                      <p className="font-semibold text-ink">
                        {selectedAssignment.order.shippingRecipientName}
                      </p>
                      <p className="text-xs font-mono text-ink">
                        {selectedAssignment.order.shippingPhone}
                      </p>
                      {formatOrderAddressLines(selectedAssignment.order).map((line) => (
                        <p key={line} className="text-xs text-graphite">
                          {line}
                        </p>
                      ))}
                    </DetailBlock>
                  </div>

                  {/* Order Items List */}
                  <div className="border-t border-line/70 pt-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-graphite">
                      Order items
                    </h4>
                    <ul className="divide-y divide-line/60 rounded-lg border border-line/70 overflow-hidden">
                      {selectedAssignment.order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4 p-3 bg-paper text-xs"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">
                              {item.productName}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-graphite font-mono">
                              {item.sku}
                              {item.variantOptionsSnapshot.length > 0
                                ? ` · ${item.variantOptionsSnapshot
                                    .map((option) => `${option.optionName}: ${option.optionValue}`)
                                    .join(', ')}`
                                : ''}{' '}
                              · Qty {item.quantity}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-ink font-mono">
                            {formatMoney(item.lineTotal, selectedAssignment.order.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Financial & Delivery Details */}
                  <dl className="grid grid-cols-2 gap-3 border-t border-line/70 pt-4 text-xs">
                    <DetailValue
                      label="Payment method"
                      value={selectedAssignment.order.paymentMethod ?? 'Not specified'}
                    />
                    <DetailValue label="Currency" value={selectedAssignment.order.currency} />
                    <DetailValue
                      label="Order total"
                      value={formatMoney(
                        selectedAssignment.order.totalAmount,
                        selectedAssignment.order.currency,
                      )}
                    />
                    <DetailValue
                      label="Assigned"
                      value={formatDate(selectedAssignment.assignedAt)}
                    />
                    {currentStatus === 'DELIVERED' && assignmentDetail?.deliveredAt && (
                      <DetailValue
                        label="Delivered at"
                        value={formatDate(assignmentDetail.deliveredAt)}
                      />
                    )}
                  </dl>
                </article>

                {/* Right Column: Actions (Update Status & Record COD) */}
                <div className="space-y-5">
                  {/* Action 1: Update Status */}
                  <article className="rounded-xl border border-line/80 bg-paper-pure p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-ink tracking-tight">
                      Update delivery status
                    </h3>
                    {statusError && <InlineNotice className="mt-3" message={statusError} />}
                    {statusSuccess && (
                      <InlineNotice className="mt-3" message={statusSuccess} tone="success" />
                    )}

                    {availableTransitions.length === 0 ? (
                      <p className="mt-3 text-xs leading-relaxed text-graphite">
                        No further status changes are available for this assignment.
                      </p>
                    ) : (
                      <form className="mt-3.5 space-y-3.5" onSubmit={submitStatus}>
                        <SelectField
                          label="Next status"
                          name="next-delivery-status"
                          required
                          value={statusChoice}
                          onChange={(event) =>
                            setStatusChoice(event.target.value as DeliveryAssignmentStatus)
                          }
                        >
                          {availableTransitions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </SelectField>

                        <TextAreaField
                          label="Notes (optional)"
                          name="delivery-status-notes"
                          value={statusNotes}
                          onChange={(event) => setStatusNotes(event.target.value)}
                          maxLength={2000}
                          rows={3}
                          placeholder="Add a delivery update or note…"
                        />

                        <Action
                          type="submit"
                          size="sm"
                          disabled={statusSaving || !statusChoice}
                          className="w-full"
                        >
                          {statusSaving ? 'Updating…' : 'Update status'}
                        </Action>
                      </form>
                    )}
                  </article>

                  {/* Action 2: Collect COD */}
                  {canCollectCod && (
                    <article className="rounded-xl border border-line/80 bg-paper-pure p-5 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Wallet size={15} className="text-amber-700" />
                        <h3 className="text-sm font-bold text-ink tracking-tight">
                          Record COD collection
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-graphite leading-relaxed">
                        Enter the cash received. The server verifies it against the order total.
                      </p>

                      {codError && <InlineNotice className="mt-3" message={codError} />}
                      {codSuccess && (
                        <InlineNotice className="mt-3" message={codSuccess} tone="success" />
                      )}

                      <form className="mt-3.5 space-y-3.5" onSubmit={submitCodCollection}>
                        <TextField
                          label="Currency"
                          name="cod-currency"
                          value={selectedAssignment.order.currency}
                          readOnly
                          hint="Currency is fixed by the order."
                        />

                        <TextField
                          label={`Amount (${selectedAssignment.order.currency})`}
                          name="cod-amount"
                          inputMode="decimal"
                          value={codAmount}
                          onChange={(event) => setCodAmount(event.target.value)}
                          required
                          hint={`Order total: ${formatMoney(
                            selectedAssignment.order.totalAmount,
                            selectedAssignment.order.currency,
                          )}`}
                        />

                        <div className="space-y-1">
                          <label
                            htmlFor="receipt-proof"
                            className="block text-xs font-semibold text-ink"
                          >
                            Receipt proof (optional)
                          </label>
                          <input
                            id="receipt-proof"
                            type="file"
                            accept="image/*"
                            onChange={(event) => setReceiptProof(event.target.files?.[0] ?? null)}
                            className="block min-h-10 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-graphite file:mr-2.5 file:rounded file:border-0 file:bg-bone file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-ink cursor-pointer"
                          />
                          {receiptProof && (
                            <p className="text-[11px] text-emerald-700">
                              Selected: {receiptProof.name}
                            </p>
                          )}
                        </div>

                        <TextAreaField
                          label="Collection notes (optional)"
                          name="cod-notes"
                          value={codNotes}
                          onChange={(event) => setCodNotes(event.target.value)}
                          maxLength={2000}
                          rows={2}
                          placeholder="Add a collection note…"
                        />

                        <Action type="submit" size="sm" disabled={codSaving} className="w-full">
                          {codSaving ? 'Recording…' : 'Record collection'}
                        </Action>
                      </form>
                    </article>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* =========================================================
              5. COD Collection History Table
             ========================================================= */}
          {(activeTab === 'overview' || activeTab === 'history') && (
            <section aria-label="COD collection history" className="space-y-4">
              <div className="border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <History size={17} className="text-graphite" />
                  <h2 className="text-base font-bold text-ink tracking-tight">
                    Collection history
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-graphite">
                  Audit record of all COD collections processed by your account.
                </p>
              </div>

              {collectionsError ? (
                <ErrorState
                  message={collectionsError}
                  onRetry={() => {
                    setCollectionsLoading(true)
                    setCollectionsError(null)
                    setCollectionReload((value) => value + 1)
                  }}
                />
              ) : collectionsLoading ? (
                <div
                  aria-label="Loading COD collections"
                  className="h-32 animate-pulse rounded-xl border border-line bg-paper"
                />
              ) : collections.length === 0 ? (
                <EmptyState
                  align="left"
                  eyebrow="No collections"
                  title="No COD collections recorded"
                  description="Collections you record for your assigned COD orders will appear here."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-line bg-paper shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                      <thead className="border-b border-line bg-bone/60 font-semibold uppercase tracking-wider text-graphite">
                        <tr>
                          <th className="px-5 py-3">Order</th>
                          <th className="px-5 py-3">Collected</th>
                          <th className="px-5 py-3 text-right">Amount</th>
                          <th className="px-5 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {collections.map((col) => (
                          <tr key={col.collectionId} className="hover:bg-bone/40 transition-colors">
                            <td className="px-5 py-3.5 font-medium font-mono text-ink">
                              {col.orderNumber ?? col.orderId}
                            </td>
                            <td className="px-5 py-3.5 text-graphite">
                              {formatDate(col.collectedAt)}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-ink font-mono">
                              {formatMoney(col.amount, col.currency)}
                            </td>
                            <td className="max-w-56 truncate px-5 py-3.5 text-graphite">
                              {col.notes ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <PageControls
                    label="COD collection pages"
                    page={collectionPage}
                    totalPages={collectionTotalPages}
                    onChange={(page) => {
                      setCollectionsLoading(true)
                      setCollectionPage(page)
                    }}
                  />
                </div>
              )}
            </section>
          )}

          {/* =========================================================
              6. Staff Profile Tab
             ========================================================= */}
          {activeTab === 'profile' && (
            <section aria-label="Staff profile" className="space-y-6">
              <div className="border-b border-line/60 pb-3">
                <h2 className="text-base font-bold text-ink tracking-tight">Staff Profile</h2>
                <p className="text-xs text-graphite">
                  Your delivery courier account credentials and route status.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 max-w-4xl">
                <article className="rounded-xl border border-line bg-paper-pure p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="grid size-14 place-items-center rounded-2xl bg-ink text-paper text-lg font-bold font-mono">
                      {staffInitials}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">{staffName}</h3>
                      <p className="text-xs text-graphite font-mono">{user?.email}</p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Verified Delivery Courier
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-line/70 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-graphite">Role:</span>
                      <span className="font-semibold text-ink font-mono">{user?.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-graphite">Account Status:</span>
                      <span className="font-semibold text-emerald-700">{user?.status ?? 'ACTIVE'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-graphite">Assigned Orders:</span>
                      <span className="font-semibold text-ink">{assignmentTotal}</span>
                    </div>
                  </div>
                </article>

                <article className="rounded-xl border border-line bg-paper-pure p-6 shadow-xs space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-graphite">
                    Courier Guidelines
                  </h4>
                  <ul className="text-xs text-graphite space-y-2 leading-relaxed">
                    <li>• Always verify recipient identity and phone upon delivery.</li>
                    <li>• For Cash-on-Delivery (COD) orders, collect exact payment before handover.</li>
                    <li>• If delivery attempt fails, record reason in notes and update status to Failed Delivery.</li>
                    <li>• Contact dispatcher if any address discrepancies occur.</li>
                  </ul>
                </article>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

// Subcomponents
const StatCard = ({
  icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string | number
  caption: string
  accent: 'blue' | 'amber' | 'indigo' | 'emerald'
}) => {
  const borderColors = {
    blue: 'border-blue-100',
    amber: 'border-amber-100',
    indigo: 'border-indigo-100',
    emerald: 'border-emerald-100',
  }

  return (
    <div
      className={`rounded-xl border bg-paper-pure p-4 shadow-xs transition-shadow hover:shadow-sm ${borderColors[accent]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-graphite">{label}</p>
        <div className="p-1.5 rounded-lg bg-bone">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink font-mono">{value}</p>
      <p className="mt-0.5 text-[11px] text-graphite/70">{caption}</p>
    </div>
  )
}

const ModernSummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-line/70 bg-paper-pure p-4 shadow-xs">
    <p className="text-xs font-medium text-graphite">{label}</p>
    <p className="mt-1.5 break-words text-lg font-bold text-ink font-mono">{value}</p>
  </div>
)

const DetailBlock = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-1 text-xs leading-5 text-graphite">
    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-graphite">{title}</h4>
    {children}
  </div>
)

const DetailValue = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[11px] font-mono text-graphite">{label}</dt>
    <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
  </div>
)
