import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { getApiErrorMessage } from '../../../lib/api'
import {
  createTriage,
  finalizeAttendance,
  forwardAttendance,
} from '../../atendimentos/atendimentos.api'
import {
  toTriageInput,
  triageFormSchema,
  type TriageFormValues,
} from '../../atendimentos/atendimentos.schema'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'

type NursingActionsProps = {
  attendance: AttendanceDetail
  onComplete: () => void
  allowDecision?: boolean
}

export function NursingActions({
  attendance,
  onComplete,
  allowDecision = true,
}: NursingActionsProps) {
  const queryClient = useQueryClient()
  const [confirmation, setConfirmation] = useState<'forward' | 'finish' | null>(
    null,
  )
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TriageFormValues>({
    resolver: zodResolver(triageFormSchema),
    defaultValues: {
      risco: 'VERDE',
      queixa: '',
      pa: '',
      fc: '',
      temperatura: '',
      satO2: '',
    },
  })
  const triage = useMutation({
    mutationFn: (values: TriageFormValues) =>
      createTriage({
        attendanceId: attendance.id,
        input: toTriageInput(values),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['attendance', attendance.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
    },
  })
  const endAttendance = useMutation({
    mutationFn: (action: 'forward' | 'finish') =>
      action === 'forward'
        ? forwardAttendance(attendance.id)
        : finalizeAttendance(attendance.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      onComplete()
    },
  })

  if (!attendance.triagem) {
    return (
      <section className="clinical-panel" aria-labelledby="triage-title">
        <header className="clinical-panel__heading">
          <span aria-hidden="true">
            <ClipboardTextIcon size={21} weight="duotone" />
          </span>
          <div>
            <h2 id="triage-title">Triagem de enfermagem</h2>
            <p>Registre a queixa e os sinais antes da decisão assistencial.</p>
          </div>
        </header>
        <form
          className="clinical-form"
          onSubmit={handleSubmit((values) => triage.mutate(values))}
        >
          <label className="select-field">
            <span>Classificação de risco</span>
            <select {...register('risco')}>
              <option value="VERMELHO">Vermelho — emergência</option>
              <option value="LARANJA">Laranja — muito urgente</option>
              <option value="AMARELO">Amarelo — urgente</option>
              <option value="VERDE">Verde — pouco urgente</option>
              <option value="AZUL">Azul — não urgente</option>
            </select>
          </label>
          <label className="text-area-field">
            <span>Queixa principal</span>
            <textarea rows={4} {...register('queixa')} />
            {errors.queixa ? <small>{errors.queixa.message}</small> : null}
          </label>
          <div className="vital-signs-grid">
            <FormField label="Pressão arterial" placeholder="120/80" error={errors.pa?.message} {...register('pa')} />
            <FormField label="Frequência cardíaca" type="number" placeholder="80" error={errors.fc?.message} {...register('fc')} />
            <FormField label="Temperatura" type="number" step="0.1" placeholder="36.5" error={errors.temperatura?.message} {...register('temperatura')} />
            <FormField label="Saturação O₂" type="number" placeholder="98" error={errors.satO2?.message} {...register('satO2')} />
          </div>
          {triage.isError ? (
            <div className="compact-alert" role="alert">
              <WarningCircleIcon size={18} />
              {getApiErrorMessage(triage.error)}
            </div>
          ) : null}
          <Button
            type="submit"
            loading={triage.isPending}
            icon={<CheckCircleIcon size={18} />}
          >
            Salvar triagem
          </Button>
        </form>
      </section>
    )
  }

  if (!allowDecision) {
    return (
      <section
        className="clinical-panel"
        aria-labelledby="nursing-decision-title"
      >
        <header className="clinical-panel__heading">
          <span aria-hidden="true">
            <CheckCircleIcon size={21} weight="duotone" />
          </span>
          <div>
            <h2 id="nursing-decision-title">Triagem registrada</h2>
            <p>{attendance.triagem.queixa}</p>
          </div>
        </header>
        <div className="clinical-next-step" role="status">
          <strong>Decisão disponível após a videochamada</strong>
          <p>
            Encerre a reunião para revisar a triagem, encaminhar ao médico ou
            concluir este atendimento com calma.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="clinical-panel" aria-labelledby="nursing-decision-title">
      <header className="clinical-panel__heading">
        <span aria-hidden="true">
          <CheckCircleIcon size={21} weight="duotone" />
        </span>
        <div>
          <h2 id="nursing-decision-title">Triagem registrada</h2>
          <p>{attendance.triagem.queixa}</p>
        </div>
      </header>

      {confirmation ? (
        <div className="clinical-confirmation" role="alert">
          <strong>
            {confirmation === 'forward'
              ? 'Encaminhar este paciente para a fila médica?'
              : 'Encerrar este atendimento sem encaminhamento?'}
          </strong>
          <p>A sala será encerrada e o convite do paciente será revogado.</p>
          <div>
            <Button
              type="button"
              size="sm"
              loading={endAttendance.isPending}
              onClick={() => endAttendance.mutate(confirmation)}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={endAttendance.isPending}
              onClick={() => setConfirmation(null)}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="clinical-end-actions">
          <Button
            type="button"
            icon={<ArrowRightIcon size={18} />}
            onClick={() => setConfirmation('forward')}
          >
            Encaminhar para médico
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmation('finish')}
          >
            Encerrar atendimento
          </Button>
        </div>
      )}

      {endAttendance.isError ? (
        <div className="compact-alert" role="alert">
          <WarningCircleIcon size={18} />
          {getApiErrorMessage(endAttendance.error)}
        </div>
      ) : null}
    </section>
  )
}
