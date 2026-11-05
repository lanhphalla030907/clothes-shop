export type AdministrativeLevel = 1 | 2 | 3

export interface AdministrativeLocation {
  pcode: string
  parentPcode: string | null
  adminLevel: number
  nameEn: string
  nameKm: string | null
}

export type AdministrativeLocationPath = AdministrativeLocation[]

export interface AdministrativeLocationSnapshotEntry {
  adminLevel: AdministrativeLevel
  nameEn: string
  nameKm: string | null
}

export const administrativeLocationName = (
  location: Pick<AdministrativeLocation, 'nameEn' | 'nameKm'>,
): string =>
  location.nameKm ? `${location.nameEn} / ${location.nameKm}` : location.nameEn

export interface AdminCodEligibility extends AdministrativeLocation {
  codEnabledOverride: boolean | null
  codEnabled: boolean
}

export interface UpdateCodEligibilityRequest {
  codEnabledOverride: boolean | null
}
