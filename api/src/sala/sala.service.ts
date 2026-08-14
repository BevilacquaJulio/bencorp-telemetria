import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { Participante, TipoTokenSala } from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { AcessoNegado, TransicaoInvalida } from '../common/erros/erros';
import type { EntrarSalaPacienteDto } from './dto/entrar-sala-paciente.schema';
import { LiveKitProvider } from './livekit.provider';
import { SalaRepository } from './sala.repository';

@Injectable()
export class SalaService {
  private readonly logger = new Logger(SalaService.name);
  private readonly ttlSegundos: number;

  constructor(
    private readonly repo: SalaRepository,
    private readonly livekit: LiveKitProvider,
    config: ConfigService,
  ) {
    this.ttlSegundos = config.getOrThrow<number>('SALA_TOKEN_TTL_SEG');
  }

  emitirTokenProfissional(atendimentoId: string, usuario: UsuarioAutenticado) {
    return this.criarAcessoProfissional(atendimentoId, usuario);
  }

  renovarTokenProfissional(atendimentoId: string, usuario: UsuarioAutenticado) {
    return this.criarAcessoProfissional(atendimentoId, usuario);
  }

  async criarLinkPaciente(atendimentoId: string, profissionalId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiraEm = this.novaExpiracao();
    const registrado = await this.repo.registrarLinkPacienteSeAtivo(
      {
        atendimentoId,
        tokenHash: this.hash(token),
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.LINK_PACIENTE,
        usuarioId: null,
        expiraEm,
      },
      profissionalId,
    );
    if (!registrado) {
      this.salaIndisponivel();
    }

    return {
      token,
      atendimentoId,
      expiraEm,
      // URL relativa: o frontend decide o domínio público sem o backend
      // precisar inferi-lo de cabeçalhos manipuláveis como Host.
      link: `/sala/${atendimentoId}?token=${token}`,
    };
  }

  async entrarComoPaciente(tokenOpaco: string, dto: EntrarSalaPacienteDto) {
    const agora = new Date();
    const tokenHash = this.hash(tokenOpaco);
    const contexto = await this.repo.buscarContextoDoLink(
      tokenHash,
      dto.atendimentoId,
      agora,
    );
    if (!contexto) {
      this.linkInvalido();
    }

    const ttlRestante = Math.max(
      1,
      Math.min(
        this.ttlSegundos,
        Math.floor((contexto.expiraEm.getTime() - agora.getTime()) / 1_000),
      ),
    );
    const token = await this.livekit.emitirToken({
      atendimentoId: dto.atendimentoId,
      identidade: this.livekit.identidadeDoPaciente(dto.atendimentoId),
      nome: contexto.atendimento.paciente.nome,
      participante: Participante.PACIENTE,
      ttlSegundos: ttlRestante,
    });
    const expiraEm = new Date(agora.getTime() + ttlRestante * 1_000);
    const consumido = await this.repo.consumirLinkERegistrarAcesso(
      tokenHash,
      {
        atendimentoId: dto.atendimentoId,
        tokenHash: this.hash(token),
        participante: Participante.PACIENTE,
        tipo: TipoTokenSala.ACESSO_LIVEKIT,
        usuarioId: null,
        expiraEm,
      },
      agora,
    );
    if (!consumido) {
      this.linkInvalido();
    }

    return this.respostaDeAcesso(
      token,
      dto.atendimentoId,
      Participante.PACIENTE,
      expiraEm,
    );
  }

  async encerrar(atendimentoId: string): Promise<void> {
    const profissionalId =
      await this.repo.profissionalDoAtendimento(atendimentoId);
    try {
      await this.livekit.encerrarSala(atendimentoId, profissionalId);
    } catch (erro) {
      // O banco já revogou as credenciais na mesma transação que finalizou o
      // atendimento. Falha transitória do provedor não pode desfazer o estado
      // clínico; fica explícita no log para retentativa operacional.
      this.logger.error(
        `Falha ao encerrar sala do atendimento ${atendimentoId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }

  private async criarAcessoProfissional(
    atendimentoId: string,
    usuario: UsuarioAutenticado,
  ) {
    const token = await this.livekit.emitirToken({
      atendimentoId,
      identidade: this.livekit.identidadeDoProfissional(usuario.id),
      nome: usuario.nome,
      participante: Participante.PROFISSIONAL,
      ttlSegundos: this.ttlSegundos,
    });
    const expiraEm = this.novaExpiracao();
    const registrado = await this.repo.registrarAcessoProfissionalSeAtivo({
      atendimentoId,
      tokenHash: this.hash(token),
      participante: Participante.PROFISSIONAL,
      tipo: TipoTokenSala.ACESSO_LIVEKIT,
      usuarioId: usuario.id,
      expiraEm,
    });
    if (!registrado) {
      this.salaIndisponivel();
    }

    return this.respostaDeAcesso(
      token,
      atendimentoId,
      Participante.PROFISSIONAL,
      expiraEm,
    );
  }

  private respostaDeAcesso(
    token: string,
    atendimentoId: string,
    participante: Participante,
    expiraEm: Date,
  ) {
    return {
      token,
      url: this.livekit.url,
      sala: this.livekit.nomeDaSala(atendimentoId),
      atendimentoId,
      participante,
      expiraEm,
    };
  }

  private novaExpiracao(): Date {
    return new Date(Date.now() + this.ttlSegundos * 1_000);
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private salaIndisponivel(): never {
    throw new TransicaoInvalida(
      'A sala só pode ser acessada durante um atendimento em andamento',
    );
  }

  private linkInvalido(): never {
    // A mesma resposta cobre token errado, expirado, revogado, reutilizado e
    // pertencente a outro atendimento. Diferenciar os casos criaria oráculo.
    throw new AcessoNegado('Link de acesso inválido ou expirado');
  }
}
