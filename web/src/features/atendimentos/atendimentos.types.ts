export type StatusAtendimento =
  | 'AGUARDANDO'
  | 'EM_ANDAMENTO'
  | 'FINALIZADO'
  | 'CANCELADO'

export type Risco = 'VERMELHO' | 'LARANJA' | 'AMARELO' | 'VERDE' | 'AZUL'

export type PatientSummary = {
  id: string
  nome: string
  cpf: string
  contato: string
  nascimento?: string
}

export type ProfessionalSummary = {
  id: string
  nome: string
  papel?: string
}

export type Triage = {
  queixa: string
  pa: string | null
  fc: number | null
  temperatura: number | null
  satO2: number | null
  criadoEm: string
}

export type AttendanceListItem = {
  id: string
  status: StatusAtendimento
  risco: Risco | null
  entradaFila: string
  iniciadoEm: string | null
  paciente: PatientSummary
  profissional: ProfessionalSummary | null
  encaminhadoDeId: string | null
}

export type AttendanceDetail = AttendanceListItem & {
  finalizadoEm: string | null
  canceladoEm: string | null
  triagem: Triage | null
  encaminhadoDe: {
    id: string
    profissional: ProfessionalSummary | null
    triagem: Triage | null
  } | null
}

export type QueueFilters = {
  busca?: string
  status?: StatusAtendimento
  risco?: Risco
  periodo: 'hoje' | 'ontem' | 'ultima_semana' | 'todos'
  pagina: number
  porPagina: number
}

export type QueueResponse = {
  itens: AttendanceListItem[]
  atendimentoAtivo: AttendanceListItem | null
  total: number
  pagina: number
  porPagina: number
  paginas: number
}

export type TriageInput = {
  risco: Risco
  queixa: string
  pa?: string
  fc?: number
  temperatura?: number
  satO2?: number
}

export type RegisterPatientInput = {
  nome: string
  cpf: string
  contato: string
  nascimento: string
}
