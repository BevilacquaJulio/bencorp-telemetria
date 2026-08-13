-- This is an empty migration.CREATE UNIQUE INDEX "uniq_profissional_atendimento_ativo"
CREATE UNIQUE INDEX "uniq_profissional_atendimento_ativo"
  ON "Atendimento" ("profissionalId")
  WHERE status = 'EM_ANDAMENTO';