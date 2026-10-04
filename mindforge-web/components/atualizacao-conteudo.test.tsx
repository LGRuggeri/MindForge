import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Conteudo } from "@/types/api";
import { AtualizacaoConteudo } from "./atualizacao-conteudo";

const aula = { criadoEm: "2026-10-03T12:00:00Z" } as Conteudo;
describe("Registro de pesquisa da aula", () => {
  it("identifica material antigo sem inventar data de pesquisa", () => {
    render(<AtualizacaoConteudo conteudo={aula} />);
    expect(screen.getByText(/não tem registro de pesquisa atualizada/)).toBeVisible();
    expect(screen.queryByText(/Pesquisa web realizada em/)).not.toBeInTheDocument();
  });
  it("mostra data e limita o significado da pesquisa", () => {
    render(<AtualizacaoConteudo conteudo={{ ...aula, atualizacaoFontes: {
      tipo: "busca_web", realizadaEm: aula.criadoEm, resultadosWeb: 5, fontesEncontradas: 2,
    } }} />);
    expect(screen.getByText(/Pesquisa web realizada em/)).toHaveTextContent("Fontes selecionadas: 2");
    expect(screen.getByText(/não comprova leitura integral/)).toBeVisible();
  });
  it("distingue geração com fontes salvas", () => {
    render(<AtualizacaoConteudo conteudo={{ ...aula, atualizacaoFontes: {
      tipo: "fontes_salvas", realizadaEm: null, resultadosWeb: 0, fontesEncontradas: 0,
    } }} />);
    expect(screen.getByText(/sem pesquisa web nesta geração/)).toBeVisible();
  });
});
