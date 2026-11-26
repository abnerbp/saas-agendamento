import { useState, type ReactNode } from 'react'
import { AppShell, type AppPage } from '../components/AppShell'
import { Button, Card, EmptyState, LoadingState, PageTitle } from '../components/ui'
import { useEstablishment } from '../contexts/EstablishmentContextValue'
import { supabase } from '../services/supabase'
import ServicesPage from './ServicesPage'
import ProfessionalsPage from '../ProfessionalsPage'
import { supportWhatsappUrl } from '../config/support'

function DashboardPage() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home')
  const { establishment, loading, error } = useEstablishment()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <AppShell
        establishmentName={establishment?.name ?? ''}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        <LoadingState label="Carregando estabelecimento..." />
      </AppShell>
    )
  }

  let pageContent: ReactNode

  switch (currentPage) {
    case 'services':
      pageContent = <ServicesPage />
      break
    case 'professionals':
      pageContent = (
        <>
          <div className="back-link professionals-back-link">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCurrentPage('more')}
            >
              Voltar ao menu Mais
            </Button>
          </div>
          <ProfessionalsPage />
        </>
      )
      break
    case 'agenda':
      pageContent = (
        <main className="page-container">
          <PageTitle
            title="Agenda"
            description="Acompanhe os horários e atendimentos do seu estabelecimento."
          />
          <Card>
            <EmptyState
              title="Agenda em desenvolvimento"
              description="A visualização e o gerenciamento de agendamentos estarão disponíveis em uma próxima etapa."
            />
          </Card>
        </main>
      )
      break
    case 'customers':
      pageContent = (
        <main className="page-container">
          <PageTitle
            title="Clientes"
            description="Consulte e organize os clientes do seu estabelecimento."
          />
          <Card>
            <EmptyState
              title="Clientes em desenvolvimento"
              description="O cadastro e o gerenciamento de clientes estarão disponíveis em uma próxima etapa."
            />
          </Card>
        </main>
      )
      break
    case 'more':
      pageContent = (
        <main className="page-container">
          <PageTitle
            title="Mais"
            description="Acesse outras ferramentas de gestão."
          />
          <Card className="menu-card">
            <div>
              <h2>Profissionais e horários</h2>
              <p>Gerencie a equipe e os horários de trabalho.</p>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCurrentPage('professionals')}
            >
              Abrir
            </Button>
          </Card>
          {supportWhatsappUrl && (
            <Card className="menu-card">
              <div>
                <h2>Ajuda e suporte</h2>
                <p>Fale conosco pelo WhatsApp.</p>
              </div>
              <a
                href={supportWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-button ui-button--secondary"
                aria-label="Abrir Ajuda e suporte no WhatsApp"
              >
                Abrir
              </a>
            </Card>
          )}
        </main>
      )
      break
    default:
      pageContent = (
        <main className="page-container">
          <PageTitle
            title={`Olá${establishment?.name ? `, ${establishment.name}` : ''}`}
            description="Bem-vindo ao seu painel de gestão."
          />
          {establishment ? (
            <Card className="establishment-card">
              <div className="card-heading">
                <span className="eyebrow">Seu estabelecimento</span>
                <h2>{establishment.name}</h2>
              </div>
              <dl className="establishment-details">
                <div>
                  <dt>Identificador</dt>
                  <dd>{establishment.slug}</dd>
                </div>
                <div>
                  <dt>Idioma e região</dt>
                  <dd>{establishment.locale}</dd>
                </div>
                <div>
                  <dt>Moeda</dt>
                  <dd>{establishment.currency}</dd>
                </div>
                <div>
                  <dt>Fuso horário</dt>
                  <dd>{establishment.timezone}</dd>
                </div>
              </dl>
            </Card>
          ) : (
            <Card>
              <EmptyState
                title="Estabelecimento indisponível"
                description="Não foi possível carregar os dados deste estabelecimento."
              />
            </Card>
          )}
        </main>
      )
  }

  return (
    <AppShell
      establishmentName={establishment?.name ?? ''}
      activePage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {pageContent}
    </AppShell>
  )
}

export default DashboardPage
