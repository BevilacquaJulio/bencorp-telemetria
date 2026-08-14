import { api } from '../../lib/api'
import type { RoomAccess } from './sala.types'

export async function createProfessionalRoomAccess(attendanceId: string) {
  const { data } = await api.post<RoomAccess>(
    `/atendimentos/${attendanceId}/sala/token`,
  )
  return data
}

export async function exchangePatientLink({
  token,
  attendanceId,
}: {
  token: string
  attendanceId: string
}) {
  const { data } = await api.post<RoomAccess>(`/sala/${token}/entrar`, {
    atendimentoId: attendanceId,
  })
  return data
}
