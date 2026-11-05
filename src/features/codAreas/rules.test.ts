import { describe, expect, it } from 'vitest'
import type { CodArea, CodAreaFormValues } from '@/types/api'
import {
  buildCreateCodAreaRequest,
  buildUpdateCodAreaRequest,
  validateCodArea,
} from './rules'

const area: CodArea = {
  id: 'area-1',
  code: 'PHNOM-PENH',
  name: 'Phnom Penh',
  codEnabled: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

describe('COD area form rules', () => {
  it('requires a valid canonical code and a display name', () => {
    expect(validateCodArea({ code: '', name: '' })).toEqual({
      code: 'An area code is required',
      name: 'An area name is required',
    })
    expect(validateCodArea({ code: 'bad_code', name: 'Phnom Penh' }).code).toMatch(
      /single hyphens/,
    )
  })

  it('normalizes code and trims the display name for creation', () => {
    const values: CodAreaFormValues = {
      code: ' phnom-penh ',
      name: ' Phnom Penh ',
    }

    expect(buildCreateCodAreaRequest(values)).toEqual({
      code: 'PHNOM-PENH',
      name: 'Phnom Penh',
    })
  })

  it('only updates the display name when it changed', () => {
    expect(buildUpdateCodAreaRequest({ code: area.code, name: area.name }, area)).toEqual({})
    expect(
      buildUpdateCodAreaRequest(
        { code: area.code, name: 'Phnom Penh Municipality' },
        area,
      ),
    ).toEqual({ name: 'Phnom Penh Municipality' })
  })
})
