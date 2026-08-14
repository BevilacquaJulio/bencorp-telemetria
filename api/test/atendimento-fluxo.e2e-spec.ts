import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Papel } from '../generated/prisma/client';
import { AppModule } from '../src/app.module';
import { FiltroDeExcecoes } from '../src/common/erros/filtro-excecoes';
import { PrismaService } from '../src/common/prisma/prisma.service';

const SENHA = 'Senha@123';

describe('Fluxo de atendimento (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pacienteId: string;
  let cpf: string;
  let tokenEnfermeiro: string;
  let tokenMedico: string;

  const autenticar = async (email: string): Promise<string> => {
    const resposta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: SENHA });
    expect(resposta.status).toBe(200);
    return (resposta.body as { token: string }).token;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.useGlobalFilters(new FiltroDeExcecoes());
    await app.init();
    prisma = app.get(PrismaService);

    const sufixo = randomUUID();
    const senhaHash = await bcrypt.hash(SENHA, 10);
    const [enfermeiro, medico] = await Promise.all([
      prisma.usuario.create({
        data: {
          nome: 'Enfermeira do fluxo E2E',
          email: `enfermeiro.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.ENFERMEIRO,
        },
      }),
      prisma.usuario.create({
        data: {
          nome: 'Médica do fluxo E2E',
          email: `medico.${sufixo}@e2e.local`,
          senhaHash,
          papel: Papel.MEDICO,
        },
      }),
    ]);

    cpf = `9${randomInt(10_000_000_000).toString().padStart(10, '0')}`;
    const paciente = await prisma.paciente.create({
      data: {
        nome: 'Paciente do fluxo E2E',
        cpf,
        contato: '(11) 99999-9999',
        nascimento: new Date('1990-01-15T00:00:00.000Z'),
      },
    });
    pacienteId = paciente.id;
    [tokenEnfermeiro, tokenMedico] = await Promise.all([
      autenticar(enfermeiro.email),
      autenticar(medico.email),
    ]);
  });

  afterAll(async () => {
    await app?.close();
  });

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('executa fila → triagem → encaminhamento médico sem vazar o encaminhamento', async () => {
    const inclusao = await request(app.getHttpServer())
      .post('/atendimentos')
      .set(bearer(tokenEnfermeiro))
      .send({ pacienteId });
    expect(inclusao.status).toBe(201);
    const atendimentoEnfermagem = (inclusao.body as { id: string }).id;

    const fila = await request(app.getHttpServer())
      .get('/atendimentos')
      .query({ busca: cpf, periodo: 'hoje' })
      .set(bearer(tokenEnfermeiro));
    expect(fila.status).toBe(200);
    expect(
      (fila.body as { itens: Array<{ id: string }> }).itens.some(
        ({ id }) => id === atendimentoEnfermagem,
      ),
    ).toBe(true);

    const inicio = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoEnfermagem}/iniciar`)
      .set(bearer(tokenEnfermeiro));
    expect(inicio.status).toBe(201);

    const triagem = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoEnfermagem}/triagem`)
      .set(bearer(tokenEnfermeiro))
      .send({
        risco: 'LARANJA',
        queixa: 'Dor torácica iniciada há duas horas',
        pa: '150/95',
        fc: 104,
        temperatura: 37.2,
        satO2: 96,
      });
    expect(triagem.status).toBe(201);
    expect((triagem.body as { risco: string }).risco).toBe('LARANJA');

    const triagemDuplicada = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoEnfermagem}/triagem`)
      .set(bearer(tokenEnfermeiro))
      .send({ risco: 'AMARELO', queixa: 'Tentativa duplicada' });
    expect(triagemDuplicada.status).toBe(409);
    expect((triagemDuplicada.body as { codigo: string }).codigo).toBe(
      'TRIAGEM_JA_REGISTRADA',
    );

    const cancelamentoInvalido = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoEnfermagem}/cancelar`)
      .set(bearer(tokenEnfermeiro));
    expect(cancelamentoInvalido.status).toBe(422);

    const encaminhamento = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoEnfermagem}/encaminhar`)
      .set(bearer(tokenEnfermeiro));
    expect(encaminhamento.status).toBe(201);
    const atendimentoMedico = (encaminhamento.body as { id: string }).id;

    const filaEnfermagem = await request(app.getHttpServer())
      .get('/atendimentos')
      .set(bearer(tokenEnfermeiro));
    expect(
      (filaEnfermagem.body as { itens: Array<{ id: string }> }).itens.some(
        ({ id }) => id === atendimentoMedico,
      ),
    ).toBe(false);

    const acessoDiretoEnfermeiro = await request(app.getHttpServer())
      .get(`/atendimentos/${atendimentoMedico}`)
      .set(bearer(tokenEnfermeiro));
    expect(acessoDiretoEnfermeiro.status).toBe(403);

    const inicioIndevidoEnfermeiro = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoMedico}/iniciar`)
      .set(bearer(tokenEnfermeiro));
    expect(inicioIndevidoEnfermeiro.status).toBe(403);

    const filaMedica = await request(app.getHttpServer())
      .get('/atendimentos')
      .set(bearer(tokenMedico));
    expect(
      (filaMedica.body as { itens: Array<{ id: string }> }).itens.some(
        ({ id }) => id === atendimentoMedico,
      ),
    ).toBe(true);

    const inicioMedico = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimentoMedico}/iniciar`)
      .set(bearer(tokenMedico));
    expect(inicioMedico.status).toBe(201);
    const detalhe = inicioMedico.body as {
      encaminhadoDe: { id: string; triagem: { queixa: string } };
    };
    expect(detalhe.encaminhadoDe.id).toBe(atendimentoEnfermagem);
    expect(detalhe.encaminhadoDe.triagem.queixa).toContain('Dor torácica');
  });

  it('o banco recusa transição que ignore o grafo de estados', async () => {
    const atendimento = await prisma.atendimento.create({
      data: { pacienteId },
      select: { id: true },
    });

    await expect(
      prisma.atendimento.update({
        where: { id: atendimento.id },
        data: { status: 'FINALIZADO', finalizadoEm: new Date() },
      }),
    ).rejects.toThrow();

    const preservado = await prisma.atendimento.findUnique({
      where: { id: atendimento.id },
      select: { status: true },
    });
    expect(preservado?.status).toBe('AGUARDANDO');
  });

  it('cancela somente enquanto o atendimento está aguardando', async () => {
    const atendimento = await prisma.atendimento.create({
      data: { pacienteId },
      select: { id: true },
    });
    const cancelamento = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimento.id}/cancelar`)
      .set(bearer(tokenMedico));

    expect(cancelamento.status).toBe(200);
    expect((cancelamento.body as { status: string }).status).toBe('CANCELADO');

    const repeticao = await request(app.getHttpServer())
      .post(`/atendimentos/${atendimento.id}/cancelar`)
      .set(bearer(tokenMedico));
    expect(repeticao.status).toBe(403);
  });
});
