import {
  ClipboardTextIcon,
  HeartbeatIcon,
  StethoscopeIcon,
} from '@phosphor-icons/react'
import { RiskBadge } from '../../../components/ui/StatusBadge'
import { formatDateTime } from '../../../lib/format'
import { VitalSigns } from '../../prontuario/components/VitalSigns'
import { getAttendancePresentation } from '../attendance-status'
import type { PatientAttendance } from '../pacientes.types'
import { AttendanceStatusSummary } from './AttendanceStatusSummary'

/**
 * Uma entrada da linha do cuidado: status, triagem e prontuário do mesmo
 * atendimento, nessa ordem — que é a ordem em que os fatos aconteceram.
 */
export function CareTimelineEntry({
  attendance,
}: {
  attendance: PatientAttendance
}) {
  const { tone } = getAttendancePresentation(attendance)
  const record = attendance.prontuario

  return (
    <article className={`care-entry care-entry--${tone}`}>
      <span className="care-entry__marker" aria-hidden="true" />

      <div className="care-entry__content">
        <AttendanceStatusSummary attendance={attendance} />

        {attendance.triagem ? (
          <div className="clinical-block">
            <div className="clinical-block__heading">
              <div className="clinical-block__title">
                <HeartbeatIcon size={19} weight="duotone" aria-hidden="true" />
                <div>
                  <strong>Triagem de enfermagem</strong>
                  <span>{attendance.triagem.queixa}</span>
                </div>
              </div>
              <div className="clinical-block__meta">
                <RiskBadge risk={attendance.risco} />
                <time dateTime={attendance.triagem.criadoEm}>
                  {formatDateTime(attendance.triagem.criadoEm)}
                </time>
              </div>
            </div>
            <div className="clinical-block__body">
              <VitalSigns triage={attendance.triagem} />
            </div>
          </div>
        ) : null}

        {record ? (
          <div className="clinical-block">
            <div className="clinical-block__heading">
              <div className="clinical-block__title">
                <ClipboardTextIcon
                  size={19}
                  weight="duotone"
                  aria-hidden="true"
                />
                <div>
                  <strong>Prontuário médico</strong>
                  <span>Registrado por {record.autor.nome}</span>
                </div>
              </div>
            </div>

            <div className="clinical-block__body record-body">
              <section>
                <h4>Anamnese</h4>
                <p>{record.anamnese}</p>
              </section>
              <section>
                <h4>Conduta</h4>
                <p>{record.conduta}</p>
              </section>
              {record.prescricao ? (
                <section>
                  <h4>Prescrição</h4>
                  <p>{record.prescricao}</p>
                </section>
              ) : null}

              {record.adendos.length > 0 ? (
                <div className="record-addenda">
                  <strong>Adendos</strong>
                  {record.adendos.map((addendum) => (
                    <p key={addendum.id}>
                      {addendum.texto}
                      <small>
                        {addendum.autor.nome},{' '}
                        {formatDateTime(addendum.criadoEm)}
                      </small>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : attendance.status === 'FINALIZADO' ? (
          <p className="care-entry__note">
            <StethoscopeIcon size={15} aria-hidden="true" />
            {/*
              `undefined` e `null` significam coisas diferentes aqui: a API
              omite o campo quando o perfil não pode ver (enfermagem), e manda
              null quando o médico não registrou. Tratar os dois como "sem
              prontuário" faria a enfermagem achar que o médico não escreveu.
            */}
            {record === undefined
              ? 'O prontuário médico não é exibido no perfil de enfermagem.'
              : 'Nenhum prontuário médico foi registrado neste atendimento.'}
          </p>
        ) : null}
      </div>
    </article>
  )
}
