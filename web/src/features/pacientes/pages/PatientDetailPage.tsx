import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  ClipboardTextIcon,
  HeartbeatIcon,
  IdentificationCardIcon,
  PhoneIcon,
  StethoscopeIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { RiskBadge, StatusBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf, formatDate, formatDateTime } from '../../../lib/format'
import { getPatient } from '../pacientes.api'

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const patient = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
  })

  if (patient.isLoading) {
    return <TableSkeleton rows={7} />
  }

  if (patient.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(patient.error)}
        onRetry={() => void patient.refetch()}
      />
    )
  }

  if (!patient.data) return null

  return (
    <div className="page-stack">
      <Button
        className="back-button"
        type="button"
        variant="ghost"
        size="sm"
        icon={<ArrowLeftIcon size={17} />}
        onClick={() => navigate('/pacientes')}
      >
        Voltar para pacientes
      </Button>

      <section className="patient-profile page-enter">
        <div className="patient-profile__main">
          <span className="patient-profile__avatar" aria-hidden="true">
            {patient.data.nome.slice(0, 1)}
          </span>
          <div>
            <p>Histórico assistencial</p>
            <h1>{patient.data.nome}</h1>
            <span>Paciente com acesso autorizado para seu perfil.</span>
          </div>
        </div>
        <dl className="patient-profile__facts">
          <div>
            <dt>
              <IdentificationCardIcon size={17} /> CPF
            </dt>
            <dd>{formatCpf(patient.data.cpf)}</dd>
          </div>
          <div>
            <dt>
              <CalendarBlankIcon size={17} /> Nascimento
            </dt>
            <dd>{formatDate(patient.data.nascimento)}</dd>
          </div>
          <div>
            <dt>
              <PhoneIcon size={17} /> Contato
            </dt>
            <dd>{patient.data.contato}</dd>
          </div>
        </dl>
      </section>

      <section className="history-section page-enter page-enter--1">
        <div className="section-heading">
          <div>
            <h2>Linha do cuidado</h2>
            <p>Atendimentos em ordem do mais recente para o mais antigo.</p>
          </div>
          <span>{patient.data.atendimentos.length} registros</span>
        </div>

        <div className="care-timeline">
          {patient.data.atendimentos.map((attendance) => (
            <article className="care-entry" key={attendance.id}>
              <div className="care-entry__rail" aria-hidden="true">
                <span />
              </div>
              <div className="care-entry__content">
                <header>
                  <div>
                    <p>{formatDateTime(attendance.entradaFila)}</p>
                    <h3>
                      {attendance.profissional?.nome ?? 'Atendimento em fila'}
                    </h3>
                  </div>
                  <div className="care-entry__badges">
                    <RiskBadge risk={attendance.risco} />
                    <StatusBadge status={attendance.status} />
                  </div>
                </header>

                {attendance.triagem ? (
                  <div className="clinical-summary">
                    <div className="clinical-summary__title">
                      <HeartbeatIcon size={19} weight="duotone" />
                      <strong>Triagem</strong>
                      <span>{attendance.triagem.queixa}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Pressão</dt>
                        <dd>{attendance.triagem.pa ?? 'Não informada'}</dd>
                      </div>
                      <div>
                        <dt>Frequência</dt>
                        <dd>
                          {attendance.triagem.fc
                            ? `${attendance.triagem.fc} bpm`
                            : 'Não informada'}
                        </dd>
                      </div>
                      <div>
                        <dt>Temperatura</dt>
                        <dd>
                          {attendance.triagem.temperatura
                            ? `${attendance.triagem.temperatura} °C`
                            : 'Não informada'}
                        </dd>
                      </div>
                      <div>
                        <dt>Saturação</dt>
                        <dd>
                          {attendance.triagem.satO2
                            ? `${attendance.triagem.satO2}%`
                            : 'Não informada'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {attendance.prontuario ? (
                  <div className="medical-record">
                    <div className="medical-record__heading">
                      <ClipboardTextIcon size={20} weight="duotone" />
                      <div>
                        <strong>Prontuário médico</strong>
                        <span>Registrado por {attendance.prontuario.autor.nome}</span>
                      </div>
                    </div>
                    <div className="medical-record__body">
                      <div>
                        <h4>Anamnese</h4>
                        <p>{attendance.prontuario.anamnese}</p>
                      </div>
                      <div>
                        <h4>Conduta</h4>
                        <p>{attendance.prontuario.conduta}</p>
                      </div>
                      {attendance.prontuario.prescricao ? (
                        <div>
                          <h4>Prescrição</h4>
                          <p>{attendance.prontuario.prescricao}</p>
                        </div>
                      ) : null}
                    </div>
                    {attendance.prontuario.adendos.length > 0 ? (
                      <div className="record-addenda">
                        <strong>Adendos</strong>
                        {attendance.prontuario.adendos.map((addendum) => (
                          <p key={addendum.id}>
                            {addendum.texto}
                            <small>
                              {addendum.autor.nome}, {formatDateTime(addendum.criadoEm)}
                            </small>
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="care-entry__note">
                    <StethoscopeIcon size={17} />
                    Nenhum prontuário disponível para este registro.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
