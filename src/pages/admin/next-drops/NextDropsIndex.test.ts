import { describe, expect, it } from 'vitest'
import {
  destinationUrl,
  inferDestinationType,
  resolveStorefrontUrl,
} from './destination'

const collections = [
  { id: 'collection-1', slug: 'summer-sale' },
  { id: 'collection-2', slug: 'winter-collection' },
]

const products = [{ id: 'product-1' }, { id: 'product-2' }]

describe('destinationUrl', () => {
  it('generates a collection URL from a selected collection', () => {
    const url = destinationUrl(
      'collection',
      'collection-1',
      null,
      '',
      collections,
      products,
    )
    expect(new URL(url).origin).toBe(window.location.origin)
    expect(new URL(url).pathname).toBe('/collections/summer-sale')
  })

  it('returns empty string when collection type but no collection selected', () => {
    const url = destinationUrl('collection', null, null, '', collections, products)
    expect(url).toBe('')
  })

  it('generates a product URL from a selected product', () => {
    const url = destinationUrl(
      'product',
      null,
      'product-1',
      '',
      collections,
      products,
    )
    expect(new URL(url).origin).toBe(window.location.origin)
    expect(new URL(url).pathname).toBe('/product/product-1')
  })

  it('returns empty string when product type but no product selected', () => {
    const url = destinationUrl('product', null, null, '', collections, products)
    expect(url).toBe('')
  })

  it('generates the register URL', () => {
    const url = destinationUrl('register', null, null, '', collections, products)
    expect(new URL(url).origin).toBe(window.location.origin)
    expect(new URL(url).pathname).toBe('/register')
  })

  it('generates the shop-all URL', () => {
    const url = destinationUrl('shop-all', null, null, '', collections, products)
    expect(new URL(url).origin).toBe(window.location.origin)
    expect(new URL(url).pathname).toBe('/shop')
  })

  it('uses the custom URL as-is', () => {
    const url = destinationUrl(
      'custom',
      null,
      null,
      'https://external.example.com/promo',
      collections,
      products,
    )
    expect(url).toBe('https://external.example.com/promo')
  })

  it('resolves to an absolute URL the backend @IsUrl() validator accepts', () => {
    const url = destinationUrl('register', null, null, '', collections, products)
    const parsed = new URL(url)
    expect(parsed.protocol).toMatch(/^https?:$/)
    expect(parsed.origin).toBe(window.location.origin)
  })
})

describe('inferDestinationType', () => {
  const origin = window.location.origin

  it('infers collection from a relative URL', () => {
    expect(inferDestinationType('/collections/summer-sale')).toBe('collection')
  })

  it('infers collection from an absolute URL', () => {
    expect(inferDestinationType(`${origin}/collections/summer-sale`)).toBe(
      'collection',
    )
  })

  it('infers product from a relative URL', () => {
    expect(inferDestinationType('/product/product-1')).toBe('product')
  })

  it('infers product from an absolute URL', () => {
    expect(inferDestinationType(`${origin}/product/product-1`)).toBe('product')
  })

  it('infers register from a relative URL', () => {
    expect(inferDestinationType('/register')).toBe('register')
  })

  it('infers register from an absolute URL', () => {
    expect(inferDestinationType(`${origin}/register`)).toBe('register')
  })

  it('infers shop-all from a relative URL', () => {
    expect(inferDestinationType('/shop')).toBe('shop-all')
  })

  it('infers shop-all from an absolute URL', () => {
    expect(inferDestinationType(`${origin}/shop`)).toBe('shop-all')
  })

  it('infers custom for an external URL', () => {
    expect(inferDestinationType('https://external.example.com/promo')).toBe(
      'custom',
    )
  })

  it('infers custom for an unrecognized path', () => {
    expect(inferDestinationType('/about')).toBe('custom')
  })
})

describe('resolveStorefrontUrl', () => {
  it('resolves a path to an absolute URL using the current origin', () => {
    const url = resolveStorefrontUrl('/collections/summer-sale')
    expect(url).toBe(`${window.location.origin}/collections/summer-sale`)
  })

  it('resolves register and shop paths to absolute URLs', () => {
    expect(resolveStorefrontUrl('/register')).toBe(
      `${window.location.origin}/register`,
    )
    expect(resolveStorefrontUrl('/shop')).toBe(`${window.location.origin}/shop`)
  })
})

describe('submitted payload', () => {
  const origin = window.location.origin

  it('collection destination submits an absolute collection URL', () => {
    const url = destinationUrl(
      'collection',
      'collection-1',
      null,
      '',
      collections,
      products,
    )
    expect(new URL(url).origin).toBe(origin)
    expect(new URL(url).pathname).toBe('/collections/summer-sale')
  })

  it('product destination submits an absolute product URL', () => {
    const url = destinationUrl(
      'product',
      null,
      'product-1',
      '',
      collections,
      products,
    )
    expect(new URL(url).origin).toBe(origin)
    expect(new URL(url).pathname).toBe('/product/product-1')
  })

  it('register destination submits an absolute register URL', () => {
    const url = destinationUrl('register', null, null, '', collections, products)
    expect(new URL(url).origin).toBe(origin)
    expect(new URL(url).pathname).toBe('/register')
  })

  it('shop-all destination submits an absolute shop URL', () => {
    const url = destinationUrl('shop-all', null, null, '', collections, products)
    expect(new URL(url).origin).toBe(origin)
    expect(new URL(url).pathname).toBe('/shop')
  })

  it('custom destination submits the provided HTTPS URL', () => {
    const url = destinationUrl(
      'custom',
      null,
      null,
      'https://external.example.com/promo',
      collections,
      products,
    )
    expect(url).toBe('https://external.example.com/promo')
  })
})

describe('submitted payload contains no Markdown', () => {
  const origin = window.location.origin

  it('collection destination produces a plain URL string, not Markdown', () => {
    const url = destinationUrl(
      'collection',
      'collection-1',
      null,
      '',
      collections,
      products,
    )
    expect(url).not.toMatch(/^\[.*\]\(.*\)$/)
    expect(url).not.toContain(']( ')
    expect(url).not.toContain('](')
    expect(new URL(url)).toBeInstanceOf(URL)
    expect(url).toBe(`${origin}/collections/summer-sale`)
  })

  it('product destination produces a plain URL string, not Markdown', () => {
    const url = destinationUrl(
      'product',
      null,
      'product-1',
      '',
      collections,
      products,
    )
    expect(url).not.toMatch(/^\[.*\]\(.*\)$/)
    expect(url).not.toContain('](')
    expect(new URL(url)).toBeInstanceOf(URL)
    expect(url).toBe(`${origin}/product/product-1`)
  })

  it('register destination produces a plain URL string, not Markdown', () => {
    const url = destinationUrl('register', null, null, '', collections, products)
    expect(url).not.toMatch(/^\[.*\]\(.*\)$/)
    expect(url).not.toContain('](')
    expect(new URL(url)).toBeInstanceOf(URL)
    expect(url).toBe(`${origin}/register`)
  })

  it('shop-all destination produces a plain URL string, not Markdown', () => {
    const url = destinationUrl('shop-all', null, null, '', collections, products)
    expect(url).not.toMatch(/^\[.*\]\(.*\)$/)
    expect(url).not.toContain('](')
    expect(new URL(url)).toBeInstanceOf(URL)
    expect(url).toBe(`${origin}/shop`)
  })

  it('custom destination produces a plain URL string, not Markdown', () => {
    const url = destinationUrl(
      'custom',
      null,
      null,
      'https://external.example.com/promo',
      collections,
      products,
    )
    expect(url).not.toMatch(/^\[.*\]\(.*\)$/)
    expect(url).not.toContain('](')
    expect(new URL(url)).toBeInstanceOf(URL)
    expect(url).toBe('https://external.example.com/promo')
  })

  it('rejects any URL that looks like a Markdown link', () => {
    const markdownUrl = '[http://localhost:5173/collections/fafasf](http://localhost:5173/collections/fafasf)'
    expect(markdownUrl).toMatch(/^\[.*\]\(.*\)$/)
    expect(() => new URL(markdownUrl)).toThrow()
  })
})
