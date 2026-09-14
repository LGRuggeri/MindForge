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

describe("Geração em módulo com materiais existentes", () => {
  let conteudos: {
    id: string;
    titulo: string;
    corpoMarkdown: string;
    status: string;
  }[];
  let exercicios: { id: string; enunciado: string; tipo: string }[];
  let projetos: { id: string; titulo: string; status: string }[];
  beforeEach(() => {
    vi.resetAllMocks();
    useAppStore.setState({
      perfilSelecionado: { id: "perfil-1", nome: "Ana", criadoEm: "" },
    });
    conteudos = [
      {
        id: "c1",
        titulo: "Material anterior",
        corpoMarkdown: "Texto preservado",
        status: "gerado",
      },
    ];
    exercicios = [
      { id: "e1", enunciado: "Questão anterior", tipo: "questao_objetiva" },
    ];
    projetos = [{ id: "p1", titulo: "Projeto anterior", status: "ativo" }];
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === "/planner/modulos/mod-1"
          ? { id: "mod-1", titulo: "Álgebra", status: "em_andamento" }
          : url === "/synthesizer/modulos/mod-1/conteudos"
            ? [...conteudos]
            : url === "/exercicios-avaliacoes/exercicios"
              ? [...exercicios]
              : [...projetos],
    }));
  });

  it("gera outro conteúdo e mantém o anterior e o formulário", async () => {
    vi.mocked(api.post).mockImplementation(async () => {
      const criado = {
        id: "c2",
        titulo: "Novo material",
        corpoMarkdown: "Exemplos novos",
        status: "gerado",
      };
      conteudos.push(criado);
      return { data: criado };
    });
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await screen.findByText("Material anterior");
    await user.type(screen.getByLabelText("Tópico"), "  Equações  ");
    await user.click(screen.getByRole("button", { name: "Gerar conteúdo" }));
    expect(await screen.findByText("Novo material")).toBeVisible();
    expect(screen.getByText("Material anterior")).toBeVisible();
    expect(api.post).toHaveBeenCalledWith("/synthesizer/conteudos", {
      moduloId: "mod-1",
      topico: "Equações",
    });
    expect(screen.getByLabelText("Tópico")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Gerar conteúdo" }),
    ).toBeEnabled();
  });

  it("permite escolher outro tipo e gerar um novo exercício", async () => {
    vi.mocked(api.post).mockImplementation(async () => {
      const criado = {
        id: "e2",
        enunciado: "Implemente uma soma",
        tipo: "codigo",
      };
      exercicios.push(criado);
      return { data: criado };
    });
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await user.click(await screen.findByRole("tab", { name: "Exercícios" }));
    await screen.findByText("Questão anterior");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Código" }));
    await user.click(screen.getByRole("button", { name: "Gerar exercício" }));
    expect(await screen.findByText("Implemente uma soma")).toBeVisible();
    expect(screen.getByText("Questão anterior")).toBeVisible();
    expect(api.post).toHaveBeenCalledWith(
      "/exercicios-avaliacoes/exercicios/gerar",
      { moduloId: "mod-1", tipo: "codigo" },
    );
  });

  it("gera outro projeto no perfil selecionado e mantém o anterior", async () => {
    vi.mocked(api.post).mockImplementation(async () => {
      const criado = { id: "p2", titulo: "Projeto novo", status: "ativo" };
      projetos.push(criado);
      return { data: criado };
    });
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await user.click(await screen.findByRole("tab", { name: "Projetos" }));
    await screen.findByText("Projeto anterior");
    await user.click(screen.getByRole("button", { name: "Gerar projeto" }));
    expect(await screen.findByText("Projeto novo")).toBeVisible();
    expect(screen.getByText("Projeto anterior")).toBeVisible();
    expect(api.post).toHaveBeenCalledWith("/projetos/gerar", {
      moduloId: "mod-1",
      perfilId: "perfil-1",
    });
  });

  it("bloqueia novo envio durante geração e preserva o tópico em caso de erro", async () => {
    let recusar!: (erro: Error) => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          recusar = reject;
        }),
    );
    const user = userEvent.setup();
    renderComQuery(<ModuloPage />);
    await screen.findByText("Material anterior");
    await user.type(screen.getByLabelText("Tópico"), "Tópico importante");
    await user.dblClick(screen.getByRole("button", { name: "Gerar conteúdo" }));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Gerando..." })).toBeDisabled();
    expect(screen.getByLabelText("Tópico")).toBeDisabled();
    recusar(new Error("Falha de geração"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Falha de geração"),
    );
    expect(screen.getByLabelText("Tópico")).toHaveValue("Tópico importante");
    expect(screen.getByText("Material anterior")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Gerar conteúdo" }),
    ).toBeEnabled();
  });
});
