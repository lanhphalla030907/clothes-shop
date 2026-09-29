const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export const formatPrice = (value: number): string => currency.format(value)

export const padIndex = (index: number): string => String(index + 1).padStart(2, '0')
