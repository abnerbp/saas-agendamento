import { useEstablishment } from '../contexts/EstablishmentContext'
import { supabase } from '../services/supabase'
import { useState } from 'react'
import ServicesPage from './ServicesPage'
import ProfessionalsPage from '../ProfessionalsPage'

type DashboardSection = 'dashboard' | 'services' | 'professionals'

function DashboardPage() {
  const [currentPage, setCurrentPage] =
    useState<DashboardSection>('dashboard')
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
        <nav aria-label="Navegação do painel">
          <button
            type="button"
            onClick={() => setCurrentPage('dashboard')}
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('services')}
            aria-current={currentPage === 'services' ? 'page' : undefined}
          >
            Serviços
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('professionals')}
            aria-current={currentPage === 'professionals' ? 'page' : undefined}
          >
            Profissionais
          </button>
        </nav>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>
      {currentPage === 'services' && <ServicesPage />}
      {currentPage === 'professionals' && <ProfessionalsPage />}
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