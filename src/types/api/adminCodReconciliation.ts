import type { ISODateTime, MoneyString, UUID } from './common'

export type ReconciliationRunStatus = 'running' | 'completed' | 'failed'
export type ReconciliationTriggerType = 'cron' | 'manual'
export type ReconciliationDiscrepancyType =
  | 'missing-collection'
  | 'amount-mismatch'
  | 'currency-mismatch'

/** Mirrors the fields returned for one `CodReconciliationRun`. */
export interface AdminCodReconciliationRun {
  id: UUID
  triggerType: ReconciliationTriggerType
  status: ReconciliationRunStatus
  windowStart: ISODateTime
  windowEnd: ISODateTime
  processedCount: number
  matchedCount: number
  discrepancyCount: number
  uncollectedCount: number
  errorMessage: string | null
  startedAt: ISODateTime
  completedAt: ISODateTime | null
  createdAt: ISODateTime
}

export interface AdminCodReconciliationRunHistory {
  items: AdminCodReconciliationRun[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminCodReconciliationRunQuery {
  page: number
  limit: number
  status?: ReconciliationRunStatus
  triggerType?: ReconciliationTriggerType
  /** Inclusive UTC calendar date filter on `windowStart`. */
  startDate?: string
  /** Inclusive UTC calendar date filter on `windowStart`. */
  endDate?: string
}

export type ManualReconciliationTrigger =
  | { date: string }
  | { windowStart: ISODateTime; windowEnd: ISODateTime }

export interface AdminCodReconciliationCounters {
  processedCount: number
  matchedCount: number
  discrepancyCount: number
  uncollectedCount: number
}

export interface AdminCodReconciliationDiscrepancyBreakdown {
  missingCollections: number
  amountMismatches: number
  currencyMismatches: number
}

export interface AdminCodReconciliationExecution {
  run: AdminCodReconciliationRun
  counters: AdminCodReconciliationCounters
  discrepancyBreakdown: AdminCodReconciliationDiscrepancyBreakdown
}

/** Attribution snapshot for a collector or delivery staff member on a run item. */
export interface AdminCodReconciliationSnapshotPerson {
  id: UUID
  firstName: string
  lastName: string
  email: string
}

/** One immutable order snapshot row returned by a run's detail endpoint. */
export interface AdminCodReconciliationRunSnapshotItem {
  id: UUID
  orderId: UUID
  orderNumber: string | null
  orderStatus: string | null
  paymentMethod: string | null
  currency: string
  expectedAmount: MoneyString
  collectedAmount: MoneyString | null
  collectionCurrency: string | null
  collectionId: UUID | null
  collectedAt: ISODateTime | null
  collectedById: UUID | null
  collectedBy: AdminCodReconciliationSnapshotPerson | null
  deliveryStaffId: UUID | null
  deliveryStaff: AdminCodReconciliationSnapshotPerson | null
  deliveredAt: ISODateTime | null
  assignmentId: UUID | null
  discrepancy: boolean
  discrepancyType: ReconciliationDiscrepancyType | null
  discrepancyExplanation: string | null
}

/** Expected and collected totals for one currency, kept strictly separate. */
export interface AdminCodReconciliationCurrencySummary {
  currency: string
  expectedCount: number
  expectedAmount: MoneyString
  matchedCount: number
  discrepancyCount: number
  collectedCount: number
  collectedAmount: MoneyString
}

/** One row of the live COD reconciliation listing (GET /admin/cod-reconciliation). */
export interface AdminCodReconciliationListRow {
  orderId: UUID
  orderNumber: string | null
  orderStatus: string | null
  paymentMethod: string | null
  expectedAmount: MoneyString
  currency: string
  collectedAmount: MoneyString | null
  collectionId: string | null
  collectedAt: ISODateTime | null
  collectedById: string | null
  collectedBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  discrepancy: boolean
}

/** The paginated COD reconciliation listing response. */
export interface AdminCodReconciliationListDto {
  items: AdminCodReconciliationListRow[]
  pagination: AdminCodReconciliationPagination
}

/** Query filters supported by GET /admin/cod-reconciliation. */
export interface AdminCodReconciliationListQuery {
  page: number
  limit: number
  startDate?: string
  endDate?: string
  staffId?: string
  orderId?: string
  orderNumber?: string
  status?: string
  currency?: string
  sortBy?: string
  sortOrder?: string
  period?: string
}

/** Currency-scoped totals from the summary endpoint, never mixed across currencies. */
export interface AdminCodReconciliationCurrencyTotal {
  currency: string
  collectedAmount: MoneyString
  expectedAmount: MoneyString
  outstandingAmount: MoneyString
  count: number
}

/** The live COD reconciliation summary (GET /admin/cod-reconciliation/summary). */
export interface AdminCodReconciliationSummary {
  totalCollections: number
  totalsByCurrency: AdminCodReconciliationCurrencyTotal[]
  expectedAmountByCurrency: Array<{ currency: string; totalAmount: MoneyString }>
  outstandingAmountByCurrency: Array<{ currency: string; totalAmount: MoneyString }>
  collectionCount: number
  discrepancyCount: number
  firstCollectionAt: ISODateTime | null
  lastCollectionAt: ISODateTime | null
}

export interface AdminCodReconciliationPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** The full detail of a reconciliation run, including its paginated snapshot. */
export interface AdminCodReconciliationRunDetail {
  id: UUID
  triggerType: ReconciliationTriggerType
  status: ReconciliationRunStatus
  windowStart: ISODateTime
  windowEnd: ISODateTime
  processedCount: number
  matchedCount: number
  discrepancyCount: number
  uncollectedCount: number
  errorMessage: string | null
  startedAt: ISODateTime
  completedAt: ISODateTime | null
  createdAt: ISODateTime
  hasSnapshot: boolean
  items: AdminCodReconciliationRunSnapshotItem[]
  summaryByCurrency: AdminCodReconciliationCurrencySummary[]
  pagination: AdminCodReconciliationPagination
}
