import type { ISODateTime, MoneyString, UUID } from './common'
import type { Order, OrderStatus } from './orders'

export type DeliveryAssignmentStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'RETURNED'

export interface DeliveryStaff {
  id: UUID
  firstName: string
  lastName: string
  email: string
}

export interface DeliveryAssignment {
  id: UUID
  orderId: UUID
  deliveryStaffId: UUID
  status: DeliveryAssignmentStatus
  assignedAt: ISODateTime
  startedAt: ISODateTime | null
  endedAt: ISODateTime | null
  deliveryStaff: DeliveryStaff
}

export interface DeliveryManagerOrderDetail {
  id: UUID
  status: OrderStatus
  deliveryAssignments: DeliveryAssignment[]
}

export interface DeliveryAssignmentPage {
  items: DeliveryStaffAssignment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DeliveryStaffAssignment extends DeliveryAssignment {
  endedAt: ISODateTime | null
  order: DeliveryStaffOrder
  assignedBy: Pick<DeliveryStaff, 'id' | 'firstName' | 'lastName' | 'email'> | null
}

/** The staff list endpoint includes the customer and line snapshots for the detail view. */
export interface DeliveryStaffOrder extends Order {
  user: Pick<DeliveryStaff, 'id' | 'firstName' | 'lastName' | 'email'> & {
    phone: string | null
  }
}

/** GET /delivery/staff/assignments/:assignmentId returns the order without nested items/customer. */
export interface DeliveryStaffAssignmentDetail extends Omit<DeliveryAssignment, 'deliveryStaff'> {
  endedAt: ISODateTime | null
  deliveredAt: ISODateTime | null
  order: Omit<Order, 'items'>
  deliveryStaff: DeliveryStaff
  assignedBy: Pick<DeliveryStaff, 'id' | 'firstName' | 'lastName' | 'email'> | null
}

export interface CodCollection {
  collectionId: UUID
  orderId: UUID
  orderNumber: string | null
  amount: MoneyString
  currency: string
  collectedAt: ISODateTime
  collectedById: UUID
  notes: string | null
  receiptProof: unknown | null
}

export interface CodCollectionPage {
  items: CodCollection[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CodCollectionsSummary {
  totalCollections: number
  totalsByCurrency: Array<{
    currency: string
    totalAmount: MoneyString
    count: number
  }>
  firstCollectionAt: ISODateTime | null
  lastCollectionAt: ISODateTime | null
  periodBreakdown: Array<{
    period: string
    currency: string
    totalAmount: MoneyString
    count: number
  }>
}
