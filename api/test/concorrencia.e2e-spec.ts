import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { Papel } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * O teste que sustenta a regra 1 do enunciado.
 *
 * Roda contra o Postgres de verdade porque é a única forma de exercitar o que
 * está sendo afirmado: que o predicado dentro do `WHERE` é reavaliado depois
 * do bloqueio de linha. Com Prisma mockado, este arquivo passaria mesmo se a
 * implementação fosse um `if` seguido de `update` — que é exatamente o bug
 * que ele existe para pegar.
 *
 * Pré-requisito: `npx prisma migrate reset` (migrations + seed).
 */

const SENHA = 'Senha@123';
const TENTATIVAS = 10;

// Atendimento AGUARDANDO, já triado com risco VERMELHO. Ver prisma/seed.ts.
const ALVO = 'c0000000-0000-4000-8000-000000000003';

// Profissionais só deste arquivo. Os quatro clínicos do seed já têm
// EM_ANDAMENTO (o índice único parcial), então usá-los faria todo iniciar
// devolver JA_TEM_ATENDIMENTO_ATIVO — e o teste deixaria de medir a corrida
// pelo mesmo atendimento, que é o que a regra 1 pede.
const CONCORRENTES = [
  'concorrente.1@pad.local',
  'concorrente.2@pad.local',
  'concorrente.3@pad.local',
];

describe('Concorrência ao assumir atendimento (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tokens: string[] = [];

  const logar = async (email: string): Promise<string> => {
    const r = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: SENHA });

    expect(r.status).toBe(200);
    return (r.body as { token: string }).token;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    app.useGlobalFilters(new FiltroDeExcecoes());
    await app.init();

    prisma = app.get(PrismaService);

    const senhaHash = await bcrypt.hash(SENHA, 10);
    for (const email of CONCORRENTES) {
      await prisma.usuario.upsert({
        where: { email },
        update: { senhaHash, ativo: true },
        create: {
          nome: email,
          email,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      });
      tokens.push(await logar(email));
    }
  });

  beforeEach(async () => {
    // Devolve o alvo para a fila. O teste precisa partir sempre do mesmo
    // estado, e rodar a suíte duas vezes seguidas não pode mudar o resultado.
    await prisma.atendimento.update({
      where: { id: ALVO },
      data: {
        status: 'AGUARDANDO',
        profissionalId: null,
        iniciadoEm: null,
      },
    });

    // Solta só os concorrentes deste arquivo. Não mexe nos EM_ANDAMENTO do
    // seed (Carla, Diego…): a matriz de autorização roda em paralelo e
    // depende deles continuarem vinculados.
    await prisma.atendimento.updateMany({
      where: {
        status: 'EM_ANDAMENTO',
        profissional: { email: { in: [...CONCORRENTES] } },
      },
      data: { status: 'AGUARDANDO', profissionalId: null, iniciadoEm: null },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it(`${TENTATIVAS} requisições simultâneas: exatamente 1 sucesso e ${TENTATIVAS - 1} conflitos`, async () => {
    // Todas partem juntas. Sem Promise.all elas viram uma fila e o teste
    // deixa de testar concorrência.
    const respostas = await Promise.all(
      Array.from({ length: TENTATIVAS }, (_, i) =>
        request(app.getHttpServer())
          .post(`/atendimentos/${ALVO}/iniciar`)
          .set({ Authorization: `Bearer ${tokens[i % tokens.length]}` }),
      ),
    );

    const criados = respostas.filter((r) => r.status === 201);
    const conflitos = respostas.filter((r) => r.status === 409);

    expect(criados).toHaveLength(1);
    expect(conflitos).toHaveLength(TENTATIVAS - 1);

    // Nenhuma resposta pode ter sido 500: perder a corrida é um desfecho
    // previsto, não um erro do servidor.
    expect(respostas.every((r) => r.status < 500)).toBe(true);
  });

  it('o vencedor é quem ficou gravado no banco', async () => {
    const respostas = await Promise.all(
      Array.from({ length: TENTATIVAS }, (_, i) =>
        request(app.getHttpServer())
          .post(`/atendimentos/${ALVO}/iniciar`)
          .set({ Authorization: `Bearer ${tokens[i % tokens.length]}` }),
      ),
    );

    const vencedora = respostas.find((r) => r.status === 201);
    expect(vencedora).toBeDefined();

    const gravado = await prisma.atendimento.findUnique({
      where: { id: ALVO },
      select: { status: true, profissionalId: true, iniciadoEm: true },
    });

    const corpo = vencedora?.body as {
      profissional: { id: string } | null;
      status: string;
    };

    expect(gravado?.status).toBe('EM_ANDAMENTO');
    expect(gravado?.profissionalId).toBe(corpo.profissional?.id);
    expect(gravado?.iniciadoEm).not.toBeNull();
  });

  it('conflito responde com o código que explica o motivo', async () => {
    const [primeira, segunda] = await Promise.all([
      request(app.getHttpServer())
        .post(`/atendimentos/${ALVO}/iniciar`)
        .set({ Authorization: `Bearer ${tokens[0]}` }),
      request(app.getHttpServer())
        .post(`/atendimentos/${ALVO}/iniciar`)
        .set({ Authorization: `Bearer ${tokens[1]}` }),
    ]);

    const perdedora = [primeira, segunda].find((r) => r.status === 409);
    expect(perdedora).toBeDefined();
    expect((perdedora?.body as { codigo: string }).codigo).toBe(
      'ATENDIMENTO_JA_ASSUMIDO',
    );
  });

  it('tentativa sequencial depois de assumido também é 409', async () => {
    const primeira = await request(app.getHttpServer())
      .post(`/atendimentos/${ALVO}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });
    expect(primeira.status).toBe(201);

    const segunda = await request(app.getHttpServer())
      .post(`/atendimentos/${ALVO}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[1]}` });

    expect(segunda.status).toBe(409);
    expect((segunda.body as { codigo: string }).codigo).toBe(
      'ATENDIMENTO_JA_ASSUMIDO',
    );
  });

  it('profissional que já tem atendimento ativo não assume outro', async () => {
    // Regra 2, garantida pelo índice único parcial. Primeiro assume o alvo,
    // depois tenta assumir um segundo atendimento que está na fila.
    const primeiro = await request(app.getHttpServer())
      .post(`/atendimentos/${ALVO}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });
    expect(primeiro.status).toBe(201);

    const outroDaFila = await prisma.atendimento.findFirst({
      where: { status: 'AGUARDANDO', id: { not: ALVO } },
      select: { id: true },
    });
    expect(outroDaFila).not.toBeNull();

    const segundo = await request(app.getHttpServer())
      .post(`/atendimentos/${outroDaFila?.id}/iniciar`)
      .set({ Authorization: `Bearer ${tokens[0]}` });

    expect(segundo.status).toBe(409);
    expect((segundo.body as { codigo: string }).codigo).toBe(
      'JA_TEM_ATENDIMENTO_ATIVO',
    );
  });
});
