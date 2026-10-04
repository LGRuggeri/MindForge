import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderComQuery } from "@/test/utils";
import { GerarConteudoForm } from "./gerar-conteudo-form";
vi.mock("@/lib/api", () => ({ api: { post: vi.fn() } }));

describe("Conteúdo dentro da grade escolhida", () => {
  it("permite usar fontes salvas e mantém o erro da pesquisa visível", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Pesquisa web indisponível"));
    renderComQuery(<GerarConteudoForm moduloId="m" titulo="LDB" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Pesquisar e gerar conteúdo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pesquisa web indisponível");
    await userEvent.click(screen.getByRole("checkbox"));
    vi.mocked(api.post).mockResolvedValue({ data: { status: "revisado" } });
    await userEvent.click(screen.getByRole("button", { name: "Gerar com fontes salvas" }));
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith("/synthesizer/conteudos", {
      moduloId: "m", topico: "LDB", modoEstudo: "completo", atualizarFontes: false,
    }));
  });
  it("mostra os tópicos da grade e inicia no formato de concurso", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { status: "revisado" } });
    renderComQuery(
      <GerarConteudoForm
        moduloId="m"
        titulo="LDB"
        escopo={{
          programaCodigo: "LIBRAS",
          programaNome: "Meu concurso",
          modoEstudoPadrao: "concurso",
          topicosObrigatorios: ["Capítulo V"],
        }}
      />,
    );
    expect(screen.getByText("Capítulo V")).toBeVisible();
    expect(
      screen.getByLabelText("Tópicos adicionais (opcional)"),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Pesquisar e gerar conteúdo" }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/synthesizer/conteudos", {
        moduloId: "m",
        topico: "LDB",
        modoEstudo: "concurso",
        atualizarFontes: true,
      }),
    );
  });
});
