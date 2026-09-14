import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderComQuery } from "@/test/utils";
import { ExecutorCodigo } from "./executor-codigo";

vi.mock("@/lib/api", () => ({ api: { post: vi.fn() } }));
const resultado = {
  status: "concluido",
  stdout: "Olá\n",
  stderr: "",
  codigoSaida: 0,
  duracaoMs: 300,
};
function Formulario({ perfilId = "p1" }: { perfilId?: string | null }) {
  const [codigo, alterar] = useState("print(input())");
  return (
    <>
      <label>
        Código
        <textarea value={codigo} onChange={(e) => alterar(e.target.value)} />
      </label>
      <ExecutorCodigo
        key={perfilId}
        perfilId={perfilId}
        exercicioId="e1"
        codigo={codigo}
      />
    </>
  );
}
describe("Execução experimental de código", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: resultado });
  });
  it("executa com linguagem e stdin sem submeter tentativa, preservando o código", async () => {
    const user = userEvent.setup();
    renderComQuery(<Formulario />);
    await user.type(
      screen.getByLabelText("Entrada do programa (opcional)"),
      "Olá",
    );
    await user.click(screen.getByRole("button", { name: "Executar código" }));
    expect(await screen.findByText("Execução concluída")).toBeVisible();
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/sandbox/exercicios/e1/executar",
      {
        perfilId: "p1",
        codigo: "print(input())",
        entrada: "Olá",
        linguagem: "python",
      },
      { timeout: 45000 },
    );
    expect(screen.getByLabelText("Código")).toHaveValue("print(input())");
    expect(within(screen.getByRole("status")).getByText("Olá")).toBeVisible();
  });
  it("permite escolher JavaScript e oculta resultado ao editar código ou entrada", async () => {
    const user = userEvent.setup();
    renderComQuery(<Formulario />);
    await user.click(
      screen.getByRole("combobox", { name: "Linguagem para executar" }),
    );
    await user.click(screen.getByRole("option", { name: "JavaScript" }));
    await user.click(screen.getByRole("button", { name: "Executar código" }));
    await screen.findByText("Execução concluída");
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
      linguagem: "javascript",
    });
    await user.type(screen.getByLabelText("Código"), " ");
    expect(screen.queryByText("Execução concluída")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Executar código" }));
    await screen.findByText("Execução concluída");
    await user.type(
      screen.getByLabelText("Entrada do programa (opcional)"),
      "x",
    );
    expect(screen.queryByText("Execução concluída")).not.toBeInTheDocument();
  });
  it("impede cliques duplicados e preserva entrada após falha para tentar novamente", async () => {
    let falhar!: (reason: Error) => void;
    vi.mocked(api.post).mockReturnValueOnce(
      new Promise((_, reject) => {
        falhar = reject;
      }),
    );
    const user = userEvent.setup();
    renderComQuery(<Formulario />);
    await user.dblClick(
      screen.getByRole("button", { name: "Executar código" }),
    );
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Executando..." }),
    ).toBeDisabled();
    falhar(new Error("Docker indisponível"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Docker indisponível",
    );
    expect(screen.getByLabelText("Código")).toHaveValue("print(input())");
    await user.click(screen.getByRole("button", { name: "Executar código" }));
    expect(await screen.findByText("Execução concluída")).toBeVisible();
  });
  it.each([
    ["erro", "Erro no programa"],
    ["limite_tempo", "Tempo limite atingido"],
    ["limite_saida", "Limite de saída atingido"],
    ["limite_memoria", "Limite de memória atingido"],
  ])(
    "apresenta %s e saída como texto sem executar HTML",
    async (status, mensagem) => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          ...resultado,
          status,
          stdout: "<img src=x onerror=alert(1)>",
          stderr: "diagnóstico",
        },
      });
      const user = userEvent.setup();
      renderComQuery(<Formulario />);
      await user.click(screen.getByRole("button", { name: "Executar código" }));
      expect(await screen.findByText(mensagem)).toBeVisible();
      expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("diagnóstico")).toBeVisible();
    },
  );
  it("bloqueia execução sem perfil, com código vazio e quando já respondido", async () => {
    const primeiro = renderComQuery(
      <ExecutorCodigo perfilId={null} exercicioId="e1" codigo="print(1)" />,
    );
    expect(
      screen.getByRole("button", { name: "Executar código" }),
    ).toBeDisabled();
    primeiro.unmount();
    const segundo = renderComQuery(
      <ExecutorCodigo perfilId="p1" exercicioId="e1" codigo="   " />,
    );
    expect(
      screen.getByRole("button", { name: "Executar código" }),
    ).toBeDisabled();
    segundo.unmount();
    renderComQuery(
      <ExecutorCodigo
        perfilId="p1"
        exercicioId="e1"
        codigo="print(1)"
        disabled
      />,
    );
    expect(
      screen.getByRole("button", { name: "Executar código" }),
    ).toBeDisabled();
  });
  it("não mostra resposta atrasada quando o código mudou durante a execução", async () => {
    let concluir!: (value: { data: typeof resultado }) => void;
    vi.mocked(api.post).mockReturnValueOnce(
      new Promise((resolve) => {
        concluir = resolve;
      }),
    );
    const user = userEvent.setup();
    renderComQuery(<Formulario />);
    await user.click(screen.getByRole("button", { name: "Executar código" }));
    await user.type(screen.getByLabelText("Código"), " ");
    concluir({ data: resultado });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Executar código" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByText("Execução concluída")).not.toBeInTheDocument();
  });
});
