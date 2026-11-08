import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../services/supabase'
import {
  EstablishmentContext,
  type Establishment,
} from './EstablishmentContextValue'

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