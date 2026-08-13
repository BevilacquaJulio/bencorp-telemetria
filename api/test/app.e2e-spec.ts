import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Aplicação (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /saude responde sem autenticação', async () => {
    const r = await request(app.getHttpServer()).get('/saude');
    expect(r.status).toBe(200);
    expect((r.body as { status: string }).status).toBe('ok');
  });

  // A rota inexistente precisa cair no 404 do Nest, e não ser engolida pelos
  // guards globais com um 401 — senão a API vira um oráculo às avessas.
  it('rota inexistente → 404', async () => {
    const r = await request(app.getHttpServer()).get('/nao-existe');
    expect(r.status).toBe(404);
  });
});
