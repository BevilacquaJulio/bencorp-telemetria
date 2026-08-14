import {
  CaretDownIcon,
  ListIcon,
  QueueIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UserGearIcon,
  UsersThreeIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import compactLogo from '../../assets/bencorp.png'
import { formatRole, initials } from '../../lib/format'
import { useAuth } from '../../features/auth/auth-context'

type NavigationItem = {
  to: string
  label: string
  description: string
  icon: Icon
}

const clinicalNavigation: NavigationItem[] = [
  {
    to: '/fila',
    label: 'Fila de atendimentos',
    description: 'Demanda assistencial',
    icon: QueueIcon,
  },
  {
    to: '/pacientes',
    label: 'Pacientes',
    description: 'Histórico autorizado',
    icon: UsersThreeIcon,
  },
]

const adminNavigation: NavigationItem[] = [
  {
    to: '/usuarios',
    label: 'Usuários e acessos',
    description: 'Perfis profissionais',
    icon: UserGearIcon,
  },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigation = user?.papel === 'ADMIN' ? adminNavigation : clinicalNavigation

  if (!user) return null

  const sidebar = (
    <>
      <div className="sidebar__brand">
        <img src={compactLogo} alt="BenCorp" />
        <span>PAD</span>
      </div>
      <div className="sidebar__workspace">
        <span>Ambiente profissional</span>
        <strong>Pronto Atendimento Digital</strong>
      </div>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        <p>Menu</p>
        {navigation.map(({ to, label, description, icon: NavigationIcon }) => (
          <NavLink
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'is-active' : ''}`
            }
            to={to}
            key={to}
            onClick={() => setMobileOpen(false)}
          >
            <span className="sidebar-link__icon" aria-hidden="true">
              <NavigationIcon size={21} weight="duotone" />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__trust">
        <ShieldCheckIcon size={20} weight="duotone" />
        <div>
          <strong>Ambiente protegido</strong>
          <span>Ações e acessos auditados</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">{sidebar}</aside>

      <div
        className={`mobile-overlay ${mobileOpen ? 'is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`}
        aria-label="Menu móvel"
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="mobile-drawer__close"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        >
          <XIcon size={21} />
        </button>
        {sidebar}
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
            >
              <ListIcon size={23} />
            </button>
            <img src={compactLogo} alt="BenCorp" />
          </div>

          <div className="topbar__welcome">
            <span>Olá, {user.nome.split(' ')[0]}</span>
            <small>Seu ambiente de trabalho está pronto.</small>
          </div>

          <div className="profile-menu">
            <button
              type="button"
              className="profile-trigger"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-avatar">{initials(user.nome)}</span>
              <span className="profile-trigger__text">
                <strong>{user.nome}</strong>
                <small>{formatRole(user.papel)}</small>
              </span>
              <CaretDownIcon size={15} aria-hidden="true" />
            </button>
            {profileOpen ? (
              <div className="profile-popover" role="menu">
                <div>
                  <strong>{user.nome}</strong>
                  <span>{user.email}</span>
                </div>
                <button type="button" role="menuitem" onClick={signOut}>
                  <SignOutIcon size={18} />
                  Encerrar sessão
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
