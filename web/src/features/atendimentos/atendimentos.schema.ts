import { z } from 'zod'
import type { TriageInput } from './atendimentos.types'

const optionalNumber = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= minimum &&
          Number(value) <= maximum),
      `${label} deve ficar entre ${minimum} e ${maximum}`,
    )

export const triageFormSchema = z.object({
  risco: z.enum(['VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL']),
  queixa: z.string().trim().min(3, 'Descreva a queixa principal').max(4_000),
  pa: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{2,3}\/\d{2,3}$/.test(value),
      'Use o formato 120/80',
    ),
  fc: optionalNumber('Frequência cardíaca', 20, 300),
  temperatura: optionalNumber('Temperatura', 30, 45),
  satO2: optionalNumber('Saturação', 50, 100),
})

export type TriageFormValues = z.infer<typeof triageFormSchema>

export function toTriageInput(values: TriageFormValues): TriageInput {
  return {
    risco: values.risco,
    queixa: values.queixa.trim(),
    pa: values.pa || undefined,
    fc: values.fc ? Number(values.fc) : undefined,
    temperatura: values.temperatura ? Number(values.temperatura) : undefined,
    satO2: values.satO2 ? Number(values.satO2) : undefined,
  }
}
