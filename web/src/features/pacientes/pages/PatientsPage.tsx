import {
  ArrowRightIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  UserFocusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf, formatDate } from '../../../lib/format'
import { listPatients } from '../pacientes.api'

export function PatientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const patients = useQuery({
    queryKey: ['patients', deferredSearch, page],
    queryFn: () => listPatients(deferredSearch, page),
  })

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__context">Cadastro assistencial</p>
          <h1>Pacientes</h1>
          <p>Consulte dados e atendimentos dentro do seu escopo de atuação.</p>
        </div>
        <div className="page-heading__date">
          <UsersThreeIcon size={18} />
          {patients.data?.total ?? 0} pacientes acessíveis
        </div>
      </header>

      <section className="panel patients-panel page-enter page-enter--1">
        <div className="filter-bar filter-bar--single">
          <div className="search-control search-control--wide">
            <MagnifyingGlassIcon size={19} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome ou CPF"
              aria-label="Buscar paciente"
            />
          </div>
          <p>Resultados limitados aos vínculos assistenciais autorizados.</p>
        </div>

        {patients.isLoading ? <TableSkeleton rows={6} /> : null}
        {patients.isError ? (
          <ErrorState
            message={getApiErrorMessage(patients.error)}
            onRetry={() => void patients.refetch()}
          />
        ) : null}
        {patients.isSuccess && patients.data.itens.length === 0 ? (
          <EmptyState
            title="Nenhum paciente encontrado"
            description="Revise a busca ou consulte novamente após assumir um atendimento."
          />
        ) : null}

        {patients.isSuccess && patients.data.itens.length > 0 ? (
          <>
            <div className="patients-grid">
              {patients.data.itens.map((patient) => (
                <article className="patient-card" key={patient.id}>
                  <div className="patient-card__identity">
                    <span className="patient-avatar" aria-hidden="true">
                      {patient.nome.slice(0, 1)}
                    </span>
                    <div>
                      <h2>{patient.nome}</h2>
                      <p>{formatDate(patient.nascimento)}</p>
                    </div>
                  </div>
                  <dl className="patient-card__details">
                    <div>
                      <dt>
                        <IdentificationCardIcon size={17} /> CPF
                      </dt>
                      <dd>{formatCpf(patient.cpf)}</dd>
                    </div>
                    <div>
                      <dt>
                        <PhoneIcon size={17} /> Contato
                      </dt>
                      <dd>{patient.contato}</dd>
                    </div>
                  </dl>
                  <div className="patient-card__footer">
                    <span>
                      <UserFocusIcon size={17} />
                      {patient._count.atendimentos}{' '}
                      {patient._count.atendimentos === 1
                        ? 'atendimento'
                        : 'atendimentos'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<ArrowRightIcon size={16} />}
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <footer className="panel-pagination">
              <span>
                Página {patients.data.pagina} de{' '}
                {Math.max(patients.data.paginas, 1)}
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
                  disabled={page >= patients.data.paginas}
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
