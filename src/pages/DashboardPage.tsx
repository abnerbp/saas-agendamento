import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

type Establishment = {
  id: string
  name: string
  slug: string
}

function DashboardPage() {
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadEstablishment() {
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, slug')
        .limit(1)
        .maybeSingle()

      if (error) {
        setMessage(`Erro ao carregar estabelecimento: ${error.message}`)
        setLoading(false)
        return
      }

      if (!data) {
        setMessage('Nenhum estabelecimento encontrado para este usuário.')
        setLoading(false)
        return
      }

      setEstablishment(data)
      setLoading(false)
    }

    loadEstablishment()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <p>Carregando...</p>
  }

  return (
    <main>
      <header>
        <p>Painel de gestão</p>

        <h1>
          {establishment
            ? establishment.name
            : 'Estabelecimento'}
        </h1>

        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      {message && <p>{message}</p>}

      {establishment && (
        <section>
          <h2>Dashboard</h2>

          <p>
            Bem-vindo ao painel do seu estabelecimento.
          </p>

          <p>
            Identificador: <strong>{establishment.slug}</strong>
          </p>
        </section>
      )}
    </main>
  )
}

export default DashboardPage