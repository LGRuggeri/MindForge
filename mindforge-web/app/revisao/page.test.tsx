import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { renderComQuery } from "@/test/utils";
import RevisaoPage from "./page";
import { format } from "date-fns";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const registro = {
  id: "rev-1",
  itemTipo: "exercicio",
  itemId: "ex-1",
  proximaRevisao: "2020-01-01",
  intervaloDias: 1,
  repeticoes: 1,
};
const detalhe = {
  ...registro,
  item: {
    titulo: "Exercício",
    texto: "Quanto é dois mais dois?",
    resposta: "Quatro",
    moduloId: "mod-1",
  },
};

describe("Página de revisão", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: "perfil-1", nome: "Ana", criadoEm: "" },
    });
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url.endsWith("/rev-1") ? detalhe : [registro],
    }));
    vi.mocked(api.post).mockResolvedValue({
      data: { ...registro, proximaRevisao: "2099-01-01" },
    });
  });

  it("abre o exercício, revela a resposta e registra a lembrança com atualização da agenda", async () => {
    const user = userEvent.setup();
    renderComQuery(<RevisaoPage />);
    await user.click(await screen.findByRole("button", { name: "Revisar" }));
    expect(
      await screen.findByText("Quanto é dois mais dois?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Quatro")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar resposta" }));
    expect(screen.getByText("Quatro")).toBeInTheDocument();
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url.endsWith("/rev-1")
        ? detalhe
        : [{ ...registro, proximaRevisao: "2099-01-01" }],
    }));
    await user.click(
      screen.getByRole("button", { name: "Lembrei com facilidade" }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/exercicios-avaliacoes/revisao/rev-1/concluir",
        {
          perfilId: "perfil-1",
          qualidade: 4,
          proximaRevisaoEsperada: "2020-01-01",
        },
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Revisão registrada",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Revisar" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("mantém a sessão disponível quando salvar falha", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Não foi possível salvar"));
    const user = userEvent.setup();
    renderComQuery(<RevisaoPage />);
    await user.click(await screen.findByRole("button", { name: "Revisar" }));
    await user.click(
      await screen.findByRole("button", { name: "Mostrar resposta" }),
    );
    await user.click(screen.getByRole("button", { name: "Não lembrei" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar",
    );
    expect(screen.getByRole("button", { name: "Não lembrei" })).toBeEnabled();
  });

  it("limpa a sessão ao trocar de perfil", async () => {
    const user = userEvent.setup();
    renderComQuery(<RevisaoPage />);
    await user.click(await screen.findByRole("button", { name: "Revisar" }));
    expect(
      await screen.findByText("Quanto é dois mais dois?"),
    ).toBeInTheDocument();
    act(() =>
      useAppStore.setState({
        perfilSelecionado: { id: "perfil-2", nome: "Beto", criadoEm: "" },
      }),
    );
    expect(
      screen.queryByText("Quanto é dois mais dois?"),
    ).not.toBeInTheDocument();
  });

  it("pede um perfil sem fazer chamadas quando não há perfil ativo", () => {
    useAppStore.setState({ perfilSelecionado: null });
    renderComQuery(<RevisaoPage />);
    expect(screen.getByText(/Selecione um perfil/)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("permite revisar hoje sem classificar o item como atrasado", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ ...registro, proximaRevisao: format(new Date(), "yyyy-MM-dd") }],
    });
    renderComQuery(<RevisaoPage />);
    expect(
      await screen.findByRole("button", { name: "Revisar" }),
    ).toBeEnabled();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.queryByText("Atrasada")).not.toBeInTheDocument();
  });

  it("oculta o material de conteúdo até o aluno consultar", async () => {
    const conteudo = {
      ...detalhe,
      itemTipo: "conteudo",
      item: { ...detalhe.item, texto: "Material de estudo", resposta: null },
    };
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url.endsWith("/rev-1") ? conteudo : [registro],
    }));
    const user = userEvent.setup();
    renderComQuery(<RevisaoPage />);
    await user.click(await screen.findByRole("button", { name: "Revisar" }));
    await screen.findByRole("button", { name: "Consultar material" });
    expect(screen.queryByText("Material de estudo")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Consultar material" }),
    );
    expect(screen.getByText("Material de estudo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Não lembrei" })).toBeEnabled();
  });
});
