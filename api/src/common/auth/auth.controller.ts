import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../validacao/zod-validation.pipe';
import { AuthService, RespostaDeLogin } from './auth.service';
import { Publico } from './decorators/publico.decorator';
// `import type` no DTO é exigência do isolatedModules + emitDecoratorMetadata:
// o tipo aparece na assinatura decorada e não pode virar import de runtime.
import type { LoginDto } from './dto/login.schema';
import { loginSchema } from './dto/login.schema';

@ApiTags('auth')
@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Limite aplicado só aqui, e não globalmente: login é a única rota que um
  // atacante chama em volume (força bruta de senha). Guard global de
  // throttle atrapalharia o teste de concorrência, que dispara dez
  // requisições simultâneas de propósito.
  //
  // O ThrottlerGuard precisa ser aplicado explicitamente: `ThrottlerModule`
  // sozinho registra a configuração, não o guard. Sem esta linha o @Throttle
  // abaixo seria decoração inerte — o tipo de proteção que parece existir no
  // code review e não existe em produção.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autentica e devolve o token de acesso' })
  @ApiResponse({ status: 200, description: 'Autenticado' })
  @ApiResponse({ status: 400, description: 'Corpo inválido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Tentativas em excesso' })
  // Pipe no @Body, não em @UsePipes no método: o JwtAuthGuard lê metadata
  // do handler, e um @UsePipes no mesmo método já chegou a esconder o
  // @Publico() — login virava 401 para todo mundo, inclusive no e2e.
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
  ): Promise<RespostaDeLogin> {
    return this.auth.login(dto);
  }
}
