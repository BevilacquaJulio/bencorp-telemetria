import {
  MagnifyingGlassIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  UserGearIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { getApiErrorMessage } from '../../../lib/api'
import { formatDate, formatRole, initials } from '../../../lib/format'
import type { Papel } from '../../auth/auth.types'
import { listUsers, setUserActive } from '../usuarios.api'

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [role, setRole] = useState<Papel | ''>('')
  const [page, setPage] = useState(1)
  const users = useQuery({
    queryKey: ['users', deferredSearch, role, page],
    queryFn: () => listUsers(deferredSearch, role, page),
  })
  const activeMutation = useMutation({
    mutationFn: setUserActive,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const activeCount = users.data?.itens.filter((user) => user.ativo).length ?? 0
  const clinicalCount =
    users.data?.itens.filter((user) => user.papel !== 'ADMIN').length ?? 0

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__context">Administração</p>
          <h1>Usuários e acessos</h1>
          <p>Gerencie perfis profissionais sem acessar informações clínicas.</p>
        </div>
        <div className="page-heading__date">
          <ShieldCheckIcon size={18} />
          Gestão de acesso restrita
        </div>
      </header>

      <section className="admin-summary page-enter page-enter--1">
        <div>
          <span className="admin-summary__icon">
            <UsersThreeIcon size={25} weight="duotone" />
          </span>
          <p>
            <strong>{users.data?.total ?? 0}</strong>
            usuários cadastrados
          </p>
        </div>
        <div>
          <span className="admin-summary__icon">
            <ShieldCheckIcon size={25} weight="duotone" />
          </span>
          <p>
            <strong>{activeCount}</strong>
            ativos nesta página
          </p>
        </div>
        <div>
          <span className="admin-summary__icon">
            <UserGearIcon size={25} weight="duotone" />
          </span>
          <p>
            <strong>{clinicalCount}</strong>
            profissionais clínicos
          </p>
        </div>
      </section>

      <section className="panel users-panel page-enter page-enter--2">
        <div className="filter-bar">
          <div className="search-control">
            <MagnifyingGlassIcon size={19} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar usuário"
            />
          </div>
          <label className="single-select">
            <span className="sr-only">Filtrar por perfil</span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Papel | '')
                setPage(1)
              }}
            >
              <option value="">Todos os perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="ENFERMEIRO">Enfermagem</option>
              <option value="MEDICO">Medicina</option>
            </select>
          </label>
        </div>

        {activeMutation.isError ? (
          <div className="inline-alert" role="alert">
            <ProhibitIcon size={19} />
            {getApiErrorMessage(activeMutation.error)}
          </div>
        ) : null}

        {users.isLoading ? <TableSkeleton rows={6} /> : null}
        {users.isError ? (
          <ErrorState
            message={getApiErrorMessage(users.error)}
            onRetry={() => void users.refetch()}
          />
        ) : null}
        {users.isSuccess && users.data.itens.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros para consultar outros perfis."
          />
        ) : null}

        {users.isSuccess && users.data.itens.length > 0 ? (
          <>
            <div className="desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Perfil</th>
                    <th>Cadastro</th>
                    <th>Situação</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {users.data.itens.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <span>{initials(user.nome)}</span>
                          <div>
                            <strong>{user.nome}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{formatRole(user.papel)}</td>
                      <td>{formatDate(user.criadoEm)}</td>
                      <td>
                        <span
                          className={`access-state ${user.ativo ? 'is-active' : 'is-inactive'}`}
                        >
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant={user.ativo ? 'ghost' : 'secondary'}
                          size="sm"
                          loading={
                            activeMutation.isPending &&
                            activeMutation.variables?.id === user.id
                          }
                          onClick={() => activeMutation.mutate(user)}
                        >
                          {user.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {users.data.itens.map((user) => (
                <article className="user-card" key={user.id}>
                  <div className="user-cell">
                    <span>{initials(user.nome)}</span>
                    <div>
                      <strong>{user.nome}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>
                  <div className="user-card__meta">
                    <span>{formatRole(user.papel)}</span>
                    <span
                      className={`access-state ${user.ativo ? 'is-active' : 'is-inactive'}`}
                    >
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={
                      activeMutation.isPending &&
                      activeMutation.variables?.id === user.id
                    }
                    onClick={() => activeMutation.mutate(user)}
                  >
                    {user.ativo ? 'Desativar acesso' : 'Ativar acesso'}
                  </Button>
                </article>
              ))}
            </div>

            <footer className="panel-pagination">
              <span>
                Página {users.data.pagina} de {Math.max(users.data.paginas, 1)}
              </span>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= users.data.paginas}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                </Button>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  )
}
