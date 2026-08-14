CREATE OR REPLACE FUNCTION bloqueia_update_prontuario_finalizado()
RETURNS trigger AS $$
BEGIN
  IF OLD."finalizadoEm" IS NOT NULL THEN
    RAISE EXCEPTION 'PRONTUARIO_IMUTAVEL'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prontuario_imutavel
  BEFORE UPDATE ON "Prontuario"
  FOR EACH ROW EXECUTE FUNCTION bloqueia_update_prontuario_finalizado();