import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './ui'

export type AppPage =
  | 'home'
  | 'agenda'
  | 'customers'
  | 'services'
  | 'more'
  | 'professionals'

type NavItem = {
  page: Exclude<AppPage, 'professionals'>
  label: string
  icon: 'home' | 'calendar' | 'customers' | 'services' | 'more'
}

const navItems: NavItem[] = [
  { page: 'home', label: 'Início', icon: 'home' },
  { page: 'agenda', label: 'Agenda', icon: 'calendar' },
  { page: 'customers', label: 'Clientes', icon: 'customers' },
  { page: 'services', label: 'Serviços', icon: 'services' },
  { page: 'more', label: 'Mais', icon: 'more' },
]

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase(
      'pt-BR',
    )
  }

  return (words[0]?.slice(0, 2) || 'AH').toLocaleUpperCase('pt-BR')
}

function NavigationIcon({ name }: { name: NavItem['icon'] }) {
  const paths: Record<NavItem['icon'], ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" />
      </>
    ),
    services: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 4v16M8 9h13" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Navigation({
  activePage,
  onNavigate,
  className,
}: {
  activePage: AppPage
  onNavigate: (page: NavItem['page']) => void
  className: string
}) {
  return (
    <nav className={className} aria-label="Navegação principal">
      {navItems.map((item) => {
        const isActive =
          activePage === item.page ||
          (item.page === 'more' && activePage === 'professionals')

        return (
          <Button
            key={item.page}
            variant="quiet"
            className={`nav-item${isActive ? ' is-active' : ''}`}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(item.page)}
          >
            <NavigationIcon name={item.icon} />
            <span>{item.label}</span>
          </Button>
        )
      })}
    </nav>
  )
}

export function AppShell({
  establishmentName,
  activePage,
  onNavigate,
  onLogout,
  establishmentLogoUrl,
  children,
}: {
  establishmentName: string
  activePage: AppPage
  onNavigate: (page: NavItem['page']) => void
  onLogout: () => void
  establishmentLogoUrl?: string | null
  children: ReactNode
}) {
  const [establishmentLogoFailed, setEstablishmentLogoFailed] =
    useState(false)
  const [platformLogoFailed, setPlatformLogoFailed] = useState(false)

  useEffect(() => {
    setEstablishmentLogoFailed(false)
  }, [establishmentLogoUrl])

  const displayedEstablishmentName =
    establishmentName || 'Seu estabelecimento'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__identity">
          <span
            className="establishment-avatar"
            role="img"
            aria-label={`Identidade de ${displayedEstablishmentName}`}
          >
            {establishmentLogoUrl && !establishmentLogoFailed ? (
              <img
                src={establishmentLogoUrl}
                alt=""
                onError={() => setEstablishmentLogoFailed(true)}
              />
            ) : (
              <span aria-hidden="true">
                {getInitials(displayedEstablishmentName)}
              </span>
            )}
          </span>
          <span className="establishment-name" title={displayedEstablishmentName}>
            {displayedEstablishmentName}
          </span>
        </div>
        <div className="app-header__right">
          <span className="platform-logo">
            {platformLogoFailed ? (
              <span className="platform-logo__fallback">AcheiHora</span>
            ) : (
              <img
                src="/logo-acheihora.png"
                alt="AcheiHora"
                onError={() => setPlatformLogoFailed(true)}
              />
            )}
          </span>
          <Button
            variant="quiet"
            className="logout-button"
            type="button"
            onClick={onLogout}
          >
            Sair
          </Button>
        </div>
      </header>

      <div className="app-body">
        <aside className="desktop-sidebar">
          <Navigation
            activePage={activePage}
            onNavigate={onNavigate}
            className="desktop-nav"
          />
        </aside>
        <div className="app-content">{children}</div>
      </div>

      <Navigation
        activePage={activePage}
        onNavigate={onNavigate}
        className="mobile-bottom-nav"
      />
    </div>
  )
}
