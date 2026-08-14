import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  StethoscopeIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '../../../components/ui/DataState'
import { RiskBadge, StatusBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf, formatDateTime, timeInQueue } from '../../../lib/format'
import { useAuth } from '../../auth/auth-context'
import { listQueue, startAttendance } from '../atendimentos.api'
import { PatientIntakePanel } from '../components/PatientIntakePanel'
import type {
  AttendanceListItem,
  QueueFilters,
  StatusAtendimento,
} from '../atendimentos.types'

const statusOptions: Array<{ value: StatusAtendimento | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'AGUARDANDO', label: 'Aguardando' },
  { value: 'EM_ANDAMENTO', label: 'Em atendimento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

export function QueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<StatusAtendimento | ''>('')
  const [period, setPeriod] = useState<QueueFilters['periodo']>('hoje')
  const [page, setPage] = useState(1)
  const [registeringPatient, setRegisteringPatient] = useState(false)
  const [registeredPatientName, setRegisteredPatientName] = useState('')

  const filters: QueueFilters = {
    busca: deferredSearch.trim() || undefined,
    status: status || undefined,
    periodo: period,
    pagina: page,
    porPagina: 10,
  }

  const queue = useQuery({
    queryKey: ['queue', filters],
    queryFn: () => listQueue(filters),
  })

  const startMutation = useMutation({
    mutationFn: startAttendance,
    onSuccess: (attendance) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      navigate(`/atendimentos/${attendance.id}/sala`)
    },
  })

  const items = queue.data?.itens ?? []
  const activeAttendance = queue.data?.atendimentoAtivo ?? null
  const waiting = items.filter((item) => item.status === 'AGUARDANDO').length
  const active = activeAttendance ? 1 : 0
  const priority = items.filter(
    (item) => item.risco === 'VERMELHO' || item.risco === 'LARANJA',
  ).length

  function handleAction(item: AttendanceListItem) {
    if (item.status === 'AGUARDANDO') {
      startMutation.mutate(item.id)
      return
    }
    if (item.status === 'EM_ANDAMENTO') {
      navigate(`/atendimentos/${item.id}/sala`)
      return
    }
    navigate(`/pacientes/${item.paciente.id}`)
  }

  function actionLabel(statusValue: StatusAtendimento) {
    if (statusValue === 'AGUARDANDO') return 'Iniciar atendimento'
    if (statusValue === 'EM_ANDAMENTO') return 'Ver atendimento'
    return 'Ver detalhes'
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-enter">
        <div>
          <p className="page-heading__context">Operação assistencial</p>
          <h1>Fila de atendimentos</h1>
          <p>Acompanhe a demanda e conduza cada paciente com segurança.</p>
        </div>
        <div className="page-heading__actions">
          <div className="page-heading__date">
            <ClockIcon size={18} />
            Atualização em tempo real
          </div>
          {user?.papel === 'ENFERMEIRO' ? (
            <Button
              type="button"
              icon={<UserPlusIcon size={18} weight="bold" />}
              onClick={() => {
                setRegisteredPatientName('')
                setRegisteringPatient(true)
              }}
            >
              Cadastrar paciente
            </Button>
          ) : null}
        </div>
      </header>

      {registeringPatient ? (
        <PatientIntakePanel
          onClose={() => setRegisteringPatient(false)}
          onCreated={(attendance) => {
            setRegisteringPatient(false)
            setRegisteredPatientName(attendance.paciente.nome)
            setStatus('')
            setPeriod('hoje')
            setPage(1)
          }}
        />
      ) : null}

      {registeredPatientName ? (
        <section className="registration-success" role="status">
          <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />
          <div>
            <strong>Paciente cadastrado</strong>
            <span>
              Cadastro de {registeredPatientName} concluído. A pessoa foi
              incluída na fila e aguarda o início do atendimento.
            </span>
          </div>
        </section>
      ) : null}

      <section className="metrics-grid" aria-label="Resumo da fila">
        <article className="metric metric--primary page-enter page-enter--1">
          <span className="metric__icon" aria-hidden="true">
            <UsersThreeIcon size={24} weight="duotone" />
          </span>
          <div>
            <p>No período selecionado</p>
            <strong>{queue.data?.total ?? 0}</strong>
            <span>atendimentos no período</span>
          </div>
        </article>
        <article className="metric page-enter page-enter--2">
          <span className="metric__label">Em espera</span>
          <strong>{waiting}</strong>
          <small>Aguardando acolhimento</small>
        </article>
        <article className="metric page-enter page-enter--3">
          <span className="metric__label">Com você</span>
          <strong>{active}</strong>
          <small>Em atendimento agora</small>
        </article>
        <article className="metric metric--attention page-enter page-enter--4">
          <span className="metric__label">Alta prioridade</span>
          <strong>{priority}</strong>
          <small>Vermelho ou laranja</small>
        </article>
      </section>

      {activeAttendance ? (
        <section className="active-attendance-banner page-enter" role="status">
          <span aria-hidden="true">
            <StethoscopeIcon size={24} weight="duotone" />
          </span>
          <div>
            <p>Atendimento em andamento</p>
            <strong>{activeAttendance.paciente.nome}</strong>
            <small>
              Esta ficha permanece disponível independentemente do período
              selecionado.
            </small>
          </div>
          <Button
            type="button"
            size="sm"
            icon={<ArrowRightIcon size={17} />}
            onClick={() =>
              navigate(`/atendimentos/${activeAttendance.id}/sala`)
            }
          >
            Ver atendimento
          </Button>
        </section>
      ) : null}

      <section className="panel queue-panel page-enter page-enter--2">
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
              placeholder="Buscar por nome ou CPF"
              aria-label="Buscar atendimento"
            />
          </div>
          <div className="filter-selects">
            <label>
              <span className="sr-only">Filtrar por status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusAtendimento | '')
                  setPage(1)
                }}
              >
                {statusOptions.map((option) => (
                  <option value={option.value} key={option.value || 'all'}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por período</span>
              <select
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as QueueFilters['periodo'])
                  setPage(1)
                }}
              >
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="ultima_semana">Últimos 7 dias</option>
                <option value="todos">Todo o período</option>
              </select>
            </label>
            <span className="filter-icon" aria-hidden="true">
              <FunnelIcon size={18} />
            </span>
          </div>
        </div>

        {startMutation.isError ? (
          <div className="inline-alert" role="alert">
            <WarningCircleIcon size={19} />
            {getApiErrorMessage(startMutation.error)}
          </div>
        ) : null}

        {queue.isLoading ? <TableSkeleton rows={6} /> : null}
        {queue.isError ? (
          <ErrorState
            message={getApiErrorMessage(queue.error)}
            onRetry={() => void queue.refetch()}
          />
        ) : null}
        {queue.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Nenhum atendimento encontrado"
            description="Ajuste os filtros ou aguarde a entrada de novos pacientes."
          />
        ) : null}

        {queue.isSuccess && items.length > 0 ? (
          <>
            <div className="desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Contato</th>
                    <th>Classificação de risco</th>
                    <th>Status</th>
                    <th>Entrada na fila</th>
                    <th>Tempo de espera</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="patient-cell">
                          <span>{item.paciente.nome.slice(0, 1)}</span>
                          <div>
                            <strong>{item.paciente.nome}</strong>
                            <small>{formatCpf(item.paciente.cpf)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="queue-contact">
                          {item.paciente.contato}
                        </span>
                      </td>
                      <td>
                        <RiskBadge risk={item.risco} />
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <span className="queue-entry-date">
                          {formatDateTime(item.entradaFila)}
                        </span>
                      </td>
                      <td>
                        <span className="queue-time">
                          <ClockIcon size={16} />
                          {timeInQueue(item.entradaFila)}
                        </span>
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant={
                            item.status === 'AGUARDANDO' ? 'primary' : 'ghost'
                          }
                          size="sm"
                          loading={
                            startMutation.isPending &&
                            startMutation.variables === item.id
                          }
                          icon={
                            item.status === 'AGUARDANDO' ? (
                              <PlayIcon size={16} weight="fill" />
                            ) : (
                              <ArrowRightIcon size={16} />
                            )
                          }
                          onClick={() => handleAction(item)}
                        >
                          {actionLabel(item.status)}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {items.map((item) => (
                <article className="attendance-card" key={item.id}>
                  <div className="attendance-card__top">
                    <div className="patient-cell">
                      <span>{item.paciente.nome.slice(0, 1)}</span>
                      <div>
                        <strong>{item.paciente.nome}</strong>
                        <small>{formatCpf(item.paciente.cpf)}</small>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <dl className="attendance-card__facts">
                    <div>
                      <dt>Contato</dt>
                      <dd>{item.paciente.contato}</dd>
                    </div>
                    <div>
                      <dt>Entrada na fila</dt>
                      <dd>{formatDateTime(item.entradaFila)}</dd>
                    </div>
                  </dl>
                  <div className="attendance-card__meta">
                    <RiskBadge risk={item.risco} />
                    <span className="queue-time">
                      <ClockIcon size={16} />
                      {timeInQueue(item.entradaFila)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant={
                      item.status === 'AGUARDANDO' ? 'primary' : 'secondary'
                    }
                    size="sm"
                    loading={
                      startMutation.isPending &&
                      startMutation.variables === item.id
                    }
                    icon={<StethoscopeIcon size={17} />}
                    onClick={() => handleAction(item)}
                  >
                    {actionLabel(item.status)}
                  </Button>
                </article>
              ))}
            </div>

            <footer className="panel-pagination">
              <span>
                Página {queue.data.pagina} de {Math.max(queue.data.paginas, 1)}
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
                  disabled={page >= queue.data.paginas}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                </Button>
              </div>
            </footer>
          </>
        ) : null}
      </section>

      <p className="page-footnote">
        <StethoscopeIcon size={17} />
        Perfil ativo: {user?.papel === 'MEDICO' ? 'Medicina' : 'Enfermagem'}
      </p>
    </div>
  )
}
