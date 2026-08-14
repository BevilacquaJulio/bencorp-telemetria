// Os testes não dependem de um servidor LiveKit em execução. As credenciais
// abaixo servem apenas para assinar e verificar JWTs dentro do processo; a
// integração de rede é substituída por fake no teste específico da sala.
process.env.NODE_ENV = 'test';
process.env.LIVEKIT_URL ??= 'ws://localhost:7880';
process.env.LIVEKIT_API_KEY ??= 'devkey';
process.env.LIVEKIT_API_SECRET ??= 'devsecretdevsecretdevsecret32chr';
