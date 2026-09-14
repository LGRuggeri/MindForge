import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { criarQueryClientTeste } from "@/test/utils";
import { useMarcarProgressoModulo } from "./useModulos";

vi.mock("@/lib/api", () => ({ api: { post: vi.fn() } }));

describe("Conclusão de módulo na interface", () => {
  it("usa a rota de conclusão e atualiza módulo, objetivos e grafo", async () => {
    const client = criarQueryClientTeste();
    for (const key of [
      ["modulos", "mod-1"],
      ["objetivos", "perfil-1"],
      ["objetivos", "obj-1"],
      ["knowledge-graph", "perfil", "perfil-1"],
    ]) {
      client.setQueryData(key, { status: "em_andamento" });
    }
    vi.mocked(api.post).mockResolvedValue({
      data: { id: "mod-1", status: "concluido" },
    });
    const { result } = renderHook(() => useMarcarProgressoModulo(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await act(() =>
      result.current.mutateAsync({ moduloId: "mod-1", perfilId: "perfil-1" }),
    );
    expect(api.post).toHaveBeenCalledWith("/planner/modulos/mod-1/concluir", {
      perfilId: "perfil-1",
    });
    expect(client.getQueryState(["modulos", "mod-1"])?.isInvalidated).toBe(
      true,
    );
    expect(client.getQueryState(["objetivos", "perfil-1"])?.isInvalidated).toBe(
      true,
    );
    expect(client.getQueryState(["objetivos", "obj-1"])?.isInvalidated).toBe(
      true,
    );
    expect(
      client.getQueryState(["knowledge-graph", "perfil", "perfil-1"])
        ?.isInvalidated,
    ).toBe(true);
  });
});
