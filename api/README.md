# PAD — API

Backend NestJS + Prisma + PostgreSQL do Pronto Atendimento Digital.

Passo a passo de execução local, Docker, variáveis e testes está no
[README da raiz](../README.md). Este arquivo só descreve o que vive nesta pasta.

## Scripts

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev    # http://localhost:3000  — Swagger em /docs
npm test             # unitários (Jest)
npm run test:e2e     # E2E; exige DATABASE_URL em um banco pad_test*
```

`npm run db:deploy` aplica migrations e o seed — é o comando do serviço
`migrate` no Compose, não do container da API em runtime.

## Onde mexer

| Pasta | Responsabilidade |
|---|---|
| `src/atendimento/` | Fila, transições, triagem e concorrência |
| `src/paciente/` | Listagem e histórico autorizado |
| `src/prontuario/` | Prontuário, finalização e adendos |
| `src/sala/` | Tokens e LiveKit |
| `src/usuario/` | Administração de usuários |
| `src/common/` | Auth, guards, erros e auditoria |
| `prisma/` | Schema, migrations e seed |
| `test/` | E2E contra Postgres real |

Regras de domínio: [docs/invariantes.md](../docs/invariantes.md),
[docs/matriz-de-acesso.md](../docs/matriz-de-acesso.md) e
[docs/glossario.md](../docs/glossario.md).
