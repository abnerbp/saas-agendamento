import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../services/supabase'

export type Establishment = {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  locale: string
}

type EstablishmentContextType = {
  establishment: Establishment | null
  loading: boolean
  error: string | null
}

const EstablishmentContext = createContext<
  EstablishmentContextType | undefined
>(undefined)

type EstablishmentProviderProps = {
  children: ReactNode
}

export function EstablishmentProvider({
  children,
}: EstablishmentProviderProps) {
  const [establishment, setEstablishment] =
    useState<Establishment | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEstablishment() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, slug, timezone, currency, locale')
        .limit(1)
        .maybeSingle()

      if (error) {
        setEstablishment(null)
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data) {
        setEstablishment(null)
        setError('Nenhum estabelecimento encontrado para este usuário.')
        setLoading(false)
        return
      }

      setEstablishment(data)
      setLoading(false)
    }

    loadEstablishment()
  }, [])

  return (
    <EstablishmentContext.Provider
      value={{
        establishment,
        loading,
        error,
      }}
    >
      {children}
    </EstablishmentContext.Provider>
  )
}

export function useEstablishment() {
  const context = useContext(EstablishmentContext)

  if (!context) {
    throw new Error(
      'useEstablishment deve ser usado dentro de EstablishmentProvider.',
    )
  }

  return context
}