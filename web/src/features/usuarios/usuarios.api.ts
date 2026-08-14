import { api } from '../../lib/api'
import type { Papel } from '../auth/auth.types'
import type { UserListItem, UsersResponse } from './usuarios.types'

export async function listUsers(search: string, role: Papel | '', page = 1) {
  const { data } = await api.get<UsersResponse>('/usuarios', {
    params: {
      busca: search.trim() || undefined,
      papel: role || undefined,
      pagina: page,
      porPagina: 15,
    },
  })
  return data
}

export async function setUserActive(user: UserListItem) {
  const { data } = await api.patch<UserListItem>(`/usuarios/${user.id}`, {
    ativo: !user.ativo,
  })
  return data
}
