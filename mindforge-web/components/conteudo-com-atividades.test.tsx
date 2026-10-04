import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { renderComQuery } from "@/test/utils";
import { ConteudoComAtividades } from "./conteudo-com-atividades";
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
const conteudo = {
  id: "c",
  corpoMarkdown:
    "## Exemplo\n1. Pergunta do exemplo\n\n## 5. Atividades\n\n1. Compare as modalidades.\n2. Analise o caso.\n\n<details><summary>Critérios</summary>Critério de resposta.</details>",
};
const atividades = [
  {
    chave: "a1",
    numero: 1,
    linhaInicial: 6,
    enunciado: "Compare as modalidades.",
    resposta: { texto: "Resposta anterior", atualizadoEm: "" },
  },
  {
    chave: "a2",
    numero: 2,
    linhaInicial: 7,
    enunciado: "Analise o caso.",
    resposta: null,
  },
];
describe("Respostas nas perguntas dentro da aula", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: atividades });
    vi.mocked(api.put).mockResolvedValue({
      data: { texto: "Resposta editada", atualizadoEm: "" },
    });
  });
  it("insere campo abaixo de cada pergunta e retoma a resposta, sem campos no exemplo ou critérios", async () => {
    renderComQuery(
      <ConteudoComAtividades conteudo={conteudo} perfilId="perfil-a" />,
    );
    const campo = await screen.findByLabelText("Sua resposta à atividade 1");
    expect(campo).toHaveValue("Resposta anterior");
    expect(campo.closest("li")).toHaveTextContent("Compare as modalidades.");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(
      screen.getByText("Pergunta do exemplo").closest("li"),
    ).not.toContainElement(campo);
    const user = userEvent.setup();
    await user.clear(campo);
    await user.type(campo, "Resposta editada");
    await user.click(
      screen.getByRole("button", { name: "Salvar resposta da atividade 1" }),
    );
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/atividades-conteudo/conteudos/c/a1",
        { perfilId: "perfil-a", resposta: "Resposta editada" },
      ),
    );
    expect(await screen.findByText("Resposta salva")).toBeVisible();
  });
  it("conserva o rascunho quando salvar falha e impede envio em branco", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("Falha ao salvar"));
    renderComQuery(
      <ConteudoComAtividades conteudo={conteudo} perfilId="perfil-a" />,
    );
    const campo = await screen.findByLabelText("Sua resposta à atividade 2");
    const botao = screen.getByRole("button", {
      name: "Salvar resposta da atividade 2",
    });
    expect(botao).toBeDisabled();
    await userEvent.type(campo, "Meu rascunho");
    await userEvent.click(botao);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha ao salvar",
    );
    expect(campo).toHaveValue("Meu rascunho");
  });
  it("não reutiliza rascunhos ou respostas ao trocar o perfil", async () => {
    const view = renderComQuery(
      <ConteudoComAtividades conteudo={conteudo} perfilId="perfil-a" />,
    );
    await userEvent.type(
      await screen.findByLabelText("Sua resposta à atividade 2"),
      "Rascunho A",
    );
    vi.mocked(api.get).mockResolvedValue({
      data: atividades.map((a) => ({ ...a, resposta: null })),
    });
    view.rerender(
      <QueryClientProvider client={view.client}>
        <ConteudoComAtividades conteudo={conteudo} perfilId="perfil-b" />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Sua resposta à atividade 2")).toHaveValue(
        "",
      ),
    );
    expect(api.get).toHaveBeenCalledWith("/atividades-conteudo/conteudos/c", {
      params: { perfilId: "perfil-b" },
    });
  });
  it("salvar uma atividade não apaga o rascunho de outra durante a atualização da consulta", async () => {
    renderComQuery(
      <ConteudoComAtividades conteudo={conteudo} perfilId="perfil-a" />,
    );
    const campo1 = await screen.findByLabelText("Sua resposta à atividade 1");
    const campo2 = screen.getByLabelText("Sua resposta à atividade 2");
    await userEvent.type(campo2, "Ainda estou elaborando");
    await userEvent.clear(campo1);
    await userEvent.type(campo1, "Resposta editada");
    vi.mocked(api.get).mockResolvedValue({
      data: atividades.map((a) =>
        a.chave === "a1"
          ? { ...a, resposta: { texto: "Resposta editada", atualizadoEm: "" } }
          : a,
      ),
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar resposta da atividade 1" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Sua resposta à atividade 1")).toHaveValue(
        "Resposta editada",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Salvar resposta da atividade 1" }),
      ).toBeDisabled(),
    );
    expect(screen.getByLabelText("Sua resposta à atividade 2")).toHaveValue(
      "Ainda estou elaborando",
    );
  });
});
