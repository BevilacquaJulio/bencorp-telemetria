import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { formatDateTime } from '../../../lib/format'
import { getAttendancePresentation } from '../attendance-status'
import type { PatientAttendance } from '../pacientes.types'

function stageIcon(tone: ReturnType<typeof getAttendancePresentation>['tone']) {
  if (tone === 'registered') {
    return <UserPlusIcon size={21} weight="duotone" aria-hidden="true" />
  }
  if (tone === 'pending') {
    return <ClockIcon size={21} weight="duotone" aria-hidden="true" />
  }
  if (tone === 'triaged') {
    return <ClipboardTextIcon size={21} weight="duotone" aria-hidden="true" />
  }
  if (tone === 'completed') {
    return <CheckCircleIcon size={21} weight="duotone" aria-hidden="true" />
  }
  return <XCircleIcon size={21} weight="duotone" aria-hidden="true" />
}

function startDiffersFromRegistration(attendance: PatientAttendance) {
  if (!attendance.iniciadoEm) return false
  const entry = new Date(attendance.entradaFila).getTime()
  const start = new Date(attendance.iniciadoEm).getTime()
  return Math.abs(start - entry) >= 60_000
}

export function AttendanceStatusSummary({
  attendance,
}: {
  attendance: PatientAttendance
}) {
  const presentation = getAttendancePresentation(attendance)
  const metadata = [
    attendance.profissional
      ? { label: 'Responsável', value: attendance.profissional.nome }
      : null,
    startDiffersFromRegistration(attendance)
      ? {
          label: 'Atendimento iniciado',
          value: formatDateTime(attendance.iniciadoEm as string),
        }
      : null,
    attendance.finalizadoEm
      ? {
          label: 'Encerramento',
          value: formatDateTime(attendance.finalizadoEm),
        }
      : attendance.canceladoEm
        ? {
            label: 'Cancelamento',
            value: formatDateTime(attendance.canceladoEm),
          }
        : null,
  ].filter((item): item is { label: string; value: string } => item !== null)

  return (
    <section
      className={`attendance-stage attendance-stage--${presentation.tone}`}
      aria-label={`Status atual: ${presentation.title}`}
    >
      <span className="attendance-stage__icon">
        {stageIcon(presentation.tone)}
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
            <CalendarBlankIcon size={16} aria-hidden="true" />
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
