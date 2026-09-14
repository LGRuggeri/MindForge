"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ExecutarCodigoInput, ResultadoExecucaoCodigo } from "@/types/api";

export function useExecutarCodigo() {
  return useMutation({
    retry: false,
    mutationFn: async ({ exercicioId, ...dados }: ExecutarCodigoInput) => {
      const { data } = await api.post<ResultadoExecucaoCodigo>(
        `/sandbox/exercicios/${exercicioId}/executar`,
        dados,
        { timeout: 45000 },
      );
      return data;
    },
  });
}
