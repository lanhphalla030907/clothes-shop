import { apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CreateShippingProviderRequest,
  PublicShippingProvider,
  ShippingProvider,
  UpdateShippingProviderRequest,
  UUID,
} from '@/types/api'

export const fetchShippingProviders = (signal?: AbortSignal): Promise<PublicShippingProvider[]> =>
  apiGetList<PublicShippingProvider>(API.shippingProviders, { signal })

export const fetchAdminShippingProviders = (
  signal?: AbortSignal,
): Promise<ShippingProvider[]> =>
  apiGetList<ShippingProvider>(API.adminShippingProviders, { signal })

export const createShippingProvider = (
  body: CreateShippingProviderRequest,
): Promise<ShippingProvider> =>
  apiPost<ShippingProvider>(API.adminShippingProviders, body).then(requireProvider)

export const updateShippingProvider = (
  id: UUID,
  body: UpdateShippingProviderRequest,
): Promise<ShippingProvider> =>
  apiPatch<ShippingProvider>(`${API.adminShippingProviders}/${id}`, body).then(requireProvider)

const requireProvider = (provider: ShippingProvider | undefined): ShippingProvider => {
  if (!provider) throw new Error('The shipping provider was not returned by the server.')
  return provider
}
