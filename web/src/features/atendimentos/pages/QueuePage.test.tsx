import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiErrorBody } from '../../../lib/api'
import { AuthContext, type AuthContextValue } from '../../auth/auth-context'
import { listQueue, startAttendance } from '../atendimentos.api'
import type {
  AttendanceDetail,
  AttendanceListItem,
  QueueResponse,
} from '../atendimentos.types'
import { QueuePage } from './QueuePage'

vi.mock('../atendimentos.api', () => ({
  listQueue: vi.fn(),
  startAttendance: vi.fn(),
}))

const mockedListQueue = vi.mocked(listQueue)
const mockedStartAttendance = vi.mocked(startAttendance)

const waitingAttendance: AttendanceListItem = {
  id: 'atendimento-1',
  status: 'AGUARDANDO',
  risco: 'AMARELO',
  entradaFila: '2026-08-14T12:00:00.000Z',
  iniciadoEm: null,
  paciente: {
    id: 'paciente-1',
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
  },
  profissional: null,
  encaminhadoDeId: null,
}

function queueResponse(itens: AttendanceListItem[]): QueueResponse {
  return {
    itens,
    total: itens.length,
    pagina: 1,
    porPagina: 10,
    paginas: itens.length > 0 ? 1 : 0,
  }
}

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const auth: AuthContextValue = {
    user: {
      id: 'medico-1',
      nome: 'Carla Nogueira',
      email: 'carla.nogueira@pad.local',
      papel: 'MEDICO',
    },
    token: 'token-teste',
    signIn: vi.fn(),
    signOut: vi.fn(),
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/fila']}>
          <Routes>
            <Route path="/fila" element={<QueuePage />} />
            <Route
              path="/atendimentos/:id/sala"
              element={<p>Sala profissional carregada</p>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function conflictError() {
  const data: ApiErrorBody = {
    codigo: 'ATENDIMENTO_JA_ASSUMIDO',
    mensagem: 'Este atendimento já foi assumido por outro profissional.',
  }
  const response: AxiosResponse<ApiErrorBody> = {
    data,
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }

  return new AxiosError(
    'Conflict',
    AxiosError.ERR_BAD_RESPONSE,
    response.config,
    undefined,
    response,
  )
}

describe('QueuePage', () => {
  beforeEach(() => {
    mockedListQueue.mockReset()
    mockedStartAttendance.mockReset()
  })

  it('apresenta o estado vazio sem quebrar a navegação', async () => {
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    expect(
      await screen.findByText('Nenhum atendimento encontrado'),
    ).toBeInTheDocument()
  })

  it('mostra uma falha de carregamento e permite tentar novamente', async () => {
    mockedListQueue.mockRejectedValue(new Error('indisponível'))
    renderQueue()

    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
  })

  it('envia a busca por nome para a consulta da fila', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([]))
    renderQueue()

    await screen.findByText('Nenhum atendimento encontrado')
    await user.type(screen.getByLabelText('Buscar atendimento'), 'Maria')

    expect(mockedListQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ busca: 'Maria', pagina: 1 }),
    )
  })

  it('explica o conflito quando outro profissional vence a disputa', async () => {
    const user = userEvent.setup()
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    mockedStartAttendance.mockRejectedValue(conflictError())
    renderQueue()

    const attendButtons = await screen.findAllByRole('button', { name: 'Atender' })
    await user.click(attendButtons[0])

    expect(mockedStartAttendance).toHaveBeenCalledWith(
      'atendimento-1',
      expect.anything(),
    )
    expect(
      await screen.findByText(
        'Este atendimento já foi assumido por outro profissional.',
      ),
    ).toBeInTheDocument()
  })

  it('abre a sala após assumir o atendimento com sucesso', async () => {
    const user = userEvent.setup()
    const attendance: AttendanceDetail = {
      ...waitingAttendance,
      status: 'EM_ANDAMENTO',
      iniciadoEm: '2026-08-14T12:05:00.000Z',
      finalizadoEm: null,
      canceladoEm: null,
      triagem: null,
      encaminhadoDe: null,
    }
    mockedListQueue.mockResolvedValue(queueResponse([waitingAttendance]))
    mockedStartAttendance.mockResolvedValue(attendance)
    renderQueue()

    const attendButtons = await screen.findAllByRole('button', { name: 'Atender' })
    await user.click(attendButtons[0])

    expect(await screen.findByText('Sala profissional carregada')).toBeInTheDocument()
  })
})
