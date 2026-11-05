import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, RotateCcw, Truck, UserPlus, XCircle } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { BackLink, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import {
  EmptyState,
  ErrorState,
  InlineNotice,
} from '@/components/account/States'
import { Skeleton, SkeletonCard } from '@/components/account/Skeleton'
import { PaymentStatusBadge } from '@/features/adminOrders/components/PaymentStatusBadge'
import { CodCollectionStatusBadge } from '@/features/adminOrders/components/CodCollectionStatusBadge'
import {
  cancelAdminOrder,
  confirmCodAdminOrder,
  downloadAdminOrderReceipt,
  fetchAdminOrder,
  shipAdminOrder,
} from '@/features/adminOrders/api'
import {
  assignDeliveryToStaff,
  fetchActiveDeliveryStaff,
  fetchDeliveryManagerOrder,
} from '@/features/delivery/api'
import {
  hasValidActiveDeliveryAssignment,
  openDeliveryAssignment,
} from '@/features/delivery/rules'
import {
  canCancelOrder,
  canConfirmCodOrder,
  canShipOrder,
  cancelBlockedReason,
  customerName,
  effectiveCodCollectionStatus,
  effectivePaymentStatus,
  formatAdminOrderAddressLines,
  formatAdminOrderDateTime,
  hasVerifiedPayment,
  latestPayment,
  paymentCodeLabel,
  paymentMethodLabel,
  shipBlockedReason,
} from '@/features/adminOrders/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminOrderDetail,
  DeliveryManagerOrderDetail,
  DeliveryStaff,
} from '@/types/api'

/**
 * One order in full, for an administrator.
 *
 * Everything displayed is the stored order: the customer identity, the shipping
 * snapshot and the item snapshots. Payment attempts are shown read-only; this
 * screen has no control that can mark an order or a payment as paid.
 *
 * Writes are named actions the backend exposes. They are offered
 * only in the states the service accepts, and the server remains the authority if
 * the order changes while this page is open.
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { showFeedback, confirmFeedback } = useFeedback()

  const order = useAsyncResource<AdminOrderDetail | undefined>(
    (signal) => (id ? fetchAdminOrder(id, signal) : Promise.resolve(undefined)),
    [id],
  )
  const deliveryOrder = useAsyncResource<
    DeliveryManagerOrderDetail | undefined
  >(
    (signal) =>
      id ? fetchDeliveryManagerOrder(id, signal) : Promise.resolve(undefined),
    [id],
  )
  const deliveryStaff = useAsyncResource<DeliveryStaff[]>(
    (signal) => (id ? fetchActiveDeliveryStaff(signal) : Promise.resolve([])),
    [id],
  )
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [assignmentValidationError, setAssignmentValidationError] = useState('')

  const cancelMutation = useMutation(
    (orderId: string) => cancelAdminOrder(orderId),
    {
      onSuccess: () => {
        order.refetch()
        showFeedback({
          type: 'success',
          title: 'Order cancelled',
          message:
            'The order is cancelled and its stock reservation has been released.',
        })
      },
      onError: (error) => {
        showFeedback({
          type: 'error',
          title: 'Order not cancelled',
          message: toUserMessage(error),
        })
      },
    },
  )

  const confirmCodMutation = useMutation(
    (orderId: string) => confirmCodAdminOrder(orderId),
    {
      onSuccess: () => {
        order.refetch()
        showFeedback({
          type: 'success',
          title: 'COD order confirmed',
          message:
            'The order is confirmed. Payment remains unpaid until COD collection.',
        })
      },
      onError: (error) => {
        showFeedback({
          type: 'error',
          title: 'COD order not confirmed',
          message: toUserMessage(error),
        })
      },
    },
  )

  const shipMutation = useMutation(
    (orderId: string) => shipAdminOrder(orderId),
    {
      onSuccess: () => {
        order.refetch()
        showFeedback({
          type: 'success',
          title: 'Order shipped',
          message:
            'The order is marked shipped and its reserved stock has been committed.',
        })
      },
      onError: (error) => {
        showFeedback({
          type: 'error',
          title: 'Order not shipped',
          message: toUserMessage(error),
        })
      },
    },
  )

  const assignMutation = useMutation(
    (orderId: string, staffId: string) =>
      assignDeliveryToStaff(orderId, staffId),
    {
      onSuccess: () => {
        setSelectedStaffId('')
        setAssignmentValidationError('')
        order.refetch()
        deliveryOrder.refetch()
        deliveryStaff.refetch()
        showFeedback({
          type: 'success',
          title: 'Delivery staff assigned',
          message: 'The order and its delivery assignment have been refreshed.',
        })
      },
      onError: (error) => {
        showFeedback({
          type: 'error',
          title: 'Delivery staff not assigned',
          message: toUserMessage(error),
        })
      },
    },
  )

  const receiptMutation = useMutation(
    (orderId: string) => downloadAdminOrderReceipt(orderId),
    {
      onError: (error) => {
        showFeedback({
          type: 'error',
          title: 'Receipt not downloaded',
          message: toUserMessage(error),
        })
      },
    },
  )

  if (!id) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/orders">All orders</BackLink>
        <EmptyState
          eyebrow="Not found"
          title="No order selected"
          description="Open an order from the orders list."
          action={
            <Action to="/admin/orders" size="sm">
              Back to orders
            </Action>
          }
        />
      </div>
    )
  }

  if (order.isLoading) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/orders">All orders</BackLink>
        <Skeleton className="h-8 w-56" />
        <SkeletonCard rows={4} />
        <div className="grid gap-5 lg:grid-cols-3">
          <SkeletonCard rows={3} className="lg:col-span-2" />
          <SkeletonCard rows={3} />
        </div>
      </div>
    )
  }

  if (order.error !== undefined && order.data === undefined) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/orders">All orders</BackLink>
        <ErrorState
          message={toUserMessage(order.error)}
          onRetry={order.refetch}
        />
      </div>
    )
  }

  if (order.data === undefined) {
    return (
      <div className="space-y-6">
        <BackLink to="/admin/orders">All orders</BackLink>
        <EmptyState
          eyebrow="Not found"
          title="That order could not be opened"
          description="It may have been removed, or the address may be wrong."
          action={
            <Action to="/admin/orders" size="sm">
              Back to orders
            </Action>
          }
        />
      </div>
    )
  }

  const data = order.data
  const paid = hasVerifiedPayment(data.payments)
  const latest = latestPayment(data.payments)
  const codCollection = data.codCollection
  const codCollectionStatus = effectiveCodCollectionStatus(
    data.paymentMethod,
    codCollection,
  )
  const facts = {
    status: data.status,
    paymentMethod: data.paymentMethod,
    hasPaidPayment: paid,
  }
  const codConfirmationAllowed = canConfirmCodOrder(facts)
  const cancelAllowed = canCancelOrder(facts)
  const currentAssignment = openDeliveryAssignment(deliveryOrder.data)
  const hasValidAssignment = hasValidActiveDeliveryAssignment(
    currentAssignment,
    deliveryStaff.data,
  )
  const assignmentDataLoading =
    deliveryOrder.isLoading ||
    deliveryStaff.isLoading ||
    deliveryOrder.isRefreshing ||
    deliveryStaff.isRefreshing
  const assignmentDataError =
    deliveryOrder.error !== undefined || deliveryStaff.error !== undefined
  const shipAllowed =
    canShipOrder(facts) &&
    hasValidAssignment &&
    !assignmentDataLoading &&
    !assignmentDataError
  const assignAllowed =
    data.status === 'CONFIRMED' &&
    deliveryOrder.data !== undefined &&
    deliveryStaff.data !== undefined &&
    currentAssignment === undefined &&
    !assignmentDataLoading &&
    !assignmentDataError
  const actionsBusy =
    cancelMutation.isPending ||
    confirmCodMutation.isPending ||
    shipMutation.isPending ||
    assignMutation.isPending ||
    order.isRefreshing

  const requestCancel = async () => {
    if (actionsBusy || !cancelAllowed) return

    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Cancel this order?',
      message: `Cancel ${data.orderNumber}? Its reserved stock will be released. A cancelled order cannot be resumed.`,
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
    })
    if (!confirmed) return

    await cancelMutation.run(data.id)
  }

  const requestConfirmCod = async () => {
    if (actionsBusy || !codConfirmationAllowed) return

    const confirmed = await confirmFeedback({
      type: 'confirmation',
      title: 'Confirm this COD order?',
      message: `Confirm ${data.orderNumber} for fulfillment? Payment remains unpaid until an authorized delivery staff member records collection.`,
      confirmLabel: 'Confirm COD order',
      cancelLabel: 'Keep pending',
    })
    if (!confirmed) return

    await confirmCodMutation.run(data.id)
  }

  const requestShip = async () => {
    if (actionsBusy || !shipAllowed) return

    const confirmed = await confirmFeedback({
      type: 'confirmation',
      title: 'Mark this order shipped?',
      message: `Mark ${data.orderNumber} as shipped? Its reserved stock will be committed. This action cannot be undone.`,
      confirmLabel: 'Mark shipped',
      cancelLabel: 'Not yet',
    })
    if (!confirmed) return

    await shipMutation.run(data.id)
  }

  const requestAssignment = async () => {
    if (actionsBusy || !assignAllowed) return
    if (selectedStaffId === '') {
      setAssignmentValidationError('Select an active delivery staff member.')
      return
    }

    setAssignmentValidationError('')
    await assignMutation.run(data.id, selectedStaffId)
  }

  const requestReceiptDownload = async () => {
    const blob = await receiptMutation.run(data.id)
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `receipt-${data.orderNumber}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <BackLink to="/admin/orders">All orders</BackLink>

      <AdminPageHeader
        eyebrow="Order"
        title={data.orderNumber}
        description={`Placed ${formatAdminOrderDateTime(data.createdAt)} · Last updated ${formatAdminOrderDateTime(data.updatedAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <PaymentStatusBadge
              status={effectivePaymentStatus(
                paid,
                latest?.status ?? null,
                data.paymentMethod,
              )}
            />
            <CodCollectionStatusBadge
              status={effectiveCodCollectionStatus(
                data.paymentMethod,
                data.codCollection,
              )}
            />
            <Action
              variant="outline"
              size="sm"
              disabled={receiptMutation.isPending}
              onClick={() => void requestReceiptDownload()}
            >
              {receiptMutation.isPending
                ? 'Downloading receipt…'
                : 'Download receipt'}
            </Action>
          </div>
        }
      />

      {receiptMutation.error !== undefined && (
        <InlineNotice
          message={toUserMessage(receiptMutation.error)}
          onDismiss={receiptMutation.reset}
        />
      )}

      {order.error !== undefined && (
        <InlineNotice
          message={toUserMessage(order.error)}
          onDismiss={() => undefined}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <PanelHeader
              title={`${data.lineCount} ${data.lineCount === 1 ? 'line' : 'lines'} · ${data.itemCount} ${data.itemCount === 1 ? 'item' : 'items'}`}
              hint="Product names, SKUs, options and prices are the snapshots stored with the order."
            />

            <ul className="divide-y divide-line-soft">
              {data.items.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {line.productName}
                    </p>
                    <p className="mt-1 font-mono text-xs text-graphite">
                      {line.sku}
                    </p>

                    {line.variantOptionsSnapshot.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {line.variantOptionsSnapshot.map((option) => (
                          <li
                            key={`${option.optionName}-${option.optionValue}`}
                            className="border border-line bg-bone px-2 py-1 text-[12px] text-graphite"
                          >
                            {option.optionName}: {option.optionValue}
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="mt-3 text-xs text-graphite">
                      {line.quantity} ×{' '}
                      <Money amount={line.unitPrice} currency={data.currency} />
                    </p>
                  </div>

                  <Money
                    amount={line.lineTotal}
                    currency={data.currency}
                    className="shrink-0 font-mono text-sm"
                  />
                </li>
              ))}
            </ul>

            <dl className="border-t border-line px-6 py-5">
              <DefinitionRow label="Subtotal">
                <Money
                  amount={data.subtotal}
                  currency={data.currency}
                  className="font-mono"
                />
              </DefinitionRow>
              <DefinitionRow label="Shipping">
                {data.shippingFee === '0.00' ? (
                  <span className="text-graphite">Free</span>
                ) : (
                  <Money
                    amount={data.shippingFee}
                    currency={data.currency}
                    className="font-mono"
                  />
                )}
              </DefinitionRow>
              {data.discountAmount !== '0.00' && (
                <DefinitionRow label="Discount">
                  <Money
                    amount={data.discountAmount}
                    currency={data.currency}
                    className="font-mono"
                  />
                </DefinitionRow>
              )}
              <DefinitionRow label="Total">
                <Money
                  amount={data.totalAmount}
                  currency={data.currency}
                  emphasis="total"
                />
              </DefinitionRow>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title="Payment"
              hint="Every attempt recorded for this order, newest first. This view is read-only."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <p className="eyebrow text-graphite">Payment method</p>
                <p className="mt-1 text-[13.5px] font-medium text-ink">
                  {paymentCodeLabel(data.paymentMethod)}
                </p>
              </div>
              <PaymentStatusBadge
                status={effectivePaymentStatus(
                  paid,
                  latest?.status ?? null,
                  data.paymentMethod,
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <p className="eyebrow text-graphite">Payment status</p>
                <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-graphite">
                  {paid
                    ? 'At least one payment attempt has been verified as paid.'
                    : latest
                      ? `No attempt has been verified as paid. The latest attempt is ${latest.status.toLowerCase()}.`
                      : 'No payment attempt has been recorded for this order.'}
                </p>
              </div>
              <PaymentStatusBadge
                status={effectivePaymentStatus(
                  paid,
                  latest?.status ?? null,
                  data.paymentMethod,
                )}
              />
            </div>

            {data.payments.length === 0 ? (
              <p className="px-6 py-6 text-sm leading-relaxed text-graphite">
                There is nothing to show here yet. This screen never marks an
                order paid; payment is recorded only by a provider&apos;s
                verified callback or an authorised COD collection process.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {data.payments.map((payment) => (
                  <li key={payment.id} className="space-y-3 px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">
                          {paymentMethodLabel(payment)}
                        </p>
                        <p className="mt-1 font-mono text-[11.5px] text-graphite">
                          {payment.transactionId}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Money
                          amount={payment.amount}
                          currency={payment.currency}
                          className="font-mono"
                        />
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                    </div>

                    <dl className="grid gap-x-6 sm:grid-cols-2">
                      <DefinitionRow label="Provider">
                        {paymentCodeLabel(payment.provider)}
                      </DefinitionRow>
                      <DefinitionRow label="Method">
                        {paymentCodeLabel(payment.paymentMethod)}
                      </DefinitionRow>
                      <DefinitionRow label="Attempted">
                        {formatAdminOrderDateTime(payment.createdAt)}
                      </DefinitionRow>
                      <DefinitionRow label="Paid at">
                        {formatAdminOrderDateTime(payment.paidAt)}
                      </DefinitionRow>
                      {payment.providerReference !== null && (
                        <DefinitionRow label="Provider reference">
                          <span className="break-all font-mono text-[12px]">
                            {payment.providerReference}
                          </span>
                        </DefinitionRow>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-line px-6 py-4">
              <p className="text-[12.5px] leading-relaxed text-graphite">
                Payment status cannot be changed from this screen. An order
                becomes paid only through the provider&apos;s verified callback;
                COD remains unpaid until an authorised collection process
                confirms it.
              </p>
            </div>
          </Panel>

          {codCollectionStatus !== null && (
            <Panel>
              <PanelHeader
                title="COD collection"
                hint="Read from the actual collection record. This is separate from payment status."
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
                <div className="min-w-0">
                  <p className="eyebrow text-graphite">Collection status</p>
                  <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-graphite">
                    {codCollectionStatus === 'COLLECTED'
                      ? 'Cash has been recorded as collected for this order.'
                      : 'No COD collection has been recorded for this order yet.'}
                  </p>
                </div>
                <CodCollectionStatusBadge status={codCollectionStatus} />
              </div>

              {codCollectionStatus === 'COLLECTED' && (
                <dl className="grid gap-x-6 px-6 py-5 sm:grid-cols-2">
                  <DefinitionRow label="Amount">
                    {codCollection?.amount !== null &&
                    codCollection?.amount !== undefined &&
                    codCollection.currency !== null ? (
                      <Money
                        amount={codCollection.amount}
                        currency={codCollection.currency}
                        className="font-mono"
                      />
                    ) : (
                      <span className="text-graphite">—</span>
                    )}
                  </DefinitionRow>
                  <DefinitionRow label="Collected at">
                    {formatAdminOrderDateTime(
                      codCollection?.collectedAt ?? null,
                    )}
                  </DefinitionRow>
                  <DefinitionRow label="Collected by">
                    {codCollection?.collector
                      ? `${codCollection.collector.firstName} ${codCollection.collector.lastName}`.trim() ||
                        codCollection.collector.email
                      : '—'}
                  </DefinitionRow>
                  <DefinitionRow label="Collector email">
                    {codCollection?.collector?.email ?? '—'}
                  </DefinitionRow>
                </dl>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Customer" />
            <dl className="px-6 py-5">
              <DefinitionRow label="Name">
                {customerName(data.customer)}
              </DefinitionRow>
              <DefinitionRow label="Email">
                <span className="break-all">{data.customer.email}</span>
              </DefinitionRow>
              <DefinitionRow label="Customer id">
                <span className="break-all font-mono text-[12px]">
                  {data.customer.id}
                </span>
              </DefinitionRow>
            </dl>
            <div className="border-t border-line px-6 py-4">
              <Link
                to={`/admin/customers?id=${data.customer.id}`}
                className="inline-flex min-h-9 items-center text-[13px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Open customer lookup
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Shipping"
              hint="The address snapshot copied onto the order at checkout."
            />
            <address className="space-y-1 px-6 py-5 text-sm not-italic leading-relaxed text-graphite">
              <span className="block font-medium text-ink">
                {data.shippingRecipientName}
              </span>
              <span className="block">{data.shippingPhone}</span>
              {formatAdminOrderAddressLines(data).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </Panel>

          <Panel className="p-6">
            <p className="eyebrow text-graphite">Actions</p>
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">
              Cancelling releases the reserved stock. Shipping commits it. Both
              actions are final and are checked again by the server.
            </p>

            <div className="mt-5 space-y-4">
              {data.status === 'CONFIRMED' && (
                <section
                  aria-labelledby="delivery-assignment-title"
                  className="space-y-3 border-b border-line pb-5"
                >
                  <div>
                    <h2
                      id="delivery-assignment-title"
                      className="text-sm font-semibold text-ink"
                    >
                      Delivery assignment
                    </h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-graphite">
                      A confirmed order needs an active delivery staff
                      assignment before shipping.
                    </p>
                  </div>

                  {assignmentDataLoading && (
                    <p role="status" className="text-[12px] text-graphite">
                      Loading delivery assignment data…
                    </p>
                  )}

                  {deliveryOrder.error !== undefined && (
                    <InlineNotice
                      message={`Could not load assignment details: ${toUserMessage(deliveryOrder.error)}`}
                    />
                  )}

                  {deliveryStaff.error !== undefined && (
                    <InlineNotice
                      message={`Could not load active delivery staff: ${toUserMessage(deliveryStaff.error)}`}
                    />
                  )}

                  {!assignmentDataLoading &&
                    !assignmentDataError &&
                    currentAssignment !== undefined && (
                      <div className="text-[12px] leading-relaxed text-graphite">
                        {hasValidAssignment ? (
                          <p>
                            Assigned to{' '}
                            {currentAssignment.deliveryStaff.firstName}{' '}
                            {currentAssignment.deliveryStaff.lastName} (
                            {currentAssignment.status
                              .toLowerCase()
                              .replaceAll('_', ' ')}
                            ).
                          </p>
                        ) : (
                          <p role="alert">
                            An open assignment exists, but its delivery staff
                            member is not active. Resolve the assignment before
                            shipping.
                          </p>
                        )}
                      </div>
                    )}

                  {!assignmentDataLoading &&
                    !assignmentDataError &&
                    currentAssignment === undefined && (
                      <>
                        <div>
                          <label
                            htmlFor="delivery-staff"
                            className="mb-1.5 block text-[12px] font-medium text-ink"
                          >
                            Active delivery staff
                          </label>
                          <select
                            id="delivery-staff"
                            value={selectedStaffId}
                            onChange={(event) => {
                              setSelectedStaffId(event.target.value)
                              setAssignmentValidationError('')
                              assignMutation.reset()
                            }}
                            disabled={
                              actionsBusy || deliveryStaff.data?.length === 0
                            }
                            className="min-h-10 w-full border border-line bg-paper px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select delivery staff</option>
                            {deliveryStaff.data?.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.firstName} {staff.lastName} ·{' '}
                                {staff.email}
                              </option>
                            ))}
                          </select>
                          {deliveryStaff.data?.length === 0 && (
                            <p className="mt-2 text-[12px] text-graphite">
                              No active delivery staff are available.
                            </p>
                          )}
                        </div>

                        {assignmentValidationError !== '' && (
                          <p role="alert" className="text-[12px] text-signal">
                            {assignmentValidationError}
                          </p>
                        )}

                        {assignMutation.error !== undefined && (
                          <InlineNotice
                            message={toUserMessage(assignMutation.error)}
                            onDismiss={assignMutation.reset}
                          />
                        )}

                        <Action
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={
                            actionsBusy ||
                            !assignAllowed ||
                            deliveryStaff.data?.length === 0
                          }
                          onClick={() => void requestAssignment()}
                        >
                          <UserPlus size={15} strokeWidth={1.7} aria-hidden />
                          {assignMutation.isPending
                            ? 'Assigning delivery staff'
                            : 'Assign delivery staff'}
                        </Action>
                        <p className="text-[12px] leading-relaxed text-graphite">
                          {assignMutation.isPending
                            ? 'Saving assignment…'
                            : 'Only active delivery staff can be assigned. An existing active assignment cannot be duplicated.'}
                        </p>
                      </>
                    )}
                </section>
              )}

              <div>
                <Action
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!codConfirmationAllowed || actionsBusy}
                  onClick={() => void requestConfirmCod()}
                >
                  <CheckCircle size={15} strokeWidth={1.7} aria-hidden />
                  {confirmCodMutation.isPending
                    ? 'Confirming COD'
                    : 'Confirm COD Order'}
                </Action>
                <p className="mt-2 text-[12px] leading-relaxed text-graphite">
                  {codConfirmationAllowed
                    ? 'Available for pending COD orders. Payment stays unpaid until collection.'
                    : 'Available only for pending COD orders.'}
                </p>
              </div>

              <div>
                <Action
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!cancelAllowed || actionsBusy}
                  onClick={() => void requestCancel()}
                >
                  <XCircle size={15} strokeWidth={1.7} aria-hidden />
                  {cancelMutation.isPending ? 'Cancelling' : 'Cancel order'}
                </Action>
                <p className="mt-2 text-[12px] leading-relaxed text-graphite">
                  {cancelBlockedReason(facts) ??
                    'Available while the order is pending and has no verified payment.'}
                </p>
              </div>

              <div>
                <Action
                  size="sm"
                  className="w-full"
                  disabled={!shipAllowed || actionsBusy}
                  onClick={() => void requestShip()}
                >
                  <Truck size={15} strokeWidth={1.7} aria-hidden />
                  {shipMutation.isPending ? 'Shipping' : 'Mark as shipped'}
                </Action>
                <p className="mt-2 text-[12px] leading-relaxed text-graphite">
                  {shipBlockedReason(facts) ??
                    (assignmentDataError
                      ? 'Assignment data could not be verified. Refresh before shipping.'
                      : assignmentDataLoading
                        ? 'Loading assignment data before shipping.'
                        : hasValidAssignment
                          ? null
                          : 'Assign an active delivery staff member before shipping.') ??
                    (data.paymentMethod === 'COD'
                      ? 'Available while the COD order is confirmed. Payment remains unpaid until collection.'
                      : 'Available while the order is confirmed with a verified payment.')}
                </p>
              </div>
            </div>

            {cancelMutation.error !== undefined && (
              <InlineNotice
                className="mt-5"
                message={toUserMessage(cancelMutation.error)}
                onDismiss={cancelMutation.reset}
              />
            )}

            {confirmCodMutation.error !== undefined && (
              <InlineNotice
                className="mt-5"
                message={toUserMessage(confirmCodMutation.error)}
                onDismiss={confirmCodMutation.reset}
              />
            )}

            {shipMutation.error !== undefined && (
              <InlineNotice
                className="mt-5"
                message={toUserMessage(shipMutation.error)}
                onDismiss={shipMutation.reset}
              />
            )}

            {assignMutation.error !== undefined &&
              data.status !== 'CONFIRMED' && (
                <InlineNotice
                  className="mt-5"
                  message={toUserMessage(assignMutation.error)}
                  onDismiss={assignMutation.reset}
                />
              )}

            <button
              type="button"
              onClick={() => {
                cancelMutation.reset()
                shipMutation.reset()
                assignMutation.reset()
                order.refetch()
                deliveryOrder.refetch()
                deliveryStaff.refetch()
              }}
              disabled={
                order.isRefreshing ||
                deliveryOrder.isRefreshing ||
                deliveryStaff.isRefreshing
              }
              className="mt-5 inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={13} strokeWidth={1.7} aria-hidden />
              Refresh order and assignment
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}
