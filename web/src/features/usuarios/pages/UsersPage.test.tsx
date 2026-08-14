import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createUser,
  listUsers,
  setUserActive,
  updateUserRole,
} from '../usuarios.api'
import type { UserListItem, UsersResponse } from '../usuarios.types'
import { UsersPage } from './UsersPage'

vi.mock('../usuarios.api', () => ({
  listUsers: vi.fn(),
  setUserActive: vi.fn(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
}))

const mockedListUsers = vi.mocked(listUsers)
const mockedSetUserActive = vi.mocked(setUserActive)
const mockedCreateUser = vi.mocked(createUser)
const mockedUpdateUserRole = vi.mocked(updateUserRole)

const nurse: UserListItem = {
  id: 'usuario-1',
  nome: 'Ana Ferreira',
  email: 'ana.ferreira@pad.local',
  papel: 'ENFERMEIRO',
  ativo: true,
  criadoEm: '2026-08-14T10:00:00.000Z',
}

const response: UsersResponse = {
  itens: [nurse],
  total: 1,
  pagina: 1,
  porPagina: 15,
  paginas: 1,
}

function renderUsers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>,
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    mockedListUsers.mockReset().mockResolvedValue(response)
    mockedSetUserActive.mockReset()
    mockedCreateUser.mockReset()
    mockedUpdateUserRole.mockReset()
  })

  it('permite alterar o perfil e suas permissões funcionais', async () => {
    const user = userEvent.setup()
    mockedUpdateUserRole.mockResolvedValue({ ...nurse, papel: 'MEDICO' })
    renderUsers()

    const roleControls = await screen.findAllByLabelText('Perfil de Ana Ferreira')
    await user.selectOptions(roleControls[0], 'MEDICO')

    expect(mockedUpdateUserRole).toHaveBeenCalledWith(
      { id: nurse.id, papel: 'MEDICO' },
      expect.anything(),
    )
  })

  it('cadastra um novo usuário com o perfil selecionado', async () => {
    const user = userEvent.setup()
    mockedCreateUser.mockResolvedValue({
      ...nurse,
      id: 'usuario-2',
      nome: 'Carlos Souza',
      email: 'carlos@pad.local',
      papel: 'MEDICO',
    })
    renderUsers()

    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await user.type(screen.getByLabelText('Nome completo'), 'Carlos Souza')
    await user.type(
      screen.getByLabelText('E-mail profissional'),
      'carlos@pad.local',
    )
    await user.type(screen.getByLabelText('Senha temporária'), 'Senha@123')
    await user.selectOptions(
      screen.getByLabelText('Perfil e permissões'),
      'MEDICO',
    )
    await user.click(screen.getByRole('button', { name: 'Cadastrar usuário' }))

    expect(mockedCreateUser).toHaveBeenCalledWith(
      {
        nome: 'Carlos Souza',
        email: 'carlos@pad.local',
        senha: 'Senha@123',
        papel: 'MEDICO',
      },
      expect.anything(),
    )
  })
})
