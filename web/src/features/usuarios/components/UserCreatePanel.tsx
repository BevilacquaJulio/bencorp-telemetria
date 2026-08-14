import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlusIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { getApiErrorMessage } from '../../../lib/api'
import { createUser } from '../usuarios.api'
import { createUserSchema } from '../usuarios.schema'

type CreateUserForm = z.infer<typeof createUserSchema>

type UserCreatePanelProps = {
  onClose: () => void
}

export function UserCreatePanel({ onClose }: UserCreatePanelProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      papel: 'ENFERMEIRO',
    },
  })
  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
  })

  return (
    <section className="user-create-panel" aria-labelledby="new-user-title">
      <header>
        <div>
          <p>Controle de acesso</p>
          <h2 id="new-user-title">Cadastrar profissional</h2>
          <span>O perfil define as permissões funcionais dentro do PAD.</span>
        </div>
        <button type="button" aria-label="Fechar cadastro" onClick={onClose}>
          <XIcon size={19} aria-hidden="true" />
        </button>
      </header>

      <form
        className="user-create-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField
          label="Nome completo"
          autoComplete="name"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <FormField
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Senha temporária"
          type="password"
          autoComplete="new-password"
          error={errors.senha?.message}
          {...register('senha')}
        />
        <label className="select-field">
          <span>Perfil e permissões</span>
          <select {...register('papel')}>
            <option value="ENFERMEIRO">Enfermagem — triagem e encaminhamento</option>
            <option value="MEDICO">Medicina — prontuário e prescrição</option>
            <option value="ADMIN">Administração — usuários e acessos</option>
          </select>
        </label>

        {mutation.isError ? (
          <div className="form-alert" role="alert">
            <WarningCircleIcon size={18} />
            {getApiErrorMessage(mutation.error)}
          </div>
        ) : null}

        <div className="user-create-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            icon={<UserPlusIcon size={18} />}
          >
            Cadastrar usuário
          </Button>
        </div>
      </form>
    </section>
  )
}
