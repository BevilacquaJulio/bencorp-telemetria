import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ListarFilaDto } from './dto/listar-fila.schema';

// O repository isola o acesso ao Prisma. Neste bloco ele parece uma camada
// fina demais; ele existe porque o `updateMany` condicional do bloco de
// concorrência mora aqui, e é a consulta mais delicada do projeto — ter um
// lugar único e testável para ela vale a indireção.
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
