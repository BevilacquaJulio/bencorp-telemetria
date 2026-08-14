-- A API valida primeiro para devolver 422 com uma mensagem útil, mas a
-- garantia precisa sobreviver a bugs no service, scripts e múltiplas
-- instâncias. O trigger é a última barreira do grafo definido pelo case.
CREATE OR REPLACE FUNCTION valida_transicao_status_atendimento()
RETURNS trigger AS $$
BEGIN
  -- Atualizações de outros campos não são transições e continuam permitidas.
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'AGUARDANDO'
     AND NEW.status IN ('EM_ANDAMENTO', 'CANCELADO') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'EM_ANDAMENTO' AND NEW.status = 'FINALIZADO' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'TRANSICAO_ATENDIMENTO_INVALIDA: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transicao_status_atendimento
  BEFORE UPDATE OF status ON "Atendimento"
  FOR EACH ROW EXECUTE FUNCTION valida_transicao_status_atendimento();
