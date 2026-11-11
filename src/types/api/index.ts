/**
 * Typed models for every endpoint the client calls.
 *
 * Each file mirrors one backend DTO and says where the values come from. Money is
 * always a fixed two-decimal string and timestamps are always ISO-8601 text,
 * because that is what the server sends — modelling them as `number` and `Date`
 * would be a lie the compiler could not catch.
 */

export * from './common'
export * from './catalogue'
export * from './posters'
export * from './collections'
export * from './adminProducts'
export * from './adminCatalogue'
export * from './adminShippingProviders'
export * from './administrativeLocations'
export * from './codAreas'
export * from './adminUsers'
export * from './cart'
export * from './checkout'
export * from './wishlist'
export * from './addresses'
export * from './orders'
export * from './adminOrders'
export * from './delivery'
export * from './adminCodReconciliation'
export * from './adminCustomers'
export * from './payments'
export * from './promotions'
export * from './finance'
export * from './feedback'
