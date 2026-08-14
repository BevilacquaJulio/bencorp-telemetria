# Limitações conhecidas e abordagem escolhida

As limitações abaixo são explícitas para que o ambiente de demonstração não
seja confundido com uma implantação pronta para dados clínicos reais.

## 1. PWA ainda não concluída

O frontend possui a dependência `vite-plugin-pwa`, mas ainda não registra
service worker, manifest e ícones instaláveis. Portanto, nesta versão a
aplicação é responsiva, porém ainda não deve ser apresentada como PWA.

**Abordagem adotada:** priorizar primeiro autorização no backend, concorrência,
imutabilidade e sala temporária, porque são os riscos centrais do case.

**Próximo passo:** configurar manifest, ícones 192/512, atualização controlada do
service worker e cache apenas do shell estático. Dados clínicos e respostas
autenticadas não devem ser persistidos em cache offline.

## 2. LiveKit local não representa produção

O Compose executa uma instância única em modo de desenvolvimento, exposta por
HTTP/WebSocket local e sem TLS ou TURN configurado para redes corporativas.

**Abordagem adotada:** oferecer vídeo e chat reproduzíveis sem conta externa,
separando a URL interna usada pela API da URL pública usada pelo navegador.

**Para produção:** usar LiveKit Cloud ou uma implantação com `wss://`, domínio,
certificado confiável, TURN/TLS, firewall e monitoramento de conectividade.

## 3. Revogação antecipada no LiveKit self-hosted

A aplicação revoga as credenciais no banco, impede nova emissão, remove os
participantes e apaga a sala. Entretanto, um JWT LiveKit já emitido continua
criptograficamente válido até seu TTL no modo self-hosted; a revogação nativa
antecipada é uma capacidade dependente do provedor.

**Abordagem adotada:** TTL máximo de 15 minutos, tokens individuais, remoção de
participantes e `DeleteRoom` após o commit da finalização. Os endpoints da API
deixam de emitir ou trocar qualquer credencial imediatamente.

**Para garantia mais forte:** usar um provedor com revogação suportada e validar
reconexão real em teste de integração contra esse ambiente.

## 4. Integração LiveKit automatizada usa fake

Os testes unitários verificam grants e TTL do JWT. Os E2E verificam autorização,
uso único, revogação interna e encerramento por meio de um provider fake, sem
abrir uma conexão WebRTC real.

**Abordagem adotada:** manter a suíte determinística e independente de rede.

**Próximo passo:** adicionar uma suíte separada, executada sob demanda, que sobe
LiveKit e conecta dois navegadores com Playwright para validar câmera simulada,
chat, desconexão e tentativa de reconexão.

## 5. Cobertura automatizada do frontend é parcial

O frontend possui testes de login, validação e erro, mas fila, histórico,
administração e sala ainda dependem de testes E2E do backend e inspeção manual.

**Abordagem adotada:** concentrar a maior cobertura automática nas regras do
servidor, pois o frontend não deve ser a fronteira de segurança.

**Próximo passo:** cobrir rotas protegidas, estados loading/error/empty, filtros,
tratamento do `409`, link revogado e diferenças visuais por papel.

## 6. Sessão do profissional no navegador

O access token é mantido na sessão do navegador para restaurar a navegação após
reload. Isso é mais simples para o recorte, mas continua exposto a JavaScript em
caso de XSS e não há fluxo de refresh token.

**Abordagem adotada:** token com expiração, Helmet, ausência de HTML arbitrário e
nenhum segredo de infraestrutura no bundle.

**Para produção:** preferir cookie `HttpOnly`, `Secure` e `SameSite`, com access
token curto, rotação de refresh token e proteção CSRF adequada.

## 7. Observabilidade básica

Há healthcheck e logs do NestJS, mas não existem métricas Prometheus, tracing
distribuído, correlação de requisições ou alertas.

**Abordagem adotada:** auditoria clínica fica separada de logs operacionais e é
persistida de forma append-only.

**Para produção:** logs JSON com correlation ID, métricas RED, tracing para
PostgreSQL/LiveKit e alertas de erro, latência e indisponibilidade.

## 8. Ambiente Docker é para avaliação local

As imagens usam builds multi-stage, usuário não-root na API, healthchecks,
limites de recursos e rotação de logs. Mesmo assim, o Compose publica portas
diretamente e não inclui proxy TLS, gestão externa de segredos, backup ou alta
disponibilidade.

**Abordagem adotada:** maximizar a reprodução local com um único comando.

**Para produção:** usar secrets do orquestrador, proxy com HTTPS, banco gerenciado
ou backup testado, imagens fixadas por digest, scanner de vulnerabilidades e
pipeline que execute migrations antes do rollout.

## 9. Dados e conformidade

O seed contém apenas dados fictícios. A solução não foi submetida a uma análise
formal de LGPD, retenção, consentimento, criptografia de campos ou políticas de
backup de prontuário.

**Abordagem adotada:** impedir acesso indevido por autenticação, papel, vínculo e
auditoria, sem alegar conformidade regulatória completa.

**Para produção:** DPIA/relatório de impacto, classificação de dados, retenção,
criptografia em trânsito e repouso, gestão de consentimento e processo de
resposta a incidentes.

## 10. Escala e disponibilidade

A topologia é single-node. PostgreSQL, API e LiveKit são pontos únicos de falha.

**Abordagem adotada:** monólito modular e infraestrutura mínima, suficientes para
demonstrar regras de negócio e concorrência.

**Para produção:** réplicas stateless da API, PostgreSQL com backup/replicação,
LiveKit dimensionado para banda e CPU e testes de carga com metas explícitas.
