import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Papel } from '../../generated/prisma/client';
import { Escopo } from '../common/auth/decorators/escopo.decorator';
import { Papeis } from '../common/auth/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/auth/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../common/auth/tipos';
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

  // Sem @Escopo de propósito. Assumir é a ação que **cria** o vínculo: exigir
  // vínculo prévio impediria assumir o primeiro atendimento da fila. Quem
  // pode assumir é decidido pelo papel, e o conflito é resolvido no banco.
  @Post(':id/iniciar')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assume um atendimento que está na fila' })
  @ApiResponse({ status: 201, description: 'Atendimento assumido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Papel sem permissão' })
  @ApiResponse({
    status: 409,
    description:
      'ATENDIMENTO_JA_ASSUMIDO (outro profissional chegou primeiro) ou ' +
      'JA_TEM_ATENDIMENTO_ATIVO (o solicitante já está atendendo)',
  })
  @ApiResponse({
    status: 422,
    description: 'Atendimento finalizado ou cancelado não pode ser assumido',
  })
  iniciar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    // O profissional vem do token, nunca do corpo: aceitar um profissionalId
    // enviado pelo cliente permitiria assumir um atendimento em nome de outro.
    return this.service.iniciar(id, usuario.id);
  }
}
