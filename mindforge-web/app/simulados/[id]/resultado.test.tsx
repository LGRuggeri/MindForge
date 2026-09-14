import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { criarQueryClientTeste, renderComQuery } from "@/test/utils";
import SimuladoPage from "./page";

const navegacao = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "a" }),
  useRouter: () => navegacao,
}));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Resultado persistido do simulado", () => {
  const avaliacao = {
    id: "a",
    titulo: "Simulado de álgebra",
    exercicios: [
      {
        ordem: 1,
        exercicio: {
          id: "e",
          enunciado: "Quanto é 2 + 2?",
          tipo: "dissertativa",
          dificuldade: "facil",
        },
      },
    ],
  };
  const resultado = {
    pontuacaoTotal: "7.50",
    pontosFortes: ["**Somas** corretas"],
    pontosFracos: ["Revisar frações"],
    recomendacoes: ["Praticar divisões"],
    feedbackExercicios: [
      {
        exercicioId: "e",
        tentativaId: "t",
        enunciado: "Quanto é 2 + 2?",
        respostaUsuario: "4",
        correta: true,
        pontuacao: "7.50",
        feedbackIa: "A soma está correta; justifique o raciocínio.",
      },
    ],
  };
  let salvo: typeof resultado | null;
  beforeEach(() => {
    vi.resetAllMocks();
    salvo = null;
    useAppStore.setState({
      perfilSelecionado: { id: "p", nome: "Ana", criadoEm: "" },
    });
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url?.endsWith("/resultado") ? { resultado: salvo } : avaliacao,
    }));
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === "/exercicios-avaliacoes/avaliacoes/submeter") {
        salvo = resultado;
        return { data: resultado };
      }
      return {
        data: { id: "t", correta: null, pontuacao: null, feedbackIa: null },
      };
    });
  });

  async function responder() {
    const user = userEvent.setup();
    await user.type(
      await screen.findByPlaceholderText("Digite sua resposta..."),
      "4",
    );
    await user.click(screen.getByRole("button", { name: "Submeter resposta" }));
    await screen.findByRole("button", { name: "Respondido" });
    return user;
  }

  it("revalida resultado nulo em cache ao reabrir após uma resposta de finalização perdida", async () => {
    const client = criarQueryClientTeste();
    client.setDefaultOptions({
      queries: {
        staleTime: 300000,
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
      },
    });
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url?.endsWith("/submeter")) {
        salvo = resultado;
        throw new Error("Resposta perdida");
      }
      return { data: { id: "t" } };
    });
    const tela = renderComQuery(<SimuladoPage />, client);
    const user = await responder();
    await user.click(
      screen.getByRole("button", { name: "Finalizar simulado" }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Resposta perdida"),
    );
    tela.unmount();
    let responderConsulta!: () => void;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url?.endsWith("/resultado"))
        await new Promise<void>((resolve) => {
          responderConsulta = resolve;
        });
      return {
        data: url?.endsWith("/resultado") ? { resultado: salvo } : avaliacao,
      };
    });
    renderComQuery(<SimuladoPage />, client);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(responderConsulta).toBeTypeOf("function"));
    await act(async () => responderConsulta());
    expect(
      await screen.findByRole("heading", { name: "Resultado do simulado" }),
    ).toBeVisible();
    expect(screen.getByText("7,50")).toBeVisible();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it("mostra o resultado após finalizar e o recupera em uma nova montagem sem reenviar", async () => {
    const tela = renderComQuery(<SimuladoPage />);
    const user = await responder();
    expect(screen.queryByText("Praticar divisões")).not.toBeInTheDocument();
    expect(
      screen.queryByText("A soma está correta; justifique o raciocínio."),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Finalizar simulado" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Resultado do simulado" }),
    ).toBeVisible();
    expect(screen.getByText("7,50")).toBeVisible();
    expect(screen.getByText("Somas")).toBeVisible();
    expect(screen.getByText("Revisar frações")).toBeVisible();
    expect(screen.getByText("Praticar divisões")).toBeVisible();
    expect(
      screen.getByText("A soma está correta; justifique o raciocínio."),
    ).toBeVisible();
    expect(navegacao.push).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenLastCalledWith(
      "/exercicios-avaliacoes/avaliacoes/submeter",
      {
        avaliacaoId: "a",
        perfilId: "p",
        respostas: [{ exercicioId: "e", tentativaId: "t" }],
      },
    );
    tela.unmount();
    renderComQuery(<SimuladoPage />);
    expect(
      await screen.findByRole("heading", { name: "Resultado do simulado" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Finalizar simulado" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByText("A soma está correta; justifique o raciocínio."),
    ).toBeVisible();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith(
      "/exercicios-avaliacoes/avaliacoes/a/resultado",
      expect.objectContaining({ params: { perfilId: "p" } }),
    );
  });

  it("apresenta nota zero e listas vazias de um resultado já salvo", async () => {
    salvo = {
      pontuacaoTotal: "0.00",
      pontosFortes: [],
      pontosFracos: [],
      recomendacoes: [],
      feedbackExercicios: [],
    };
    renderComQuery(<SimuladoPage />);
    expect(await screen.findByText("0,00")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Finalizar simulado" }),
    ).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("preserva tentativas quando finalizar falha e permite repetir a finalização", async () => {
    const enviar = vi.mocked(api.post).getMockImplementation()!;
    vi.mocked(api.post).mockImplementation(async (url, dados) => {
      if (url?.endsWith("/submeter"))
        throw new Error("Não foi possível salvar");
      return enviar(url, dados);
    });
    renderComQuery(<SimuladoPage />);
    const user = await responder();
    await user.click(
      screen.getByRole("button", { name: "Finalizar simulado" }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar"),
    );
    expect(screen.getByRole("button", { name: "Respondido" })).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveValue("4");
    vi.mocked(api.post).mockImplementation(enviar);
    await user.click(
      screen.getByRole("button", { name: "Finalizar simulado" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Resultado do simulado" }),
    ).toBeVisible();
    expect(api.post).toHaveBeenCalledTimes(3);
  });

  it("bloqueia respostas em erro de consulta e permite tentar consultar novamente", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url?.endsWith("/resultado")) throw new Error("Consulta indisponível");
      return { data: avaliacao };
    });
    const user = userEvent.setup();
    renderComQuery(<SimuladoPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Consulta indisponível",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url?.endsWith("/resultado") ? { resultado: null } : avaliacao,
    }));
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("textbox")).toBeEnabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("limpa tentativas e consulta o resultado do novo perfil", async () => {
    renderComQuery(<SimuladoPage />);
    await responder();
    act(() =>
      useAppStore.setState({
        perfilSelecionado: { id: "outro", nome: "Bia", criadoEm: "" },
      }),
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/exercicios-avaliacoes/avaliacoes/a/resultado",
        expect.objectContaining({ params: { perfilId: "outro" } }),
      ),
    );
    expect(await screen.findByRole("textbox")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Finalizar simulado" }),
    ).toBeDisabled();
  });
});
