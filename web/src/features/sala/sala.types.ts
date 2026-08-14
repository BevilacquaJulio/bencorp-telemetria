export type RoomAccess = {
  token: string
  url: string
  sala: string
  atendimentoId: string
  participante: 'PROFISSIONAL' | 'PACIENTE'
  expiraEm: string
}
