-- Distingue a credencial opaca, trocada uma única vez pelo paciente, do JWT
-- entregue ao SDK do LiveKit. Sem essa coluna os dois artefatos teriam a
-- mesma aparência no banco e seria fácil consumir ou renovar o tipo errado.
CREATE TYPE "TipoTokenSala" AS ENUM ('ACESSO_LIVEKIT', 'LINK_PACIENTE');

ALTER TABLE "SalaToken"
  ADD COLUMN "tipo" "TipoTokenSala" NOT NULL DEFAULT 'ACESSO_LIVEKIT';

DROP INDEX "SalaToken_atendimentoId_idx";

CREATE INDEX "SalaToken_atendimentoId_participante_tipo_revogadoEm_idx"
  ON "SalaToken"("atendimentoId", "participante", "tipo", "revogadoEm");
