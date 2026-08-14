import type { PatientAttendance } from './pacientes.types'

export type AttendanceStageTone =
  'registered' | 'pending' | 'triaged' | 'completed' | 'canceled'

export function getAttendancePresentation(attendance: PatientAttendance): {
  title: string
  description: string
  tone: AttendanceStageTone
} {
  if (attendance.status === 'AGUARDANDO') {
    return {
      title: 'Paciente cadastrado',
      description:
        'Cadastro concluído. O paciente aguarda o início do atendimento para realizar a triagem.',
      tone: 'registered',
    }
  }

  if (attendance.status === 'EM_ANDAMENTO' && !attendance.triagem) {
    return {
      title: 'Triagem pendente',
      description:
        'Atendimento iniciado. Aguardando o registro da queixa e dos sinais vitais.',
      tone: 'pending',
    }
  }

  if (attendance.status === 'EM_ANDAMENTO') {
    return {
      title: 'Triagem registrada',
      description:
        'Dados de triagem registrados. O atendimento segue aberto para a decisão assistencial.',
      tone: 'triaged',
    }
  }

  if (attendance.status === 'FINALIZADO') {
    return {
      title: 'Atendimento finalizado',
      description: attendance.triagem
        ? 'Atendimento concluído com triagem registrada.'
        : 'Atendimento concluído sem registro de triagem.',
      tone: 'completed',
    }
  }

  return {
    title: 'Atendimento cancelado',
    description: 'Atendimento cancelado antes da conclusão.',
    tone: 'canceled',
  }
}
