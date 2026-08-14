# PAD — Pronto Atendimento Digital

Recorte de uma plataforma de teleatendimento ocupacional desenvolvido para o
case técnico da BenCorp. O sistema organiza a fila assistencial, controla o
acesso por perfil e vínculo, permite triagem e prontuário, mantém auditoria de
acessos e cria salas temporárias de vídeo e chat com LiveKit.

## Funcionalidades

- Fila com busca por nome/CPF, status e período.
- Perfis `ENFERMEIRO`, `MEDICO` e `ADMIN`, com autorização no backend.
- Concorrência segura ao assumir um atendimento.
- Triagem, encaminhamento, prontuário imutável e correções por adendo.
- Histórico do paciente limitado ao escopo assistencial de cada perfil.
- Auditoria de leituras permitidas e tentativas negadas.
- Sala LiveKit com JWT curto, renovação e link opaco de uso único para paciente.
- Interface React responsiva para desktop e dispositivos móveis.
- PWA instalável com atualização controlada e cache restrito ao shell estático.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node.js 24 LTS, NestJS, TypeScript, Zod, Jest e Supertest |
| Dados | PostgreSQL 16, Prisma 7 e migrations versionadas |
| Frontend | React 19, Vite, TypeScript, TanStack Query, React Router, React Hook Form, Zod e Vitest |
| Vídeo e chat | LiveKit Server e SDKs oficiais |
| Infraestrutura | Docker Compose, Dockerfiles multi-stage e Nginx |

## Arquitetura

```mermaid
flowchart LR
    U["Profissional ou paciente"] --> W["Nginx + React"]
    W -->|"/api"| A["NestJS API"]
    A --> D[("PostgreSQL")]
    A -->|"emissão e encerramento"| L["LiveKit"]
    U -->|"vídeo, áudio e chat"| L
    M["Prisma migrate + seed"] --> D
```

No Docker, o navegador usa apenas a origem do frontend. O Nginx encaminha
`/api/*` para a API, evitando uma configuração de CORS desnecessária no fluxo
principal. A API usa a rede interna para administrar o LiveKit e devolve ao
navegador uma URL pública separada.

## Estrutura do repositório

```text
.
├── api/
│   ├── prisma/                 # schema, migrations e seed idempotente
│   ├── src/
│   │   ├── atendimento/        # fila, transições, triagem e concorrência
│   │   ├── paciente/           # listagem e histórico autorizado
│   │   ├── prontuario/         # prontuário, finalização e adendos
│   │   ├── sala/               # tokens e integração LiveKit
│   │   ├── usuario/            # administração de usuários
│   │   └── common/             # autenticação, guards, erros e auditoria
│   ├── test/                   # testes E2E com Postgres real
│   └── Dockerfile
├── web/
│   ├── src/app/                # providers e rotas
│   ├── src/features/           # módulos funcionais por domínio
│   ├── src/components/         # componentes compartilhados
│   ├── nginx.conf              # SPA fallback e proxy /api
│   └── Dockerfile
├── docs/                       # regras de domínio e decisões técnicas
├── docker-compose.yml
└── .env.example
```

## Execução completa via Docker

### Pré-requisitos

- Docker Desktop com Docker Compose v2.
- Portas `3000`, `5432`, `7880`, `7881`, `7882/udp` e `8080` livres.
- Pelo menos 2 GB de memória disponível para os containers.

### 1. Configure o ambiente

No PowerShell, na raiz do projeto:

```powershell
Copy-Item .env.example .env
```

Os valores do exemplo funcionam apenas para demonstração local. Troque
`JWT_SECRET`, `POSTGRES_PASSWORD` e `LIVEKIT_API_SECRET` em qualquer ambiente
compartilhado.

### 2. Valide e suba os serviços

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

O Compose executa automaticamente, nesta ordem:

1. PostgreSQL e LiveKit;
2. migrations e seed pelo serviço one-off `migrate`;
3. API após banco, migrations e LiveKit estarem prontos;
4. frontend após a API ficar saudável.

### 3. Acesse

| Recurso | Endereço |
|---|---|
| Aplicação | <http://localhost:8080> |
| Saúde da API | <http://localhost:3000/saude> |
| Swagger | <http://localhost:3000/docs> |
| LiveKit WebSocket | `ws://localhost:7880` |

Para acompanhar a inicialização:

```powershell
docker compose logs -f migrate api web livekit
```

Para encerrar preservando os dados:

```powershell
docker compose down
```

Para remover também o volume do PostgreSQL e todos os dados locais:

```powershell
docker compose down -v
```

> O último comando é destrutivo e deve ser usado somente em ambiente local.

## Execução local para desenvolvimento

Esta opção mantém banco e LiveKit no Docker, mas executa API e frontend com hot
reload na máquina.

### 1. Infraestrutura

```powershell
Copy-Item .env.example .env
docker compose up -d db livekit
```

### 2. API

Em um terminal:

```powershell
cd api
Copy-Item .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

### 3. Frontend

Em outro terminal:

```powershell
cd web
npm ci
npm run dev
```

A aplicação estará em <http://localhost:5173>, consumindo a API em
<http://localhost:3000>.

## Usuários de demonstração

Todos usam a senha `Senha@123`.

| Perfil | E-mail |
|---|---|
| Administrador | `admin@pad.local` |
| Enfermeiro | `ana.ferreira@pad.local` |
| Enfermeiro | `bruno.castro@pad.local` |
| Médico | `carla.nogueira@pad.local` |
| Médico | `diego.ramos@pad.local` |

Essas credenciais existem apenas no seed de desenvolvimento.

## Testes

O workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) executa em
pull requests e pushes para `main` ou `feat/**`: lint, testes unitários, E2E com
PostgreSQL isolado, builds da API e da PWA e construção das imagens Docker.

### Backend unitário

```powershell
cd api
npm test
npm run test:cov
```

### Backend E2E

Os testes E2E escrevem dados. Use um banco exclusivo, nunca um banco real ou o
banco manual de demonstração.

```powershell
docker exec pad-db psql -U pad -d postgres -c "CREATE DATABASE pad_test;"

cd api
$env:DATABASE_URL="postgresql://pad:pad@localhost:5432/pad_test?schema=public"
npx prisma migrate deploy
npx prisma db seed
npm run test:e2e -- --runInBand
Remove-Item Env:DATABASE_URL
```

Se `pad_test` já existir, ignore a etapa de criação.

### Frontend

```powershell
cd web
npm run lint
npm run build
npm test
```

### PWA e instalação

O manifesto e o service worker são gerados apenas no build de produção. Para
validar a instalação localmente:

```powershell
cd web
npm run build
npm run preview
```

Abra <http://localhost:4173> e use a opção **Instalar PAD BenCorp** oferecida
pelo navegador. No ambiente Docker, a mesma validação pode ser feita em
<http://localhost:8080>.

O cache offline contém somente HTML, CSS, JavaScript, fontes e imagens do shell.
Chamadas `/api`, autenticação, prontuários, pacientes e demais dados
assistenciais permanecem `NetworkOnly` e exigem conexão com o servidor.

## Variáveis principais

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão Prisma; no Docker o host é `db` |
| `JWT_SECRET` | Assinatura dos tokens dos profissionais |
| `SALA_TOKEN_TTL_SEG` | Vida do token da sala; máximo de 900 segundos |
| `LIVEKIT_URL` | URL interna usada pela API para administrar salas |
| `LIVEKIT_PUBLIC_URL` | URL devolvida ao navegador para entrar na chamada |
| `LIVEKIT_API_KEY` | Chave do servidor LiveKit |
| `LIVEKIT_API_SECRET` | Segredo do servidor LiveKit |
| `CORS_ORIGIN` | Origem permitida quando a API é acessada diretamente |

O contrato completo está em [.env.example](./.env.example) e
[api/.env.example](./api/.env.example).

## Segurança e regras de domínio

- O frontend nunca é a barreira principal de autorização.
- Guards globais combinam autenticação, papel e vínculo com o recurso.
- O banco garante exclusividade do profissional ativo e imutabilidade clínica.
- Tokens opacos de paciente são armazenados somente como SHA-256.
- A auditoria registra acessos permitidos e negados sem copiar conteúdo clínico.
- Migrations são aplicadas antes da API, nunca durante o build da imagem.

Documentos relacionados:

- [Invariantes do sistema](./docs/invariantes.md)
- [Matriz de acesso](./docs/matriz-de-acesso.md)
- [Glossário do domínio](./docs/glossario.md)
- [Decisões técnicas e trade-offs](./docs/decisoes-tecnicas.md)
- [Limitações conhecidas](./docs/limitacoes.md)

## Decisões e limitações

As decisões arquiteturais, alternativas rejeitadas e consequências estão em
[docs/decisoes-tecnicas.md](./docs/decisoes-tecnicas.md). As limitações atuais,
inclusive o escopo offline da PWA, LiveKit self-hosted, cobertura frontend e requisitos para
produção, estão registradas em [docs/limitacoes.md](./docs/limitacoes.md).

## Uso de IA

IA generativa foi utilizada como apoio para exploração de alternativas,
scaffolding, revisão, testes e documentação. As regras críticas foram
materializadas em migrations, testes automatizados e documentação para que as
decisões possam ser verificadas e explicadas sem depender da ferramenta. A
responsabilidade pela revisão, execução e defesa técnica permanece humana.
