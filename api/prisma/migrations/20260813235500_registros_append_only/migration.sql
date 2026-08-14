-- Adendos e logs são trilhas históricas. A aplicação não expõe UPDATE/DELETE,
-- e o banco repete a garantia para scripts e acessos fora da API.
CREATE OR REPLACE FUNCTION bloqueia_alteracao_registro_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'REGISTRO_APPEND_ONLY'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_adendo_append_only
  BEFORE UPDATE OR DELETE ON "ProntuarioAdendo"
  FOR EACH ROW EXECUTE FUNCTION bloqueia_alteracao_registro_append_only();

CREATE TRIGGER trg_auditoria_append_only
  BEFORE UPDATE OR DELETE ON "LogAuditoria"
  FOR EACH ROW EXECUTE FUNCTION bloqueia_alteracao_registro_append_only();
