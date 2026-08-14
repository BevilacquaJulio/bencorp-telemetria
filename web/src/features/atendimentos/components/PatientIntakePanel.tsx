import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlusIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { getApiErrorMessage } from '../../../lib/api'
import { registerPatient } from '../atendimentos.api'
import {
  patientIntakeFormSchema,
  toRegisterPatientInput,
  type PatientIntakeFormValues,
} from '../atendimentos.schema'
import type { AttendanceDetail } from '../atendimentos.types'

type PatientIntakePanelProps = {
  onClose: () => void
  onCreated: (attendance: AttendanceDetail) => void
}

function todayForInput() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PatientIntakePanel({
  onClose,
  onCreated,
}: PatientIntakePanelProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientIntakeFormValues>({
    resolver: zodResolver(patientIntakeFormSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      contato: '',
      nascimento: '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: PatientIntakeFormValues) =>
      registerPatient(toRegisterPatientInput(values)),
    onSuccess: (attendance) => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      onCreated(attendance)
    },
  })

  return (
    <section className="patient-intake-panel" aria-labelledby="intake-title">
      <header>
        <div>
          <p>Novo paciente</p>
          <h2 id="intake-title">Cadastrar paciente</h2>
          <span>
            Ao concluir, o paciente será incluído na fila. A triagem começa
            quando o atendimento for iniciado.
          </span>
        </div>
        <button type="button" aria-label="Fechar cadastro" onClick={onClose}>
          <XIcon size={19} aria-hidden="true" />
        </button>
      </header>

      <form
        className="patient-intake-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField
          label="Nome completo"
          autoComplete="name"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <FormField
          label="CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <FormField
          label="Contato"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          error={errors.contato?.message}
          {...register('contato')}
        />
        <FormField
          label="Data de nascimento"
          type="date"
          min="1900-01-01"
          max={todayForInput()}
          autoComplete="bday"
          error={errors.nascimento?.message}
          {...register('nascimento')}
        />

        {mutation.isError ? (
          <div className="form-alert" role="alert">
            <WarningCircleIcon size={18} />
            {getApiErrorMessage(mutation.error)}
          </div>
        ) : null}

        <div className="patient-intake-form__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            icon={<UserPlusIcon size={18} />}
          >
            Cadastrar paciente
          </Button>
        </div>
      </form>
    </section>
  )
}
