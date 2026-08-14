import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { formatDateTime } from '../../../lib/format'
import {
  getAttendancePresentation,
  type AttendanceStageTone,
} from '../attendance-status'
import type { PatientAttendance } from '../pacientes.types'

const stageIcons: Record<AttendanceStageTone, ReactNode> = {
  registered: <UserPlusIcon size={20} weight="duotone" aria-hidden="true" />,
  pending: <ClockIcon size={20} weight="duotone" aria-hidden="true" />,
  triaged: <ClipboardTextIcon size={20} weight="duotone" aria-hidden="true" />,
  completed: <CheckCircleIcon size={20} weight="duotone" aria-hidden="true" />,
  canceled: <XCircleIcon size={20} weight="duotone" aria-hidden="true" />,
}

/**
 * Só mostra "atendimento iniciado" quando o início é de fato outro momento
 * que a entrada na fila. Cadastro e início acontecem no mesmo minuto no fluxo
 * normal, e repetir o mesmo horário duas vezes só polui a ficha.
 */
function startDiffersFromRegistration(attendance: PatientAttendance) {
  if (!attendance.iniciadoEm) return false
  const entry = new Date(attendance.entradaFila).getTime()
  const start = new Date(attendance.iniciadoEm).getTime()
  return Math.abs(start - entry) >= 60_000
}

function buildMetadata(attendance: PatientAttendance) {
  const rows: Array<{ label: string; value: string }> = []

  if (attendance.profissional) {
    rows.push({ label: 'Responsável', value: attendance.profissional.nome })
  }
  if (startDiffersFromRegistration(attendance)) {
    rows.push({
      label: 'Atendimento iniciado',
      value: formatDateTime(attendance.iniciadoEm as string),
    })
  }
  if (attendance.finalizadoEm) {
    rows.push({
      label: 'Encerramento',
      value: formatDateTime(attendance.finalizadoEm),
    })
  } else if (attendance.canceladoEm) {
    rows.push({
      label: 'Cancelamento',
      value: formatDateTime(attendance.canceladoEm),
    })
  }

  return rows
}

export function AttendanceStatusSummary({
  attendance,
}: {
  attendance: PatientAttendance
}) {
  const presentation = getAttendancePresentation(attendance)
  const metadata = buildMetadata(attendance)

  return (
    <section
      className={`attendance-stage attendance-stage--${presentation.tone}`}
      aria-label={`Status atual: ${presentation.title}`}
    >
      <span className="attendance-stage__icon">
        {stageIcons[presentation.tone]}
      </span>
      <div className="attendance-stage__body">
        <div className="attendance-stage__heading">
          <div>
            <span>Status atual</span>
            <h3>{presentation.title}</h3>
          </div>
          <time
            dateTime={attendance.entradaFila}
            aria-label={`Registro em ${formatDateTime(attendance.entradaFila)}`}
          >
            <CalendarBlankIcon size={14} aria-hidden="true" />
            {formatDateTime(attendance.entradaFila)}
          </time>
        </div>
        <p>{presentation.description}</p>

        {metadata.length > 0 ? (
          <dl className="attendance-stage__metadata">
            {metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  )
}
