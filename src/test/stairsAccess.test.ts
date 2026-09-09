import { describe, expect, it } from 'vitest'
import {
  formatAccessFromAdmin,
  formatStairsDisplay,
  normalizeStairsForStorage,
  parseStairsAccess,
} from '../utils/stairsAccess'

describe('stairsAccess', () => {
  it('maps calculator codes to consistent labels', () => {
    expect(formatStairsDisplay(0)).toBe('Ground floor')
    expect(formatStairsDisplay('0')).toBe('Ground floor')
    expect(formatStairsDisplay(1)).toBe('1 flight / Lift')
    expect(formatStairsDisplay('1')).toBe('1 flight / Lift')
    expect(formatStairsDisplay(2)).toBe('2 flights of stairs')
    expect(formatStairsDisplay('6')).toBe('6 flights of stairs')
  })

  it('keeps admin labels consistent', () => {
    expect(formatStairsDisplay('Ground floor')).toBe('Ground floor')
    expect(formatStairsDisplay('Lift')).toBe('Lift')
    expect(formatStairsDisplay('1 flight of stairs')).toBe('1 flight of stairs')
    expect(formatStairsDisplay('3 flights of stairs')).toBe('3 flights of stairs')
  })

  it('normalizes for storage', () => {
    expect(normalizeStairsForStorage('0')).toBe('Ground floor')
    expect(normalizeStairsForStorage('1')).toBe('1 flight / Lift')
    expect(normalizeStairsForStorage('2')).toBe('2 flights of stairs')
  })

  it('formats admin form selections', () => {
    expect(formatAccessFromAdmin('ground')).toBe('Ground floor')
    expect(formatAccessFromAdmin('lift')).toBe('Lift')
    expect(formatAccessFromAdmin('stairs', 1)).toBe('1 flight of stairs')
    expect(formatAccessFromAdmin('stairs', 4)).toBe('4 flights of stairs')
  })

  it('parses stored values for edit form', () => {
    expect(parseStairsAccess('0')).toEqual({ access: 'ground', stairsCount: 1 })
    expect(parseStairsAccess('1')).toEqual({ access: 'stairs', stairsCount: 1 })
    expect(parseStairsAccess('Lift')).toEqual({ access: 'lift', stairsCount: 1 })
    expect(parseStairsAccess('2 flights of stairs')).toEqual({ access: 'stairs', stairsCount: 2 })
  })
})
