import { describe, expect, it } from 'vitest'
import { landingPathFor, safeReturnTo } from './returnTo'

describe('landingPathFor', () => {
  it('sends an administrator to the admin landing screen', () => {
    expect(landingPathFor('ADMIN')).toBe('/admin')
  })

  it('sends a customer to the account dashboard', () => {
    expect(landingPathFor('CUSTOMER')).toBe('/dashboard')
  })

  it('sends delivery staff to the delivery workspace', () => {
    expect(landingPathFor('DELIVERY_STAFF')).toBe('/delivery')
  })

  it('treats an unknown role as a customer', () => {
    expect(landingPathFor(null)).toBe('/dashboard')
    expect(landingPathFor(undefined)).toBe('/dashboard')
  })
})

describe('safeReturnTo', () => {
  it('uses the role-specific landing screen when no destination was requested', () => {
    expect(safeReturnTo(null, 'ADMIN')).toBe('/admin')
    expect(safeReturnTo(undefined, 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo(undefined, 'DELIVERY_STAFF')).toBe('/delivery')
  })

  it('preserves a requested admin destination for an administrator', () => {
    expect(safeReturnTo('/admin/products', 'ADMIN')).toBe('/admin/products')
    expect(safeReturnTo('/admin/products/new?draft=1', 'ADMIN')).toBe('/admin/products/new?draft=1')
  })

  it('never returns a customer to an admin destination', () => {
    expect(safeReturnTo('/admin', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/admin/products', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/admin?tab=products', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/ADMIN/products/', 'CUSTOMER')).toBe('/dashboard')
  })

  it('only returns delivery staff to a delivery destination', () => {
    expect(safeReturnTo('/delivery', 'DELIVERY_STAFF')).toBe('/delivery')
    expect(safeReturnTo('/delivery/assignments', 'DELIVERY_STAFF')).toBe('/delivery/assignments')
    expect(safeReturnTo('/delivery', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/delivery/assignments', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/admin', 'DELIVERY_STAFF')).toBe('/delivery')
  })

  it('preserves ordinary account destinations for a customer', () => {
    expect(safeReturnTo('/dashboard', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/dashboard/bag', 'CUSTOMER')).toBe('/dashboard/bag')
  })

  it('keeps an administrator out of the customer account area after signing in', () => {
    expect(safeReturnTo('/dashboard', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/dashboard/', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/dashboard/bag', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/dashboard/orders?status=paid', 'ADMIN')).toBe('/admin')
  })

  it('still preserves non-account storefront destinations for an administrator', () => {
    expect(safeReturnTo('/shop', 'ADMIN')).toBe('/shop')
    expect(safeReturnTo('/cart', 'ADMIN')).toBe('/cart')
  })

  it('rejects off-site destinations', () => {
    expect(safeReturnTo('https://evil.example', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('//evil.example', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/\\evil.example', 'CUSTOMER')).toBe('/dashboard')
  })

  it('refuses the auth pages themselves, so signing in cannot loop', () => {
    expect(safeReturnTo('/login', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/login?from=%2Fdashboard', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/register', 'CUSTOMER')).toBe('/dashboard')
    expect(safeReturnTo('/LOGIN/', 'ADMIN')).toBe('/admin')
    expect(safeReturnTo('/Register', 'CUSTOMER')).toBe('/dashboard')
  })
})
