import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Papel } from '../../generated/prisma/client';
import { Escopo } from '../common/auth/decorators/escopo.decorator';
import { Papeis } from '../common/auth/decorators/papeis.decorator';
import { ZodValidationPipe } from '../common/validacao/zod-validation.pipe';
import { AtendimentoService } from './atendimento.service';
// `import type` no DTO: com isolatedModules + emitDecoratorMetadata, tipo em
// assinatura decorada não pode ser importado como valor.
import type { ListarFilaDto } from './dto/listar-fila.schema';
import { listarFilaSchema } from './dto/listar-fila.schema';

@ApiTags('atendimentos')
@ApiBearerAuth()
@Controller('atendimentos')
export class AtendimentoController {
  constructor(private readonly service: AtendimentoService) {}

  // ADMIN fica de fora de propósito: a fila mostra nome, contato e risco —
  // dado clínico identificável. Ver docs/matriz-de-acesso.md, linha 2.
  @Get()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @ApiOperation({ summary: 'Lista a fila de atendimentos' })
  @ApiResponse({ status: 200, description: 'Fila paginada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Papel sem acesso à fila' })
  listarFila(
    @Query(new ZodValidationPipe(listarFilaSchema)) filtros: ListarFilaDto,
  ) {
    return this.service.listarFila(filtros);
  }

  // `permitirSemVinculo` porque o profissional precisa abrir o atendimento da
  // fila antes de assumir — nesse momento ninguém está vinculado ainda.
  // Depois que alguém assume, só o dono enxerga.
  @Get(':id')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: true })
  @ApiOperation({ summary: 'Detalha um atendimento' })
  @ApiResponse({ status: 200, description: 'Atendimento' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem vínculo com o atendimento' })
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalhar(id);
  }
}
