import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { renderComQuery } from "@/test/utils";
import ModuloPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "mod-1" }) }));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Conclusão na página do módulo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: "perfil-1", nome: "Ana", criadoEm: "" },
    });
  });

  it("exibe Concluído após salvar e consultar novamente o módulo", async () => {
    let status = "em_andamento";
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === "/planner/modulos/mod-1"
          ? { id: "mod-1", titulo: "Módulo teste", status }
          : [],
    }));
    vi.mocked(api.post).mockImplementation(async () => {
      status = "concluido";
      return { data: { id: "mod-1", status } };
    });
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await user.click(await screen.findByRole("button", { name: "Concluir" }));
    expect(
      await screen.findByRole("button", { name: "Concluído" }),
    ).toBeDisabled();
    expect(api.post).toHaveBeenCalledWith("/planner/modulos/mod-1/concluir", {
      perfilId: "perfil-1",
    });
  });

  it("não anuncia conclusão quando a API recusa o perfil", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === "/planner/modulos/mod-1"
          ? { id: "mod-1", titulo: "Módulo teste", status: "nao_iniciado" }
          : [],
    }));
    vi.mocked(api.post).mockRejectedValue(
      new Error("Módulo não pertence ao perfil informado"),
    );
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await user.click(await screen.findByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Concluir" })).toBeEnabled();
  });
});
