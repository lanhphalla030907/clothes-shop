import { useContext } from 'react'
import { AddressActionsContext, type AddressActions } from './addressActions'

export const useAddressActions = (): AddressActions => {
  const value = useContext(AddressActionsContext)

  if (!value) throw new Error('useAddressActions must be used within AddressActionsProvider')

  return value
}