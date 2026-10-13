import { useEstablishment } from '../contexts/EstablishmentContext'
import { supabase } from '../services/supabase'
import { useState } from 'react'
import ServicesPage from './ServicesPage'

function DashboardPage() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'services'>('dashboard')
  const {
    establishment,
    loading,
    error,
  } = useEstablishment()

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
<button
  type="button"
  onClick={() =>
    setCurrentPage(currentPage === 'dashboard' ? 'services' : 'dashboard')
  }
>
  {currentPage === 'dashboard' ? 'Serviços' : 'Voltar ao Dashboard'}
</button>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>
{currentPage === 'services' && <ServicesPage />}
      {error && <p>{error}</p>}

      {establishment && currentPage === 'dashboard' && (
        <section>
          <h2>Dashboard</h2>

          <p>
            Bem-vindo ao painel do seu estabelecimento.
          </p>

          <p>
            Identificador: <strong>{establishment.slug}</strong>
          </p>

          <p>
            Idioma/região: <strong>{establishment.locale}</strong>
          </p>

          <p>
            Moeda: <strong>{establishment.currency}</strong>
          </p>

          <p>
            Fuso horário: <strong>{establishment.timezone}</strong>
          </p>
        </section>
      )}
    </main>
  )
}

export default DashboardPage