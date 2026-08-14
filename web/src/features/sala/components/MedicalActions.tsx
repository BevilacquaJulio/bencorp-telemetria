import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircleIcon,
  FloppyDiskIcon,
  NotePencilIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '../../../components/ui/Button'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { getApiErrorMessage } from '../../../lib/api'
import { finalizeAttendance } from '../../atendimentos/atendimentos.api'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import {
  createMedicalRecord,
  getMedicalRecord,
  updateMedicalRecord,
} from '../../prontuario/prontuario.api'
import { medicalRecordSchema } from '../../prontuario/prontuario.schema'
import type {
  MedicalRecord,
  MedicalRecordInput,
} from '../../prontuario/prontuario.types'

type MedicalRecordForm = z.infer<typeof medicalRecordSchema>

type MedicalActionsProps = {
  attendance: AttendanceDetail
  onComplete: () => void
}

function toInput(values: MedicalRecordForm): MedicalRecordInput {
  return {
    anamnese: values.anamnese,
    conduta: values.conduta,
    prescricao: values.prescricao.trim() || null,
  }
}

export function MedicalActions({ attendance, onComplete }: MedicalActionsProps) {
  const queryClient = useQueryClient()
  const recordQuery = useQuery({
    queryKey: ['medical-record', attendance.id],
    queryFn: () => getMedicalRecord(attendance.id),
  })
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<MedicalRecordForm>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: { anamnese: '', conduta: '', prescricao: '' },
  })

  useEffect(() => {
    if (recordQuery.data) {
      reset({
        anamnese: recordQuery.data.anamnese,
        conduta: recordQuery.data.conduta,
        prescricao: recordQuery.data.prescricao ?? '',
      })
    }
  }, [recordQuery.data, reset])

  async function persistRecord(values: MedicalRecordForm) {
    const input = toInput(values)
    return recordQuery.data
      ? updateMedicalRecord({ recordId: recordQuery.data.id, input })
      : createMedicalRecord({ attendanceId: attendance.id, input })
  }

  function cacheRecord(record: MedicalRecord) {
    queryClient.setQueryData(['medical-record', attendance.id], record)
  }

  const save = useMutation({
    mutationFn: persistRecord,
    onSuccess: cacheRecord,
  })
  const finish = useMutation({
    mutationFn: async (values: MedicalRecordForm) => {
      const record = await persistRecord(values)
      cacheRecord(record)
      return finalizeAttendance(attendance.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue'] })
      onComplete()
    },
  })
  const triage = attendance.encaminhadoDe?.triagem ?? attendance.triagem
  const mutationError = save.error ?? finish.error

  if (recordQuery.isLoading) return <TableSkeleton rows={3} />
  if (recordQuery.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(recordQuery.error)}
        onRetry={() => void recordQuery.refetch()}
      />
    )
  }

  return (
    <section className="clinical-panel" aria-labelledby="medical-record-title">
      <header className="clinical-panel__heading">
        <span aria-hidden="true">
          <NotePencilIcon size={21} weight="duotone" />
        </span>
        <div>
          <h2 id="medical-record-title">Prontuário médico</h2>
          <p>Registre avaliação, conduta e prescrição durante a consulta.</p>
        </div>
      </header>

      {triage ? (
        <div className="triage-reference">
          <strong>Resumo da triagem</strong>
          <p>{triage.queixa}</p>
          <span>
            PA {triage.pa ?? '—'} · FC {triage.fc ?? '—'} · SpO₂{' '}
            {triage.satO2 ?? '—'}% · Temp. {triage.temperatura ?? '—'} °C
          </span>
        </div>
      ) : null}

      <form className="clinical-form" onSubmit={handleSubmit((values) => save.mutate(values))}>
        <label className="text-area-field">
          <span>Anamnese</span>
          <textarea rows={5} {...register('anamnese')} />
          {errors.anamnese ? <small>{errors.anamnese.message}</small> : null}
        </label>
        <label className="text-area-field">
          <span>Conduta</span>
          <textarea rows={4} {...register('conduta')} />
          {errors.conduta ? <small>{errors.conduta.message}</small> : null}
        </label>
        <label className="text-area-field">
          <span>Prescrição</span>
          <textarea rows={4} {...register('prescricao')} />
          {errors.prescricao ? <small>{errors.prescricao.message}</small> : null}
        </label>

        {mutationError ? (
          <div className="compact-alert" role="alert">
            <WarningCircleIcon size={18} />
            {getApiErrorMessage(mutationError)}
          </div>
        ) : null}

        {save.isSuccess && !save.isPending ? (
          <p className="clinical-save-success" role="status">
            <CheckCircleIcon size={17} /> Prontuário salvo.
          </p>
        ) : null}

        <div className="clinical-end-actions">
          <Button
            type="submit"
            variant="secondary"
            loading={save.isPending}
            disabled={finish.isPending}
            icon={<FloppyDiskIcon size={18} />}
          >
            Salvar prontuário
          </Button>
          <Button
            type="button"
            loading={finish.isPending}
            disabled={save.isPending}
            icon={<CheckCircleIcon size={18} />}
            onClick={() => void handleSubmit((values) => finish.mutate(values))()}
          >
            Salvar e finalizar
          </Button>
        </div>
      </form>
    </section>
  )
}
