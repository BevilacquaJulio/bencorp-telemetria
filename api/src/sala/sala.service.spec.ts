import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Papel, Participante } from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { LiveKitProvider } from './livekit.provider';
import { SalaRepository } from './sala.repository';
import { SalaService } from './sala.service';

const ATENDIMENTO = 'a0000000-0000-4000-8000-000000000001';
const USUARIO: UsuarioAutenticado = {
  id: 'b0000000-0000-4000-8000-000000000001',
  nome: 'Enfermeira Teste',
  email: 'enfermeira@teste.local',
  papel: Papel.ENFERMEIRO,
};

describe('SalaService', () => {
  let repo: jest.Mocked<SalaRepository>;
  let livekit: jest.Mocked<LiveKitProvider>;
  let service: SalaService;

  beforeEach(() => {
    repo = {
      registrarAcessoProfissionalSeAtivo: jest.fn(),
      registrarLinkPacienteSeAtivo: jest.fn(),
      buscarContextoDoLink: jest.fn(),
      consumirLinkERegistrarAcesso: jest.fn(),
      profissionalDoAtendimento: jest.fn(),
    } as unknown as jest.Mocked<SalaRepository>;
    livekit = {
      url: 'ws://livekit.test',
      nomeDaSala: jest.fn((id: string) => `atendimento-${id}`),
      identidadeDoProfissional: jest.fn((id: string) => `profissional:${id}`),
      identidadeDoPaciente: jest.fn((id: string) => `paciente:${id}`),
      emitirToken: jest.fn().mockResolvedValue('jwt-livekit'),
      encerrarSala: jest.fn(),
    } as unknown as jest.Mocked<LiveKitProvider>;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(900),
    } as unknown as ConfigService;
    service = new SalaService(repo, livekit, config);
  });

  it('emite acesso profissional e persiste somente o hash', async () => {
    repo.registrarAcessoProfissionalSeAtivo.mockResolvedValue(true);

    const resposta = await service.emitirTokenProfissional(
      ATENDIMENTO,
      USUARIO,
    );

    expect(resposta.token).toBe('jwt-livekit');
    expect(repo.registrarAcessoProfissionalSeAtivo.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        tokenHash: createHash('sha256').update('jwt-livekit').digest('hex'),
        participante: Participante.PROFISSIONAL,
      }),
    );
  });

  it('recusa emissão quando o atendimento não está ativo', async () => {
    repo.registrarAcessoProfissionalSeAtivo.mockResolvedValue(false);

    await expect(
      service.emitirTokenProfissional(ATENDIMENTO, USUARIO),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('não consome link inválido ou pertencente a outro atendimento', async () => {
    repo.buscarContextoDoLink.mockResolvedValue(null);

    await expect(
      service.entrarComoPaciente('a'.repeat(43), {
        atendimentoId: ATENDIMENTO,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(livekit.emitirToken.mock.calls).toHaveLength(0);
  });

  it('trata disputa pelo link como acesso negado', async () => {
    repo.buscarContextoDoLink.mockResolvedValue({
      expiraEm: new Date(Date.now() + 60_000),
      atendimento: { paciente: { id: 'p1', nome: 'Paciente' } },
    });
    repo.consumirLinkERegistrarAcesso.mockResolvedValue(false);

    await expect(
      service.entrarComoPaciente('a'.repeat(43), {
        atendimentoId: ATENDIMENTO,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('não desfaz a finalização quando o provedor está indisponível', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    repo.profissionalDoAtendimento.mockResolvedValue(USUARIO.id);
    livekit.encerrarSala.mockRejectedValue(new Error('LiveKit offline'));

    await expect(service.encerrar(ATENDIMENTO)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
