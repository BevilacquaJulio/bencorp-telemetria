import { describe, expect, it } from 'vitest'
import { getAttendancePresentation } from '../attendance-status'
import type { PatientAttendance } from '../pacientes.types'

const baseAttendance: PatientAttendance = {
  id: 'atendimento-1',
  status: 'AGUARDANDO',
  risco: null,
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: null,
  finalizadoEm: null,
  canceladoEm: null,
  profissional: null,
  triagem: null,
}

describe('getAttendancePresentation', () => {
  it.each([
    ['AGUARDANDO', 'Paciente cadastrado'],
    ['EM_ANDAMENTO', 'Triagem pendente'],
    ['FINALIZADO', 'Atendimento finalizado'],
    ['CANCELADO', 'Atendimento cancelado'],
  ] as const)('explica o status %s', (status, expected) => {
    expect(getAttendancePresentation({ ...baseAttendance, status }).title).toBe(
      expected,
    )
  })

  it('diferencia atendimento em andamento com triagem registrada', () => {
    expect(
      getAttendancePresentation({
        ...baseAttendance,
        status: 'EM_ANDAMENTO',
        triagem: {
          queixa: 'Dor de cabeça',
          pa: null,
          fc: null,
          temperatura: null,
          satO2: null,
          criadoEm: '2026-08-14T12:10:00.000Z',
        },
      }).title,
    ).toBe('Triagem registrada')
  })
})
