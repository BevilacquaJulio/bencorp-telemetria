import type { Risco, StatusAtendimento } from '../../features/atendimentos/atendimentos.types'

const statusLabels: Record<StatusAtendimento, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const riskLabels: Record<Risco, string> = {
  VERMELHO: 'Emergência',
  LARANJA: 'Muito urgente',
  AMARELO: 'Urgente',
  VERDE: 'Pouco urgente',
  AZUL: 'Não urgente',
}

export function StatusBadge({ status }: { status: StatusAtendimento }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {statusLabels[status]}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: Risco | null }) {
  if (!risk) {
    return <span className="risk-badge risk-badge--pending">Sem triagem</span>
  }
  return (
    <span className={`risk-badge risk-badge--${risk.toLowerCase()}`}>
      <span aria-hidden="true" />
      {riskLabels[risk]}
    </span>
  )
}
