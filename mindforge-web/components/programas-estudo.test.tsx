import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { renderComQuery } from "@/test/utils";
import { ProgramasEstudo } from "./programas-estudo";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const programa = {
  codigo: "CONCURSO",
  tipo: "concurso",
  nome: "Concurso de Libras",
  descricao: "Conhecimentos específicos",
  fonteOficial: "https://exemplo.org/edital",
  revisadoEm: "2026-10-03",
  dominios: [],
  modulos: [
    {
      titulo: "LDB",
      objetivoAprendizagem: "Aprender a LDB",
      tempoEstimadoMin: 45,
      topicosObrigatorios: ["Capítulo V"],
    },
    {
      titulo: "Ética",
      objetivoAprendizagem: "Distinguir atribuições",
      tempoEstimadoMin: 50,
      topicosObrigatorios: ["Código de ética"],
    },
  ],
};
describe("Programa pronto dentro dos objetivos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [programa] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "objetivo-a" } });
  });
  it("cria no perfil informado somente os módulos selecionados, sem exigir título digitado", async () => {
    const user = userEvent.setup();
    renderComQuery(<ProgramasEstudo perfilId="perfil-a" />);
    await screen.findByRole("option", { name: "Concurso de Libras" });
    await user.selectOptions(
      await screen.findByLabelText("Programa de estudo"),
      "CONCURSO",
    );
    await user.click(screen.getByRole("checkbox", { name: /Ética/ }));
    await user.click(screen.getByRole("button", { name: "Criar meu estudo" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/planner/objetivos",
        expect.objectContaining({
          perfilId: "perfil-a",
          titulo: "Concurso de Libras",
          programaCodigo: "CONCURSO",
          modulosIndices: [1],
        }),
      ),
    );
    expect(
      await screen.findByRole("link", { name: "Abrir minha trilha" }),
    ).toHaveAttribute("href", "/objetivos/objetivo-a");
  });
  it("desabilita criação sem módulos e reinicia a escolha ao trocar de perfil", async () => {
    const user = userEvent.setup();
    const view = renderComQuery(
      <ProgramasEstudo key="a" perfilId="perfil-a" />,
    );
    await screen.findByRole("option", { name: "Concurso de Libras" });
    await user.selectOptions(
      await screen.findByLabelText("Programa de estudo"),
      "CONCURSO",
    );
    await user.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(
      screen.getByRole("button", { name: "Criar meu estudo" }),
    ).toBeDisabled();
    view.rerender(
      <QueryClientProvider client={view.client}>
        <ProgramasEstudo key="b" perfilId="perfil-b" />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Programa de estudo")).toHaveValue("");
    expect(api.post).not.toHaveBeenCalled();
  });
});
