import { Injectable } from '@nestjs/common';
import { Prisma, StatusAtendimento } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ListarFilaDto } from './dto/listar-fila.schema';

// O repository isola o acesso ao Prisma. Ele existe sobretudo por causa do
// `assumirSeAindaEstiverNaFila` lá embaixo: é a consulta mais delicada do
// projeto e merece um lugar único, nomeado e óbvio.
@Injectable()
export class AtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarFila(filtros: ListarFilaDto) {
    const where: Prisma.AtendimentoWhereInput = {
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.risco ? { risco: filtros.risco } : {}),
    };

    // A ordenação espelha o índice [status, entradaFila]: filtra por status,
    // ordena por entrada. Quem chegou primeiro aparece primeiro — a fila não
    // é ordenada por risco de propósito, porque priorizar por gravidade é
    // decisão clínica do profissional, não do ORDER BY.
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.atendimento.findMany({
        where,
        orderBy: { entradaFila: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
        select: {
          id: true,
          status: true,
          risco: true,
          entradaFila: true,
          iniciadoEm: true,
          paciente: { select: { id: true, nome: true } },
          profissional: { select: { id: true, nome: true } },
        },
      }),
      this.prisma.atendimento.count({ where }),
    ]);

    return { itens, total };
  }

  /**
   * Assume o atendimento — a operação que o case inteiro gira em torno.
   *
   * A condição `status: AGUARDANDO` está **dentro do `where` do UPDATE**, e
   * não num `if` antes dele. Essa é a diferença entre correto e quase certo:
   *
   *   SQL gerado, em essência:
   *     UPDATE "Atendimento"
   *        SET status='EM_ANDAMENTO', "profissionalId"=$1, "iniciadoEm"=$2
   *      WHERE id=$3 AND status='AGUARDANDO';
   *
   * Com duas requisições simultâneas sob READ COMMITTED (padrão do Postgres),
   * a primeira pega o bloqueio da linha e comita. A segunda fica esperando
   * nesse mesmo bloqueio; quando ele é liberado, o Postgres **reavalia o
   * predicado contra a versão nova** da linha, encontra status='EM_ANDAMENTO'
   * e não atualiza nada. `count` volta 0 e o service transforma isso em 409.
   *
   * Uma ida ao banco, sem laço de repetição, sem transação explícita.
   *
   * Alternativas consideradas e por que não:
   *   - SELECT ... FOR UPDATE: duas idas ao banco e serializa a fila inteira.
   *   - Coluna de versão (optimistic locking): redundante — o próprio status
   *     já é a versão, e ele muda em toda transição.
   *   - SERIALIZABLE: obriga tratar 40001 e repetir a operação no cliente,
   *     complexidade sem ganho para um predicado simples como este.
   *
   * O `updateMany` (e não `update`) é proposital: `update` exige que o
   * registro exista e lança quando o `where` não casa, enquanto `updateMany`
   * devolve `count: 0` — que é exatamente o sinal que se quer aqui.
   */
  async assumirSeAindaEstiverNaFila(
    id: string,
    profissionalId: string,
  ): Promise<number> {
    const { count } = await this.prisma.atendimento.updateMany({
      where: { id, status: StatusAtendimento.AGUARDANDO },
      data: {
        status: StatusAtendimento.EM_ANDAMENTO,
        profissionalId,
        iniciadoEm: new Date(),
      },
    });

    return count;
  }

  async statusAtual(id: string): Promise<StatusAtendimento | null> {
    const atendimento = await this.prisma.atendimento.findUnique({
      where: { id },
      select: { status: true },
    });

    return atendimento?.status ?? null;
  }

  async buscarPorId(id: string) {
    return this.prisma.atendimento.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        risco: true,
        entradaFila: true,
        iniciadoEm: true,
        finalizadoEm: true,
        canceladoEm: true,
        paciente: {
          select: { id: true, nome: true, cpf: true, nascimento: true },
        },
        profissional: { select: { id: true, nome: true, papel: true } },
        triagem: {
          select: {
            queixa: true,
            pa: true,
            fc: true,
            temperatura: true,
            satO2: true,
            criadoEm: true,
          },
        },
      },
    });
  }
}
