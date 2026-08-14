import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '../../../lib/api'
import { updateUserRole } from '../usuarios.api'
import type { UserListItem } from '../usuarios.types'
import type { Papel } from '../../auth/auth.types'

export function UserRoleControl({ user }: { user: UserListItem }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const selectedRole = mutation.isError
    ? user.papel
    : (mutation.variables?.papel ?? user.papel)

  return (
    <div className="user-role-control">
      <label>
        <span className="sr-only">Perfil de {user.nome}</span>
        <select
          aria-label={`Perfil de ${user.nome}`}
          value={selectedRole}
          disabled={mutation.isPending}
          onChange={(event) => {
            const papel = event.target.value as Papel
            mutation.mutate({ id: user.id, papel })
          }}
        >
          <option value="ADMIN">Administrador</option>
          <option value="ENFERMEIRO">Enfermeiro</option>
          <option value="MEDICO">Médico</option>
        </select>
      </label>
      {mutation.isError ? (
        <small role="alert">{getApiErrorMessage(mutation.error)}</small>
      ) : null}
    </div>
  )
}
