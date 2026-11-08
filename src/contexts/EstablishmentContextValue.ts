import { createContext, useContext } from 'react'

export type Establishment = {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  locale: string
}

export type EstablishmentContextType = {
  establishment: Establishment | null
  loading: boolean
  error: string | null
}

export const EstablishmentContext = createContext<
  EstablishmentContextType | undefined
>(undefined)

export function useEstablishment() {
  const context = useContext(EstablishmentContext)

  if (!context) {
    throw new Error(
      'useEstablishment deve ser usado dentro de EstablishmentProvider.',
    )
  }

  return context
}
