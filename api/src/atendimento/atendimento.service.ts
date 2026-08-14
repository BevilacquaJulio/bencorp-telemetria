import { Injectable, Logger } from '@nestjs/common';
import {
  Papel,
  Prisma,
  StatusAtendimento,
} from '../../generated/prisma/client';
import {
  AcessoNegado,
  ConflitoDeEstado,
  RecursoNaoEncontrado,
  TransicaoInvalida,
} from '../common/erros/erros';
import { AtendimentoRepository } from './atendimento.repository';
import {
  explicarTransicao,
  transicaoPermitida,
} from './dominio/maquina-estados';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import type { CriarAtendimentoDto } from './dto/criar-atendimento.schema';
import type { CriarTriagemDto } from './dto/criar-triagem.schema';
import type { ListarFilaDto } from './dto/listar-fila.schema';
import { SalaService } from '../sala/sala.service';

/** Violação de restrição única no Postgres, na numeração do Prisma. */
const P2002_UNICIDADE = 'P2002';

@Injectable()
export class AtendimentoService {
  private readonly logger = new Logger(AtendimentoService.name);

  constructor(
    private readonly repo: AtendimentoRepository,
    private readonly sala: SalaService,
  ) {}

  async listarFila(filtros: ListarFilaDto, usuario: UsuarioAutenticado) {
    const { itens, total } = await this.repo.listarFila(filtros, usuario);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
  }

  async criar(dto: CriarAtendimentoDto) {
    if (!(await this.repo.pacienteExiste(dto.pacienteId))) {
      throw new RecursoNaoEncontrado('Paciente');
    }
    const id = await this.repo.criar(dto);
    return this.detalhar(id);
  }

  async detalhar(id: string) {
    const atendimento = await this.repo.buscarPorId(id);

    // Aqui o 404 é seguro: o EscopoGuard já rodou antes e só deixa passar
    // quem tem vínculo, então não há como usar esta rota para descobrir
    // quais ids existem.
    if (!atendimento) {
      throw new RecursoNaoEncontrado('Atendimento');
    }

    return atendimento;
  }

  /**
   * Assume o atendimento.
   *
   * A leitura de status abaixo **não** é a proteção — é só o que permite
   * devolver um erro decente. A proteção de verdade está no `where` do
   * `updateMany` e no índice único parcial. Entre esta leitura e a escrita
   * existe uma janela de milissegundos em que outra requisição pode assumir
   * o mesmo atendimento; é justamente por isso que a condição é repetida no
   * banco.
   *
   * Três desfechos possíveis, e cada um vira um código diferente:
   *
   *   409 ATENDIMENTO_JA_ASSUMIDO   — alguém chegou primeiro
   *   409 JA_TEM_ATENDIMENTO_ATIVO  — quem chamou já está atendendo outro
   *   422 TRANSICAO_INVALIDA        — o atendimento está finalizado/cancelado
   *
   * Os dois primeiros compartilham o 409 porque ambos são conflito de estado,
   * mas o `codigo` no corpo os separa: a interface precisa dizer "esse
   * paciente já foi atendido por outro" ou "finalize o seu atual primeiro",
   * que são orientações completamente diferentes para o profissional.
   */
  async iniciar(id: string, usuario: UsuarioAutenticado) {
    const contexto = await this.repo.contextoParaInicio(id);
    const status = contexto?.status ?? null;

    if (status === null) {
      // 404 aqui não vaza nada: a fila inteira já é visível para os papéis
      // clínicos, então saber que um id existe não é informação nova.
      throw new RecursoNaoEncontrado('Atendimento');
    }

    if (usuario.papel === Papel.ENFERMEIRO && contexto?.encaminhadoDeId) {
      throw new AcessoNegado(
        'Atendimentos encaminhados são destinados ao papel médico',
      );
    }

    if (status !== StatusAtendimento.AGUARDANDO) {
      // Já em andamento é conflito (alguém chegou antes), não transição
      // absurda. Finalizado ou cancelado é transição absurda, e a máquina de
      // estados é quem diz isso.
      if (status === StatusAtendimento.EM_ANDAMENTO) {
        throw new ConflitoDeEstado(
          'Este atendimento já foi assumido por outro profissional',
          'ATENDIMENTO_JA_ASSUMIDO',
        );
      }

      if (!transicaoPermitida(status, StatusAtendimento.EM_ANDAMENTO)) {
        throw new TransicaoInvalida(
          explicarTransicao(status, StatusAtendimento.EM_ANDAMENTO),
        );
      }
    }

    let atualizados: number;
    try {
      atualizados = await this.repo.assumirSeAindaEstiverNaFila(id, usuario.id);
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === P2002_UNICIDADE
      ) {
        // Índice uniq_profissional_atendimento_ativo. O profissional já tem
        // um atendimento EM_ANDAMENTO — regra garantida pelo banco, não por
        // uma consulta prévia que teria a mesma janela de corrida que o
        // resto. Traduzir a violação é papel da aplicação; impedi-la é papel
        // do índice.
        throw new ConflitoDeEstado(
          'Você já tem um atendimento em andamento. Finalize-o antes de assumir outro',
          'JA_TEM_ATENDIMENTO_ATIVO',
        );
      }
      throw erro;
    }

    if (atualizados === 0) {
      // Perdeu a corrida entre a leitura de status e o UPDATE. O predicado
      // dentro do WHERE reavaliou contra a linha já alterada e não casou.
      this.logger.log(
        `Corrida perdida ao assumir o atendimento ${id} (profissional ${usuario.id})`,
      );
      throw new ConflitoDeEstado(
        'Este atendimento já foi assumido por outro profissional',
        'ATENDIMENTO_JA_ASSUMIDO',
      );
    }

    return this.detalhar(id);
  }

  async finalizar(id: string, usuario: UsuarioAutenticado) {
    const status = await this.exigirStatus(id);
    if (!transicaoPermitida(status, StatusAtendimento.FINALIZADO)) {
      throw new TransicaoInvalida(
        explicarTransicao(status, StatusAtendimento.FINALIZADO),
      );
    }
    if (
      usuario.papel === Papel.MEDICO &&
      !(await this.repo.prontuarioExiste(id))
    ) {
      throw new TransicaoInvalida(
        'O atendimento médico precisa de prontuário antes da finalização',
      );
    }

    const atualizados = await this.repo.finalizarSeEmAndamento(id, usuario.id);
    if (atualizados === 0) {
      throw new ConflitoDeEstado(
        'O atendimento mudou enquanto estava sendo finalizado',
        'ATENDIMENTO_ALTERADO',
      );
    }
    await this.sala.encerrar(id);
    return this.detalhar(id);
  }

  async cancelar(id: string) {
    const status = await this.exigirStatus(id);
    if (!transicaoPermitida(status, StatusAtendimento.CANCELADO)) {
      throw new TransicaoInvalida(
        explicarTransicao(status, StatusAtendimento.CANCELADO),
      );
    }

    const atualizados = await this.repo.cancelarSeAguardando(id);
    if (atualizados === 0) {
      throw new ConflitoDeEstado(
        'Outro profissional assumiu o atendimento antes do cancelamento',
        'ATENDIMENTO_JA_ASSUMIDO',
      );
    }
    return this.detalhar(id);
  }

  async encaminhar(id: string, profissionalId: string) {
    const status = await this.exigirStatus(id);
    if (!transicaoPermitida(status, StatusAtendimento.FINALIZADO)) {
      throw new TransicaoInvalida(
        explicarTransicao(status, StatusAtendimento.FINALIZADO),
      );
    }

    const novoId = await this.repo.encaminharSeEmAndamento(id, profissionalId);
    if (!novoId) {
      throw new ConflitoDeEstado(
        'O atendimento mudou enquanto estava sendo encaminhado',
        'ATENDIMENTO_ALTERADO',
      );
    }
    await this.sala.encerrar(id);
    return this.detalhar(novoId);
  }

  async criarTriagem(id: string, autorId: string, dto: CriarTriagemDto) {
    const status = await this.exigirStatus(id);
    if (status !== StatusAtendimento.EM_ANDAMENTO) {
      throw new TransicaoInvalida(
        'A triagem só pode ser registrada durante um atendimento em andamento',
      );
    }

    try {
      const atualizados = await this.repo.criarTriagem(id, autorId, dto);
      if (atualizados === 0) {
        throw new ConflitoDeEstado(
          'O atendimento mudou antes do registro da triagem',
          'ATENDIMENTO_ALTERADO',
        );
      }
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === P2002_UNICIDADE
      ) {
        throw new ConflitoDeEstado(
          'Este atendimento já possui triagem',
          'TRIAGEM_JA_REGISTRADA',
        );
      }
      throw erro;
    }

    return this.detalhar(id);
  }

  private async exigirStatus(id: string): Promise<StatusAtendimento> {
    const status = await this.repo.statusAtual(id);
    if (status === null) {
      throw new RecursoNaoEncontrado('Atendimento');
    }
    return status;
  }
}
