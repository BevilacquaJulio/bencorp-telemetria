import { api } from '../../lib/api'
import type {
  AttendanceDetail,
  QueueFilters,
  QueueResponse,
} from './atendimentos.types'

export async function listQueue(filters: QueueFilters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  )
  const { data } = await api.get<QueueResponse>('/atendimentos', { params })
  return data
}

export async function startAttendance(id: string) {
  const { data } = await api.post<AttendanceDetail>(
    `/atendimentos/${id}/iniciar`,
  )
  return data
}

export async function getAttendance(id: string) {
  const { data } = await api.get<AttendanceDetail>(`/atendimentos/${id}`)
  return data
}
