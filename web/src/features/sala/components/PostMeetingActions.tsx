import { CheckCircleIcon, ClipboardTextIcon } from '@phosphor-icons/react'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import { MedicalActions } from './MedicalActions'
import { NursingActions } from './NursingActions'

type PostMeetingActionsProps = {
  attendance: AttendanceDetail
  role: 'ENFERMEIRO' | 'MEDICO'
  meetingEnded: boolean
  onComplete: () => void
}

export function PostMeetingActions({
  attendance,
  role,
  meetingEnded,
  onComplete,
}: PostMeetingActionsProps) {
  return (
    <section
      className="post-meeting-workspace page-enter page-enter--2"
      aria-labelledby="post-meeting-title"
    >
      <header className="post-meeting-workspace__heading">
        <span aria-hidden="true">
          {meetingEnded ? (
            <CheckCircleIcon size={25} weight="duotone" />
          ) : (
            <ClipboardTextIcon size={25} weight="duotone" />
          )}
        </span>
        <div>
          <p>
            {meetingEnded
              ? 'Videochamada encerrada · atendimento aberto'
              : 'Atendimento em andamento'}
          </p>
          <h2 id="post-meeting-title">
            {meetingEnded
              ? 'Revise e conclua as ações assistenciais'
              : 'Ações do atendimento'}
          </h2>
          <small>
            A reunião pode terminar sem perder a triagem ou o vínculo com o
            paciente. Estas ações continuam disponíveis até o encaminhamento ou
            a finalização do atendimento.
          </small>
        </div>
      </header>

      <div className="post-meeting-workspace__actions">
        {role === 'ENFERMEIRO' ? (
          <NursingActions
            attendance={attendance}
            allowDecision
            onComplete={onComplete}
          />
        ) : (
          <MedicalActions attendance={attendance} onComplete={onComplete} />
        )}
      </div>
    </section>
  )
}
