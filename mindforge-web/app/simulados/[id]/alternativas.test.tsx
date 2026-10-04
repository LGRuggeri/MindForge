import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { renderComQuery } from "@/test/utils";
import SimuladoPage from "./page";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "a" }) }));
const avaliacao = {
  id: "a",
  titulo: "Avaliação de Libras",
  tipo: "formativa",
  exercicios: [
    {
      ordem: 1,
      exercicio: {
        id: "e1",
        tipo: "questao_objetiva",
        enunciado: "Qual apoio?\n\nA. Matrícula.\n\nB. Acesso à comunicação.",
        dificuldade: "medio",
      },
    },
    {
      ordem: 2,
      exercicio: {
        id: "e2",
        tipo: "questao_objetiva",
        enunciado: "Qual língua?\n\nA. Libras.\n\nB. Língua universal.",
        dificuldade: "medio",
      },
    },
  ],
};
const resultado = {
  pontuacaoTotal: "5",
  pontosFortes: [],
  pontosFracos: [],
  recomendacoes: [],
  feedbackExercicios: [
    {
      exercicioId: "e1",
      tentativaId: "t1",
      enunciado: avaliacao.exercicios[0].exercicio.enunciado,
      respostaUsuario: "A",
      correta: false,
      pontuacao: "0",
      feedbackIa: "**Gabarito: B.** É necessário acesso.",
    },
    {
      exercicioId: "e2",
      tentativaId: "t2",
      enunciado: avaliacao.exercicios[1].exercicio.enunciado,
      respostaUsuario: "A",
      correta: true,
      pontuacao: "10",
      feedbackIa: "**Gabarito: A.** Libras é uma língua.",
    },
  ],
};

describe("Avaliação por seleção de alternativas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: "p", nome: "Ana", criadoEm: "" },
    });
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: String(url).endsWith("/resultado")
        ? { resultado: null }
        : avaliacao,
    }));
  });

  it("permite trocar a seleção, envia apenas ao finalizar e exibe o acerto e o erro", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (String(url).endsWith("/tentativas"))
        return { data: { id: String(url).includes("/e1/") ? "t1" : "t2" } };
      vi.mocked(api.get).mockImplementation(async (url) => ({
        data: String(url).endsWith("/resultado") ? { resultado } : avaliacao,
      }));
      return { data: resultado };
    });
    renderComQuery(<SimuladoPage />);
    const primeiro = await screen.findByRole("radio", {
      name: "A. Matrícula.",
    });
    expect(
      screen.queryByRole("textbox", { name: /Resposta da questão/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submeter resposta" }),
    ).not.toBeInTheDocument();
    const finalizar = screen.getByRole("button", {
      name: "Finalizar avaliação",
    });
    expect(finalizar).toBeDisabled();
    await user.click(
      screen.getByRole("radio", { name: "B. Acesso à comunicação." }),
    );
    await user.click(primeiro);
    expect(primeiro).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "B. Acesso à comunicação." }),
    ).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: "A. Libras." }));
    expect(api.post).not.toHaveBeenCalled();
    expect(finalizar).toBeEnabled();
    await user.click(finalizar);
    expect(
      await screen.findByRole("heading", { name: "Resultado da avaliação" }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      "/exercicios-avaliacoes/exercicios/e1/tentativas",
      expect.objectContaining({
        respostaUsuario: "A",
        avaliacaoId: "a",
        perfilId: "p",
      }),
    );
    expect(api.post).toHaveBeenCalledWith(
      "/exercicios-avaliacoes/avaliacoes/submeter",
      {
        avaliacaoId: "a",
        perfilId: "p",
        respostas: [
          { exercicioId: "e1", tentativaId: "t1" },
          { exercicioId: "e2", tentativaId: "t2" },
        ],
      },
    );
    expect(screen.getByText("Incorreta")).toBeInTheDocument();
    expect(screen.getByText("Correta", { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText("Você marcou")).toHaveLength(2);
    expect(
      screen.getAllByText("Resposta correta", { exact: true }),
    ).toHaveLength(2);
  });

  it("preserva seleções e reutiliza os envios confirmados quando a finalização falha", async () => {
    const user = userEvent.setup();
    let falhou = false;
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (String(url).includes("/e1/")) return { data: { id: "t1" } };
      if (String(url).includes("/e2/")) return { data: { id: "t2" } };
      if (!falhou) {
        falhou = true;
        throw new Error("Falha temporária");
      }
      vi.mocked(api.get).mockImplementation(async (url) => ({
        data: String(url).endsWith("/resultado") ? { resultado } : avaliacao,
      }));
      return { data: resultado };
    });
    renderComQuery(<SimuladoPage />);
    await user.click(
      await screen.findByRole("radio", { name: "A. Matrícula." }),
    );
    await user.click(screen.getByRole("radio", { name: "A. Libras." }));
    await user.click(
      screen.getByRole("button", { name: "Finalizar avaliação" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Finalizar avaliação" }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("radio", { name: "A. Libras." })).toBeChecked();
    await user.click(
      screen.getByRole("button", { name: "Finalizar avaliação" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Resultado da avaliação" }),
    ).toBeInTheDocument();
    expect(
      vi
        .mocked(api.post)
        .mock.calls.filter(([url]) => String(url).endsWith("/tentativas")),
    ).toHaveLength(2);
  });
});
