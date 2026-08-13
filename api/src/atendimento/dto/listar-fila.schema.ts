import { z } from 'zod';
import { Risco, StatusAtendimento } from '../../../generated/prisma/client';

// Query string chega sempre como texto, então os números vêm com coerce.
export const listarFilaSchema = z.object({
  status: z.enum(StatusAtendimento).optional(),
  risco: z.enum(Risco).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListarFilaDto = z.infer<typeof listarFilaSchema>;
