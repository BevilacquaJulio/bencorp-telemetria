import { Injectable } from '@nestjs/common';
import { RecursoNaoEncontrado } from '../common/erros/erros';
import { AtendimentoRepository } from './atendimento.repository';
import { ListarFilaDto } from './dto/listar-fila.schema';

@Injectable()
export class AtendimentoService {
  constructor(private readonly repo: AtendimentoRepository) {}

  async listarFila(filtros: ListarFilaDto) {
    const { itens, total } = await this.repo.listarFila(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
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
}
