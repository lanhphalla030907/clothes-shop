import { describe, expect, it } from 'vitest'
import { landingPathFor, safeReturnTo } from './returnTo'

describe('landingPathFor', () => {
  it('sends an administrator to the admin landing screen', () => {
    expect(landingPathFor('ADMIN')).toBe('/admin')
  })

  it('sends a customer to the account dashboard', () => {
    expect(landingPathFor('CUSTOMER')).toBe('/account')
  })

  it('sends delivery staff to the delivery workspace', () => {
    expect(landingPathFor('DELIVERY_STAFF')).toBe('/delivery')
  })

  it('treats an unknown role as a customer', () => {
    expect(landingPathFor(null)).toBe('/account')
    expect(landingPathFor(undefined)).toBe('/account')
  })
})

describe('safeReturnTo', () => {
  it('uses the role-specific landing screen when no destination was requested', () => {
    expect(safeReturnTo(null, 'ADMIN')).toBe('/admin')
    expect(safeReturnTo(undefined, 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo(undefined, 'DELIVERY_STAFF')).toBe('/delivery')
  })

  it('preserves a requested admin destination for an administrator', () => {
    expect(safeReturnTo('/admin/products', 'ADMIN')).toBe('/admin/products')
    expect(safeReturnTo('/admin/products/new?draft=1', 'ADMIN')).toBe('/admin/products/new?draft=1')
  })

  it('never returns a customer to an admin destination', () => {
    expect(safeReturnTo('/admin', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/admin/products', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/admin?tab=products', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/ADMIN/products/', 'CUSTOMER')).toBe('/account')
  })

  it('only returns delivery staff to a delivery destination', () => {
    expect(safeReturnTo('/delivery', 'DELIVERY_STAFF')).toBe('/delivery')
    expect(safeReturnTo('/delivery/assignments', 'DELIVERY_STAFF')).toBe('/delivery/assignments')
    expect(safeReturnTo('/delivery', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/delivery/assignments', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/admin', 'DELIVERY_STAFF')).toBe('/delivery')
  })

  it('preserves ordinary account destinations for a customer', () => {
    expect(safeReturnTo('/account', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/account/bag', 'CUSTOMER')).toBe('/account/bag')
  })

  it('keeps an administrator out of the customer account area after signing in', () => {
    expect(safeReturnTo('/account', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/account/', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/account/bag', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/account/orders?status=paid', 'ADMIN')).toBe('/admin')
  })

  it('still preserves non-account storefront destinations for an administrator', () => {
    expect(safeReturnTo('/shop', 'ADMIN')).toBe('/shop')
    expect(safeReturnTo('/cart', 'ADMIN')).toBe('/cart')
  })

  it('rejects off-site destinations', () => {
    expect(safeReturnTo('https://evil.example', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('//evil.example', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/\\evil.example', 'CUSTOMER')).toBe('/account')
  })

  it('refuses the auth pages themselves, so signing in cannot loop', () => {
    expect(safeReturnTo('/login', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/login?from=%2Faccount', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/register', 'CUSTOMER')).toBe('/account')
    expect(safeReturnTo('/LOGIN/', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/Register', 'CUSTOMER')).toBe('/account')
  })
})
