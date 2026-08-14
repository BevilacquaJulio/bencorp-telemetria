-- Impede que o mesmo profissional tenha dois atendimentos EM_ANDAMENTO.
-- O índice é parcial: só vale para as linhas nesse status, então um
-- profissional pode ter quantos atendimentos finalizados quiser.
--
-- É esta linha que sustenta a regra "um atendimento ativo por profissional"
-- mesmo com duas requisições simultâneas: a segunda viola o índice e o
-- Postgres devolve 23505, que a API traduz para 409.
CREATE UNIQUE INDEX "uniq_profissional_atendimento_ativo"
  ON "Atendimento" ("profissionalId")
  WHERE status = 'EM_ANDAMENTO';
