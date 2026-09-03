const UK_LOCALE = 'en-GB'

export function formatDate(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(UK_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(UK_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(
  amount: number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const value = Number(amount ?? 0)
  if (Number.isNaN(value)) return '£0.00'

  return new Intl.NumberFormat(UK_LOCALE, {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatCurrencyWhole(amount: number | null | undefined): string {
  return formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
